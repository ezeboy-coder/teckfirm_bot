import { randomBytes, randomUUID } from "node:crypto";
import { controllerApiBase, getOmadaCloudAccount } from "@/lib/omada/config";
import { peekOmadaController } from "@/lib/omada/context";
import { describeTpLinkIdLoginError, OmadaError, OmadaNotConfiguredError } from "@/lib/omada/errors";
import {
  getTpLinkCloudFrontHeaders,
  mergeCookies,
  oauthTokenExchangeFromRedirect,
  omadaHttp,
  rawHttp,
  uidLoginRedirectFromLocation,
  type OmadaUidLoginRedirect,
  type TpLinkOAuthTokenExchange,
} from "@/lib/omada/http";
import type { OmadaCloudSession } from "@/lib/omada/types";

const ID_SITE_URL = "https://id.tplinkcloud.com/";
const ID_API_BASE = "https://h2api-id.tplinkcloud.com/api/v1";
const ID_API_EUW_BASE = "https://euw1-h2api-id.tplinkcloud.com/api/v1";
const OMADA_OAUTH_AUTHORIZE_URL = "https://api-id.tplinkcloud.com/oauth/authorize";
const OMADA_OAUTH_REDIRECT_URI = "https://euw1-omada-cloud.tplinkcloud.com/#/loginRedirect";
const OMADA_CLOUD_MANAGER_ORIGIN = "https://euw1-api-omada-cloud-manager.tplinkcloud.com";
const HTML_ACCEPT = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";

type LoginResult = {
  token?: string;
  csrfToken?: string;
};

type TpLinkIdLoginResult = {
  serviceUrl?: string;
  redirectParams?: string;
  loggedIn?: boolean;
};

type UidCloudLoginResult = {
  csrfToken?: string;
  redirectUrl?: string;
  serverUrl?: string;
};

type IdEnvelope<T> = {
  errorCode?: number;
  msg?: string;
  result?: T;
};

let session: OmadaCloudSession | null = null;
let loginInFlight: Promise<OmadaCloudSession> | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readControllerToken(payload: unknown): string | undefined {
  if (!isRecord(payload)) return undefined;
  const token = payload.token ?? payload.csrfToken;
  return typeof token === "string" && token.length > 0 ? token : undefined;
}

function parseIdEnvelope<T>(body: string, status: number, what: string): IdEnvelope<T> {
  try {
    return JSON.parse(body) as IdEnvelope<T>;
  } catch {
    throw new OmadaError(
      `${what} returned a non-JSON response (${status}).`,
      "OMADA_CLOUD_LOGIN_FAILED",
      true,
    );
  }
}

async function idHeaders(sessionCode?: string): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    Origin: "https://id.tplinkcloud.com",
    Referer: "https://id.tplinkcloud.com/",
    ...(await getTpLinkCloudFrontHeaders()),
  };
  if (sessionCode) {
    headers.session_code = sessionCode;
  }
  return headers;
}

async function openIdSite(): Promise<string | undefined> {
  const response = await rawHttp(ID_SITE_URL, {
    method: "GET",
    headers: { Accept: HTML_ACCEPT },
  });
  return mergeCookies(undefined, response.cookies) || undefined;
}

async function loginTpLinkId(cookie: string | undefined): Promise<{
  cookie: string | undefined;
  result: TpLinkIdLoginResult;
}> {
  const config = getOmadaCloudAccount();
  const body = {
    email: config.username,
    password: config.password,
    terminalUUID: randomUUID(),
    privatePolicyChecked: true,
    language: "en",
  };
  const headers = await idHeaders();

  let response = await rawHttp(`${ID_API_BASE}/login`, {
    method: "POST",
    headers,
    body,
    cookie,
  });

  if (response.status === 403 || response.status === 404) {
    response = await rawHttp(`${ID_API_EUW_BASE}/login`, {
      method: "POST",
      headers,
      body,
      cookie,
    });
  }

  const parsed = parseIdEnvelope<TpLinkIdLoginResult>(response.body, response.status, "TP-Link ID login");
  if (parsed.errorCode !== 0) {
    throw new OmadaError(
      describeTpLinkIdLoginError(parsed.errorCode, parsed.msg, parsed.result),
      "OMADA_CLOUD_LOGIN_FAILED",
      false,
      parsed.errorCode,
    );
  }

  return {
    cookie: mergeCookies(cookie, response.cookies) || cookie,
    result: parsed.result ?? {},
  };
}

function randomOAuthState(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return [...randomBytes(6)].map((byte) => chars[byte % chars.length]).join("");
}

async function followRedirects(
  startUrl: string,
  cookie: string | undefined,
): Promise<{
  cookie: string | undefined;
  tokenExchange: TpLinkOAuthTokenExchange | null;
  uidRedirect: OmadaUidLoginRedirect | null;
}> {
  let nextUrl = startUrl;
  let jar = cookie;

  for (let i = 0; i < 8; i += 1) {
    const response = await rawHttp(nextUrl, {
      method: "GET",
      cookie: jar,
      headers: { Accept: HTML_ACCEPT },
    });
    jar = mergeCookies(jar, response.cookies) || jar;

    const uidRedirect = uidLoginRedirectFromLocation(nextUrl, response.location);
    if (uidRedirect) {
      return { cookie: jar, tokenExchange: null, uidRedirect };
    }

    const tokenExchange = oauthTokenExchangeFromRedirect(nextUrl, response.location);
    if (tokenExchange) {
      return { cookie: jar, tokenExchange, uidRedirect: null };
    }

    if (!response.location || response.status < 300 || response.status >= 400) {
      return { cookie: jar, tokenExchange: null, uidRedirect: null };
    }
    nextUrl = new URL(response.location, nextUrl).toString();
  }

  return { cookie: jar, tokenExchange: null, uidRedirect: null };
}

async function loginWithUidCode(
  redirect: OmadaUidLoginRedirect,
  cookie: string | undefined,
): Promise<{ cookie: string | undefined; csrfToken?: string }> {
  const response = await rawHttp(
    `${OMADA_CLOUD_MANAGER_ORIGIN}/api/v1/central/account/login-with-uid-code`,
    {
      method: "POST",
      cookie,
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        Origin: "https://euw1-omada-cloud.tplinkcloud.com",
        Referer: "https://euw1-omada-cloud.tplinkcloud.com/",
        "X-Requested-With": "XMLHttpRequest",
        ...(await getTpLinkCloudFrontHeaders()),
      },
      body: {
        code: redirect.code,
        state: redirect.state,
        uidServiceUrl: redirect.serviceUrl,
        canary: redirect.canary,
      },
    },
  );
  const parsed = parseIdEnvelope<UidCloudLoginResult>(
    response.body,
    response.status,
    "Omada Cloud UID login",
  );
  if (parsed.errorCode !== 0) {
    throw new OmadaError(
      parsed.msg || "Omada Cloud Portal login-with-uid-code failed.",
      "OMADA_CLOUD_LOGIN_FAILED",
      false,
      parsed.errorCode,
    );
  }

  let jar = mergeCookies(cookie, response.cookies) || cookie;
  const csrfToken = parsed.result?.csrfToken;
  if (typeof csrfToken === "string" && csrfToken.length > 0) {
    jar = mergeCookies(jar, [`csrfToken=${csrfToken}`]) || jar;
  }

  if (parsed.result?.redirectUrl) {
    jar = (await followRedirects(parsed.result.redirectUrl, jar)).cookie;
  }

  return {
    cookie: jar,
    csrfToken: typeof csrfToken === "string" && csrfToken.length > 0 ? csrfToken : undefined,
  };
}

async function completeOmadaUidLogin(cookie: string | undefined): Promise<{
  cookie: string | undefined;
  csrfToken?: string;
}> {
  const authorizeUrl = new URL(OMADA_OAUTH_AUTHORIZE_URL);
  authorizeUrl.searchParams.set("clientId", "omada-cloud-portal");
  authorizeUrl.searchParams.set("redirectUri", OMADA_OAUTH_REDIRECT_URI);
  authorizeUrl.searchParams.set("responseType", "code");
  authorizeUrl.searchParams.set("state", randomOAuthState());
  authorizeUrl.searchParams.set("scope", "openid");

  const followed = await followRedirects(authorizeUrl.toString(), cookie);
  if (!followed.uidRedirect) {
    throw new OmadaError(
      "Omada Cloud Portal OAuth did not return a loginRedirect code after TP-Link ID login.",
      "OMADA_CLOUD_LOGIN_FAILED",
    );
  }

  return loginWithUidCode(followed.uidRedirect, followed.cookie);
}

async function loginController(sessionParts: {
  cookie: string;
  csrfToken?: string;
  authorization?: string;
}): Promise<OmadaCloudSession> {
  const account = getOmadaCloudAccount();
  const ids = peekOmadaController();
  if (!ids) {
    throw new OmadaNotConfiguredError(
      "No Omada controller is selected for this location. Add the Device ID and Omada ID on the admin page.",
    );
  }
  const response = await omadaHttp<LoginResult>(`${controllerApiBase({ ...account, ...ids })}/login`, {
    method: "POST",
    body: {
      username: account.username,
      password: account.password,
    },
    session: sessionParts,
  });

  return {
    cookie: response.cookie || sessionParts.cookie,
    csrfToken: readControllerToken(response.data) || sessionParts.csrfToken,
    authorization: sessionParts.authorization,
  };
}

export function clearOmadaSession(): void {
  session = null;
}

export async function loginOmadaCloud(): Promise<OmadaCloudSession> {
  const idCookie = await openIdSite();
  const idLogin = await loginTpLinkId(idCookie);

  let cookie = idLogin.cookie;
  if (!cookie) {
    throw new OmadaError(
      "TP-Link ID login succeeded but no session cookie was returned.",
      "OMADA_CLOUD_LOGIN_FAILED",
    );
  }

  const cloud = await completeOmadaUidLogin(cookie);
  cookie = cloud.cookie;
  if (!cookie) {
    throw new OmadaError(
      "Omada Cloud Portal login succeeded but no session cookie was returned.",
      "OMADA_CLOUD_LOGIN_FAILED",
    );
  }

  const sessionParts = { cookie, csrfToken: cloud.csrfToken };
  if (sessionParts.csrfToken) {
    session = sessionParts;
    return session;
  }

  try {
    const controllerSession = await loginController(sessionParts);
    if (!controllerSession.cookie) {
      throw new OmadaError(
        "Omada controller login succeeded but no session cookie was returned.",
        "OMADA_LOGIN_FAILED",
      );
    }
    session = controllerSession;
    return session;
  } catch (error) {
    session = sessionParts;
    if (error instanceof OmadaNotConfiguredError) {
      return session;
    }
    if (error instanceof OmadaError && error.omadaErrorCode === -1200) {
      return session;
    }
    throw error;
  }
}

export async function getOmadaSession(): Promise<OmadaCloudSession> {
  if (session) return session;
  if (!loginInFlight) {
    loginInFlight = loginOmadaCloud().finally(() => {
      loginInFlight = null;
    });
  }
  return loginInFlight;
}
