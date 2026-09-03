import { describe, expect, it } from "vitest";
import {
  DEFAULT_OMADA_CLOUD_BASE_URL,
  assertOmadaCloudHost,
  buildControllerApiBase,
  omadaCloudPathIdsAreIdentical,
  resolveOmadaCloudAccount,
  resolveOmadaCloudConfig,
} from "@/lib/omada/config";
import { locationOmadaController } from "@/lib/omada/context";
import {
  OmadaError,
  OmadaNotConfiguredError,
  describeTpLinkIdLoginError,
  isOmadaSessionExpired,
  sanitizeOmadaMessage,
} from "@/lib/omada/errors";
import { extractSessionCode, extractOAuthTokenExchange, extractUidLoginRedirect, mergeCookies, oauthTokenExchangeFromRedirect, sessionCodeFromRedirect, withCsrfToken } from "@/lib/omada/http";
import { extractPortalList, extractSiteList } from "@/lib/omada/parse";

describe("Omada Cloud Access config", () => {
  it("requires username and password for the Cloud account", () => {
    expect(() => resolveOmadaCloudAccount({})).toThrow(OmadaNotConfiguredError);
    expect(() =>
      resolveOmadaCloudAccount({
        OMADA_CLOUD_USERNAME: "user@example.com",
      }),
    ).toThrow("OMADA_CLOUD_PASSWORD");
  });

  it("requires location controller IDs when building a Cloud Access path", () => {
    expect(() =>
      resolveOmadaCloudConfig({
        OMADA_CLOUD_USERNAME: "user@example.com",
        OMADA_CLOUD_PASSWORD: "secret",
      }),
    ).toThrow(/Omada Device ID or Omada ID/);
  });

  it("reads controller IDs from a location", () => {
    expect(
      locationOmadaController({
        omadaDeviceId: "device-1",
        omadaId: "omada-1",
      }),
    ).toEqual({ deviceId: "device-1", omadaId: "omada-1" });
    expect(() => locationOmadaController({ omadaDeviceId: null, omadaId: "omada-1" })).toThrow(
      /admin page/,
    );
  });

  it("rejects a LAN controller address", () => {
    expect(() => assertOmadaCloudHost("https://192.168.1.66")).toThrow(/local or LAN/);
    expect(() =>
      resolveOmadaCloudConfig({
        OMADA_CLOUD_BASE_URL: "https://10.0.0.8",
        OMADA_CLOUD_USERNAME: "user@example.com",
        OMADA_CLOUD_PASSWORD: "secret",
        OMADA_DEVICE_ID: "device",
        OMADA_ID: "omada",
      }),
    ).toThrow(/local or LAN/);
  });

  it("builds the confirmed Cloud Access controller API prefix", () => {
    expect(
      buildControllerApiBase(DEFAULT_OMADA_CLOUD_BASE_URL, "device-1", "omada-1"),
    ).toBe(
      "https://euw1-api-omada-controller-connector.tplinkcloud.com/omadac/device-1/omada-1/api/v2",
    );
  });

  it("accepts a complete Cloud Access config", () => {
    expect(
      resolveOmadaCloudConfig({
        OMADA_CLOUD_USERNAME: "user@example.com",
        OMADA_CLOUD_PASSWORD: "secret",
        OMADA_DEVICE_ID: "device-1",
        OMADA_ID: "omada-1",
      }),
    ).toMatchObject({
      baseUrl: DEFAULT_OMADA_CLOUD_BASE_URL,
      username: "user@example.com",
      deviceId: "device-1",
      omadaId: "omada-1",
    });
  });

  it("detects when device id and omada id were copied as the same value", () => {
    expect(
      omadaCloudPathIdsAreIdentical({
        baseUrl: DEFAULT_OMADA_CLOUD_BASE_URL,
        username: "user@example.com",
        password: "secret",
        deviceId: "same-id",
        omadaId: "same-id",
      }),
    ).toBe(true);
  });
});

describe("Omada Cloud Access request helpers", () => {
  it("adds the CSRF token as a query parameter", () => {
    expect(
      withCsrfToken(
        "https://euw1-api-omada-controller-connector.tplinkcloud.com/omadac/d/o/api/v2/sites",
        "csrf-example",
      ),
    ).toBe(
      "https://euw1-api-omada-controller-connector.tplinkcloud.com/omadac/d/o/api/v2/sites?token=csrf-example",
    );
  });

  it("treats Cloud Access error -1200 as an expired session", () => {
    expect(
      isOmadaSessionExpired(new OmadaError("logged out", "OMADA_SESSION_EXPIRED", true, -1200)),
    ).toBe(true);
    expect(isOmadaSessionExpired(new OmadaError("other", "OMADA_REQUEST_FAILED", false, -1))).toBe(
      false,
    );
    expect(
      isOmadaSessionExpired(new OmadaError("offline", "OMADA_DEVICE_OFFLINE", true, -52201)),
    ).toBe(false);
  });

  it("does not expose tokens or cookies in error messages", () => {
    expect(sanitizeOmadaMessage("failed ?token=secret-value")).toBe("failed ?token=[redacted]");
    expect(sanitizeOmadaMessage("TPOMADA_SESSIONID=abc123; Path=/")).toBe(
      "TPOMADA_SESSIONID=[redacted]; Path=/",
    );
    expect(sanitizeOmadaMessage("login?session_code=secret-value")).toBe(
      "login?session_code=[redacted]",
    );
  });

  it("maps TP-Link ID login failures to a generic unavailable message", () => {
    expect(
      describeTpLinkIdLoginError(-20601, "Incorrect TP-Link ID or password.", {
        remainAttempts: 5,
        lockedMinutes: 10,
      }),
    ).toBe("This function is currently not available. Please try again later.");
    expect(
      describeTpLinkIdLoginError(-20601, "Incorrect TP-Link ID or password.", {
        remainAttempts: 5,
        lockedMinutes: 10,
      }),
    ).not.toMatch(/tp-link|password|remaining attempts|locked for/i);
    expect(describeTpLinkIdLoginError(-23029, "Need extra sign-in", undefined)).toBe(
      "This function is currently not available. Please try again later.",
    );
  });
});

describe("Omada Cloud Portal session_code", () => {
  it("reads session_code from a hash login redirect", () => {
    expect(
      extractSessionCode("https://id.tplinkcloud.com/#/login?session_code=ABC123"),
    ).toBe("ABC123");
  });

  it("reads session_code from a query string", () => {
    expect(
      extractSessionCode("https://id.tplinkcloud.com/login?session_code=XYZ789"),
    ).toBe("XYZ789");
  });

  it("reads session_code from the Cloud Portal OAuth redirect", () => {
    expect(
      sessionCodeFromRedirect(
        "https://api-id.tplinkcloud.com/oauth/authorize?clientId=omada-cloud-portal",
        "https://id.tplinkcloud.com/#/login?session_code=ABC123",
      ),
    ).toBe("ABC123");
  });

  it("keeps only name=value pairs when merging Set-Cookie headers", () => {
    expect(
      mergeCookies(undefined, ["TPOMADA_SESSIONID=abc; Path=/; HttpOnly", "other=1; Secure"]),
    ).toBe("TPOMADA_SESSIONID=abc; other=1");
  });

  it("reads the ID token-exchange hash from the Cloud OAuth redirect", () => {
    expect(
      oauthTokenExchangeFromRedirect(
        "https://euw1-api-id.tplinkcloud.com/oauth/authorize?responseType=code",
        "https://euw1-id.tplinkcloud.com/#/token?code=ABC&state=XYZ&serviceUrl=https%3A%2F%2Feuw1-api-id.tplinkcloud.com",
      ),
    ).toEqual({
      code: "ABC",
      state: "XYZ",
      tokenApiBase: "https://euw1-api-id.tplinkcloud.com/api/v1",
    });
  });

  it("rejects a token-exchange serviceUrl that is not tplinkcloud.com", () => {
    expect(
      extractOAuthTokenExchange(
        "https://euw1-id.tplinkcloud.com/#/token?code=ABC&state=XYZ&serviceUrl=https%3A%2F%2Fexample.com",
      ),
    ).toBeNull();
  });

  it("reads the Cloud Portal loginRedirect OAuth hash", () => {
    expect(
      extractUidLoginRedirect(
        "https://euw1-omada-cloud.tplinkcloud.com/#/loginRedirect?code=ABC&state=XYZ&serviceUrl=https%3A%2F%2Feuw1-api-id.tplinkcloud.com",
      ),
    ).toEqual({
      code: "ABC",
      state: "XYZ",
      serviceUrl: "https://euw1-api-id.tplinkcloud.com",
      canary: true,
    });
  });
});

describe("Omada site list parse", () => {
  it("reads id and name from a paged web API list", () => {
    expect(
      extractSiteList({
        data: [{ id: "site-a", name: "Lodge WiFi" }],
        currentPage: 1,
      }),
    ).toEqual([{ id: "site-a", name: "Lodge WiFi" }]);
  });

  it("reads siteId from an Open API-shaped list if returned", () => {
    expect(
      extractSiteList({
        data: [{ siteId: "640effd1b3f2ae5b912275ec", name: "Hotel" }],
      }),
    ).toEqual([{ id: "640effd1b3f2ae5b912275ec", name: "Hotel" }]);
  });
});

describe("Omada voucher portal parse", () => {
  it("reads id and name from the voucher portals setting list", () => {
    expect(extractPortalList([{ id: "portal-a", name: "Network" }])).toEqual([
      { id: "portal-a", name: "Network" },
    ]);
  });

  it("returns an empty list when Omada has no portals", () => {
    expect(extractPortalList([])).toEqual([]);
    expect(extractPortalList({ data: [] })).toEqual([]);
  });
});
