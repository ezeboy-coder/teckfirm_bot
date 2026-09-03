import { clearOmadaSession, getOmadaSession } from "@/lib/omada/auth";
import { buildControllerApiBase, getOmadaCloudAccount } from "@/lib/omada/config";
import { requireOmadaController } from "@/lib/omada/context";
import { OmadaError, isOmadaSessionExpired } from "@/lib/omada/errors";
import { omadaHttp } from "@/lib/omada/http";
import type { OmadaHttpMethod } from "@/lib/omada/types";

function controllerPath(endpoint: string): string {
  const account = getOmadaCloudAccount();
  const ids = requireOmadaController();
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${buildControllerApiBase(account.baseUrl, ids.deviceId, ids.omadaId)}${path}`;
}

async function send<T>(method: OmadaHttpMethod, endpoint: string, body?: unknown): Promise<T> {
  const session = await getOmadaSession();
  const result = await omadaHttp<T>(controllerPath(endpoint), {
    method,
    body,
    session,
  });
  return result.data;
}

/**
 * Authenticated Cloud Access request.
 * `endpoint` is relative to `/omadac/{deviceId}/{omadacId}/api/v2`.
 * Example: omadaRequest("GET", "/sites")
 */
export async function omadaRequest<T = unknown>(
  method: OmadaHttpMethod,
  endpoint: string,
  body?: unknown,
): Promise<T> {
  try {
    return await send<T>(method, endpoint, body);
  } catch (error) {
    if (error instanceof OmadaError && isOmadaSessionExpired(error)) {
      clearOmadaSession();
      return send<T>(method, endpoint, body);
    }
    throw error;
  }
}
