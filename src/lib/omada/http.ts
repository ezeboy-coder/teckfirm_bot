import { OmadaError, sanitizeOmadaMessage } from "@/lib/omada/errors";
import type { OmadaApiEnvelope, OmadaCloudSession, OmadaHttpMethod } from "@/lib/omada/types";

const REQUEST_TIMEOUT_MS = 20_000;

export type OmadaRawResponse<T> = {
  data: T;
  cookie: string | undefined;
};

function parseSetCookies(header: string | null): string[] {
  if (!header) return [];
  return header
    .split(/,(?=[^;]+=)/)
    .map((entry) => entry.split(";")[0]?.trim())
    .filter((entry): entry is string => Boolean(entry));
}

export function mergeCookies(existing: string | undefined, incoming: string[]): string {
  const jar = new Map<string, string>();
  const add = (entry: string) => {
    const pair = entry.split(";")[0]?.trim();
    const name = pair?.split("=")[0];
    if (name && pair) jar.set(name, pair);
  };
  for (const pair of existing ? existing.split(";").map((item) => item.trim()) : []) {
    add(pair);
  }
  for (const pair of incoming) {
    add(pair);
  }
  return [...jar.values()].join("; ");
}

export function cookieNames(cookieHeader: string | undefined): string[] {
  if (!cookieHeader) return [];
  return cookieHeader
    .split(";")
    .map((part) => part.trim().split("=")[0])
    .filter((name): name is string => Boolean(name));
}

export function extractSessionCode(url: string): string | null {
  try {
    const parsed = new URL(url);
    const queryCode = parsed.searchParams.get("session_code");
    if (queryCode) return queryCode;

    const hash = parsed.hash.startsWith("#") ? parsed.hash.slice(1) : parsed.hash;
    if (!hash) return null;
    const hashPath = hash.includes("?") || hash.startsWith("/") ? hash : `/${hash}`;
    return new URL(hashPath, "https://id.tplinkcloud.com/").searchParams.get("session_code");
  } catch {
    return null;
  }
}

export function sessionCodeFromRedirect(currentUrl: string, location: string | null): string | null {
  if (location) {
    try {
      return extractSessionCode(new URL(location, currentUrl).toString());
    } catch {
      return extractSessionCode(currentUrl);
    }
  }
  return extractSessionCode(currentUrl);
}

export type TpLinkOAuthTokenExchange = {
  code: string;
  state: string;
  tokenApiBase: string;
};

function hashQueryParams(url: string): URLSearchParams {
  const parsed = new URL(url);
  const hash = parsed.hash.startsWith("#") ? parsed.hash.slice(1) : parsed.hash;
  const query = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : parsed.search.slice(1);
  return new URLSearchParams(query);
}

export function extractOAuthTokenExchange(url: string): TpLinkOAuthTokenExchange | null {
  try {
    const params = hashQueryParams(url);
    const code = params.get("code");
    const state = params.get("state");
    const serviceUrl = params.get("serviceUrl");
    if (!code || !state || !serviceUrl) return null;

    const service = new URL(serviceUrl);
    if (service.protocol !== "https:" || !service.hostname.toLowerCase().endsWith("tplinkcloud.com")) {
      return null;
    }

    return {
      code,
      state,
      tokenApiBase: `${service.origin}/api/v1`,
    };
  } catch {
    return null;
  }
}

export function oauthTokenExchangeFromRedirect(
  currentUrl: string,
  location: string | null,
): TpLinkOAuthTokenExchange | null {
  if (location) {
    try {
      const fromLocation = extractOAuthTokenExchange(new URL(location, currentUrl).toString());
      if (fromLocation) return fromLocation;
    } catch {
      // Fall through to the current URL.
    }
  }
  return extractOAuthTokenExchange(currentUrl);
}

export type OmadaUidLoginRedirect = {
  code: string;
  state: string;
  serviceUrl: string;
  canary: boolean;
};

export function extractUidLoginRedirect(url: string): OmadaUidLoginRedirect | null {
  try {
    const parsed = new URL(url);
    const hash = parsed.hash.startsWith("#") ? parsed.hash.slice(1) : parsed.hash;
    const hashPath = hash.split("?")[0] ?? "";
    if (!hashPath.includes("loginRedirect")) return null;

    const params = hashQueryParams(url);
    const code = params.get("code");
    const state = params.get("state");
    const serviceUrl = params.get("serviceUrl");
    if (!code || !state || !serviceUrl) return null;

    const service = new URL(serviceUrl);
    if (service.protocol !== "https:" || !service.hostname.toLowerCase().endsWith("tplinkcloud.com")) {
      return null;
    }

    return {
      code,
      state,
      serviceUrl,
      canary: params.get("canary") !== "false",
    };
  } catch {
    return null;
  }
}

export function uidLoginRedirectFromLocation(
  currentUrl: string,
  location: string | null,
): OmadaUidLoginRedirect | null {
  if (location) {
    try {
      const fromLocation = extractUidLoginRedirect(new URL(location, currentUrl).toString());
      if (fromLocation) return fromLocation;
    } catch {
      // Fall through to the current URL.
    }
  }
  return extractUidLoginRedirect(currentUrl);
}

export const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const CLOUDFRONT_VIEWER_HEADERS = [
  "cloudfront-viewer-city",
  "cloudfront-viewer-country",
  "cloudfront-viewer-country-name",
] as const;

export async function getTpLinkCloudFrontHeaders(): Promise<Record<string, string>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch("https://id.tplinkcloud.com/tp-link.ico", {
      headers: { "User-Agent": BROWSER_USER_AGENT },
      redirect: "manual",
      signal: controller.signal,
    });
    const headers: Record<string, string> = {};
    for (const name of CLOUDFRONT_VIEWER_HEADERS) {
      const value = response.headers.get(name);
      if (value) headers[name] = value;
    }
    return headers;
  } catch {
    return {};
  } finally {
    clearTimeout(timer);
  }
}

export type RawHttpResponse = {
  status: number;
  url: string;
  body: string;
  location: string | null;
  cookies: string[];
};

export async function rawHttp(
  url: string,
  init: {
    method?: OmadaHttpMethod;
    headers?: Record<string, string>;
    body?: unknown;
    cookie?: string;
  } = {},
): Promise<RawHttpResponse> {
  const headers: Record<string, string> = {
    Accept: "application/json, text/plain, */*",
    "User-Agent": BROWSER_USER_AGENT,
    ...init.headers,
  };
  if (init.body !== undefined && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  if (init.cookie) {
    headers.Cookie = init.cookie;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      method: init.method ?? "GET",
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: controller.signal,
      redirect: "manual",
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new OmadaError(
        "Timed out reaching Omada Cloud. Check Cloud Access is enabled and the OC200 is online.",
        "OMADA_TIMEOUT",
        true,
      );
    }
    throw new OmadaError("Could not reach Omada Cloud.", "OMADA_NETWORK", true);
  } finally {
    clearTimeout(timer);
  }

  const setCookieHeader = response.headers as Headers & { getSetCookie?: () => string[] };
  const cookies =
    typeof setCookieHeader.getSetCookie === "function"
      ? setCookieHeader.getSetCookie()
      : parseSetCookies(response.headers.get("set-cookie"));

  return {
    status: response.status,
    url: response.url || url,
    body: await response.text(),
    location: response.headers.get("location"),
    cookies: cookies
      .map((entry) => entry.split(";")[0]?.trim())
      .filter((entry): entry is string => Boolean(entry)),
  };
}

export function withCsrfToken(url: string, csrfToken: string | undefined): string {
  if (!csrfToken) return url;
  const parsed = new URL(url);
  parsed.searchParams.set("token", csrfToken);
  return parsed.toString();
}

export async function omadaHttp<T>(
  url: string,
  init: {
    method?: OmadaHttpMethod;
    body?: unknown;
    session?: Pick<OmadaCloudSession, "cookie" | "csrfToken" | "authorization">;
  } = {},
): Promise<OmadaRawResponse<T>> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": BROWSER_USER_AGENT,
  };

  if (init.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (init.session?.cookie) {
    headers.Cookie = init.session.cookie;
  }
  if (init.session?.csrfToken) {
    headers["Csrf-Token"] = init.session.csrfToken;
  }
  if (init.session?.authorization) {
    headers.Authorization = init.session.authorization;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(withCsrfToken(url, init.session?.csrfToken), {
      method: init.method ?? "GET",
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: controller.signal,
      redirect: "manual",
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new OmadaError(
        "Timed out reaching Omada Cloud Access. Check that the OC200 is online and Cloud Access is enabled.",
        "OMADA_TIMEOUT",
        true,
      );
    }
    throw new OmadaError(
      "Could not reach Omada Cloud Access.",
      "OMADA_NETWORK",
      true,
    );
  } finally {
    clearTimeout(timer);
  }

  const raw = await response.text();
  let parsed: OmadaApiEnvelope<T>;
  try {
    parsed = JSON.parse(raw) as OmadaApiEnvelope<T>;
  } catch {
    throw new OmadaError(
      `Omada returned a non-JSON response (${response.status}).`,
      "OMADA_BAD_RESPONSE",
      true,
    );
  }

  if (response.status >= 400 || parsed.errorCode !== 0) {
    const sessionExpired = parsed.errorCode === -1200;
    const deviceOffline = parsed.errorCode === -52201;
    throw new OmadaError(
      sanitizeOmadaMessage(
        deviceOffline
          ? "The OC200 is offline in Omada Cloud Access. Confirm it is online in the Omada Cloud portal, then retry."
          : parsed.msg || `Omada request failed (${response.status}).`,
      ),
      sessionExpired ? "OMADA_SESSION_EXPIRED" : deviceOffline ? "OMADA_DEVICE_OFFLINE" : "OMADA_REQUEST_FAILED",
      sessionExpired || deviceOffline || response.status >= 500,
      parsed.errorCode,
    );
  }

  const setCookieHeader = response.headers as Headers & { getSetCookie?: () => string[] };
  const setCookie =
    typeof setCookieHeader.getSetCookie === "function"
      ? setCookieHeader.getSetCookie()
      : parseSetCookies(response.headers.get("set-cookie"));

  return {
    data: (parsed.result ?? {}) as T,
    cookie: mergeCookies(init.session?.cookie, setCookie) || undefined,
  };
}
