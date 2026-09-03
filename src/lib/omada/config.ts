import { OmadaNotConfiguredError } from "@/lib/omada/errors";
import type { OmadaCloudAccount, OmadaCloudConfig, OmadaControllerIds } from "@/lib/omada/types";
import { isPrivateIpv4 } from "@/lib/utils/private-ip";
import { getEnv } from "@/lib/validation/env";

export const DEFAULT_OMADA_CLOUD_BASE_URL = "https://euw1-api-omada-controller-connector.tplinkcloud.com";

type CloudAccountInput = {
  OMADA_CLOUD_BASE_URL?: string;
  OMADA_CLOUD_USERNAME?: string;
  OMADA_CLOUD_PASSWORD?: string;
};

type CloudConfigInput = CloudAccountInput & {
  OMADA_DEVICE_ID?: string;
  OMADA_ID?: string;
};

function trim(value: string | undefined): string {
  return value?.trim() ?? "";
}

export function assertOmadaCloudHost(baseUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new OmadaNotConfiguredError("OMADA_CLOUD_BASE_URL is not a valid URL.");
  }

  if (parsed.protocol !== "https:") {
    throw new OmadaNotConfiguredError("OMADA_CLOUD_BASE_URL must use https.");
  }

  const hostname = parsed.hostname.toLowerCase();
  if (isPrivateIpv4(hostname)) {
    throw new OmadaNotConfiguredError(
      "OMADA_CLOUD_BASE_URL cannot be a local or LAN address. Use Omada Cloud Access.",
    );
  }

  if (!hostname.endsWith("tplinkcloud.com")) {
    throw new OmadaNotConfiguredError(
      "OMADA_CLOUD_BASE_URL must be an Omada Cloud Access host on tplinkcloud.com.",
    );
  }

  return parsed;
}

export function buildControllerApiBase(baseUrl: string, deviceId: string, omadaId: string): string {
  const origin = assertOmadaCloudHost(baseUrl).origin;
  return `${origin}/omadac/${deviceId}/${omadaId}/api/v2`;
}

export function resolveOmadaCloudAccount(input: CloudAccountInput): OmadaCloudAccount {
  const baseUrl = trim(input.OMADA_CLOUD_BASE_URL) || DEFAULT_OMADA_CLOUD_BASE_URL;
  const username = trim(input.OMADA_CLOUD_USERNAME);
  const password = input.OMADA_CLOUD_PASSWORD ?? "";

  const missing: string[] = [];
  if (!username) missing.push("OMADA_CLOUD_USERNAME");
  if (!password) missing.push("OMADA_CLOUD_PASSWORD");

  if (missing.length > 0) {
    throw new OmadaNotConfiguredError(
      `Omada Cloud Access is not configured. Set ${missing.join(", ")}.`,
    );
  }

  assertOmadaCloudHost(baseUrl);

  return {
    baseUrl: baseUrl.replace(/\/$/, ""),
    username,
    password,
  };
}

export function resolveOmadaCloudConfig(input: CloudConfigInput): OmadaCloudConfig {
  const account = resolveOmadaCloudAccount(input);
  const deviceId = trim(input.OMADA_DEVICE_ID);
  const omadaId = trim(input.OMADA_ID);

  if (!deviceId || !omadaId) {
    throw new OmadaNotConfiguredError(
      "This location is missing Omada Device ID or Omada ID. Add them on the admin page.",
    );
  }

  return {
    ...account,
    deviceId,
    omadaId,
  };
}

export function getOmadaCloudAccount(): OmadaCloudAccount {
  const env = getEnv();
  return resolveOmadaCloudAccount({
    OMADA_CLOUD_BASE_URL: env.OMADA_CLOUD_BASE_URL,
    OMADA_CLOUD_USERNAME: env.OMADA_CLOUD_USERNAME,
    OMADA_CLOUD_PASSWORD: env.OMADA_CLOUD_PASSWORD,
  });
}

export function isOmadaCloudConfigured(): boolean {
  try {
    getOmadaCloudAccount();
    return true;
  } catch {
    return false;
  }
}

export function controllerApiBase(config: OmadaCloudConfig): string {
  return buildControllerApiBase(config.baseUrl, config.deviceId, config.omadaId);
}

export function omadaCloudPathIdsAreIdentical(ids: OmadaControllerIds): boolean {
  return ids.deviceId === ids.omadaId;
}

export const OMADA_PATH_ID_WARNING =
  "Omada Device ID and Omada ID are identical. Cloud Access URLs use two different IDs copied from the browser address bar when the OC200 is opened via Omada Cloud.";
