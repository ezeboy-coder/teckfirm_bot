import { OmadaError } from "@/lib/omada/errors";
import { createVoucherGroup, getVoucherGroup, listVoucherPortals } from "@/lib/omada/operations";
import { extractPortalList } from "@/lib/omada/parse";
import {
  buildOmadaVoucherCreateBody,
  extractCreatedId,
  extractCreatedVoucher,
  type OmadaCreatedVoucher,
} from "@/lib/omada/vouchers";

export async function loadVoucherPortalIds(siteId: string): Promise<string[]> {
  const portals = extractPortalList(await listVoucherPortals(siteId));
  return [...new Set(portals.map((portal) => portal.id.trim()).filter((id) => id.length > 0))];
}

/**
 * Create one hotspot voucher via a voucher group.
 * Always binds the live portal list from GET `/setting/voucher/portals`.
 * Never uses POST `/vouchers`, which Omada rejects without selected portals.
 */
export async function issueHotspotVoucher(
  siteId: string,
  input: {
    name: string;
    durationMinutes: number;
    deviceLimit: number;
    dataAllowanceMb: number | null;
    speedLimitKbps: number | null;
    note?: string;
  },
): Promise<OmadaCreatedVoucher> {
  const portalIds = await loadVoucherPortalIds(siteId);
  if (portalIds.length === 0) {
    throw new OmadaError(
      "No Omada hotspot portal is available to attach this voucher to.",
      "OMADA_NO_PORTAL",
      true,
    );
  }

  const created = await createVoucherGroup(
    siteId,
    buildOmadaVoucherCreateBody(input),
  );
  const groupId = extractCreatedId(created);
  if (!groupId) {
    throw new OmadaError("Omada did not return a voucher group.", "OMADA_BAD_RESPONSE", true);
  }

  const detail = await getVoucherGroup(siteId, groupId);
  const voucher = extractCreatedVoucher(detail);
  if (!voucher) {
    throw new OmadaError("Omada did not return a voucher code.", "OMADA_BAD_RESPONSE", true);
  }

  return voucher;
}
