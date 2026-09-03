import { AsyncLocalStorage } from "node:async_hooks";
import { OmadaNotConfiguredError } from "@/lib/omada/errors";
import type { OmadaControllerIds } from "@/lib/omada/types";

const store = new AsyncLocalStorage<OmadaControllerIds>();

export function withOmadaController<T>(ids: OmadaControllerIds, fn: () => Promise<T> | T): Promise<T> | T {
  return store.run(ids, fn);
}

export function peekOmadaController(): OmadaControllerIds | null {
  const ids = store.getStore();
  if (!ids?.deviceId.trim() || !ids.omadaId.trim()) return null;
  return ids;
}

export function requireOmadaController(): OmadaControllerIds {
  const ids = peekOmadaController();
  if (!ids) {
    throw new OmadaNotConfiguredError(
      "No Omada controller is selected for this location. Add the Device ID and Omada ID on the admin page.",
    );
  }
  return ids;
}

export function locationOmadaController(location: {
  omadaDeviceId: string | null;
  omadaId: string | null;
}): OmadaControllerIds {
  const deviceId = location.omadaDeviceId?.trim() ?? "";
  const omadaId = location.omadaId?.trim() ?? "";
  if (!deviceId || !omadaId) {
    throw new OmadaNotConfiguredError(
      "This location has no Omada Device ID or Omada ID. Add them on the admin page.",
    );
  }
  return { deviceId, omadaId };
}
