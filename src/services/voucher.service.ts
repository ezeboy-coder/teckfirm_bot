import type { VoucherStatus } from "@prisma/client";
import { isOmadaCloudConfigured } from "@/lib/omada/config";
import { locationOmadaController, withOmadaController } from "@/lib/omada/context";
import { OMADA_FUNCTION_UNAVAILABLE_MESSAGE, OmadaError, OmadaNotConfiguredError } from "@/lib/omada/errors";
import { findHotspotVoucherByCode, findHotspotVouchersByCodes } from "@/lib/omada/lookup";
import { resolveHotspotSiteId } from "@/lib/omada/sites";
import {
  extractOmadaVoucherFacts,
  keepLiveGuestVoucher,
  type LiveGuestVoucherStatus,
  type OmadaVoucherFacts,
} from "@/lib/omada/vouchers";
import { LOCATION_CONTROLLER_OFFLINE_MESSAGE } from "@/lib/locations/availability";
import { logger } from "@/lib/logger";
import { hashRetrievalPin } from "@/lib/security/retrieval-pin";
import { displayName } from "@/lib/utils/display";
import { normalizeGuestPhone } from "@/lib/utils/phone";
import { getEnv } from "@/lib/validation/env";
import { getLocationById } from "@/repositories/location.repository";
import {
  deleteVouchersByIds,
  findPaidOrdersByPhoneAndPinHash,
  syncLiveVoucherStatuses,
} from "@/repositories/voucher-lookup.repository";
import { isLocationControllerLive } from "@/services/location.service";

export type GuestVoucherLiveStatus = LiveGuestVoucherStatus;

export type LookedUpVoucher = {
  code: string;
  status: GuestVoucherLiveStatus;
  plan: string;
  location: string;
};

export type GuestVoucherLookupResult =
  | { ok: true; vouchers: LookedUpVoucher[]; pendingReferences: string[] }
  | { ok: false; reason: "invalid_phone" | "not_found" | "omada_error" | "location_offline"; message?: string };

function liveStatusToDb(status: GuestVoucherLiveStatus): Extract<VoucherStatus, "UNUSED" | "ACTIVE"> {
  return status === "in-use" ? "ACTIVE" : "UNUSED";
}

export async function lookupGuestVouchers(
  phoneInput: string,
  pin: string,
  locationId: string,
): Promise<GuestVoucherLookupResult> {
  const phone = normalizeGuestPhone(phoneInput);
  if (!phone) {
    return { ok: false, reason: "invalid_phone" };
  }

  const locationRecord = await getLocationById(locationId);
  if (!locationRecord || !locationRecord.active) {
    return { ok: false, reason: "not_found" };
  }
  if (!(await isLocationControllerLive(locationRecord))) {
    return { ok: false, reason: "location_offline", message: LOCATION_CONTROLLER_OFFLINE_MESSAGE };
  }

  const guestPinHash = hashRetrievalPin(phone, pin, getEnv().AUTH_SECRET);
  const orders = await findPaidOrdersByPhoneAndPinHash(phone, guestPinHash, locationId);

  if (orders.length === 0) {
    return { ok: false, reason: "not_found" };
  }

  const location = orders[0]?.location;
  const issued = orders.flatMap((order) => (order.voucher ? [order.voucher] : []));
  const pendingReferences = orders
    .filter(
      (order) => !order.voucher && order.status !== "COMPLETED" && order.fulfillmentStatus !== "COMPLETED",
    )
    .map((order) => order.reference);

  const vouchers: LookedUpVoucher[] = [];
  if (issued.length === 0) {
    return { ok: true, vouchers, pendingReferences };
  }

  if (!location) {
    return { ok: false, reason: "not_found" };
  }

  try {
    if (!isOmadaCloudConfigured()) {
      throw new OmadaNotConfiguredError();
    }

    const liveRows = await withOmadaController(locationOmadaController(location), async () => {
      const siteId = await resolveHotspotSiteId(location);
      return findHotspotVouchersByCodes(
        siteId,
        issued.map((voucher) => voucher.code),
      );
    });

    const dropIds: string[] = [];
    const keepUpdates: { id: string; status: "UNUSED" | "ACTIVE"; expiresAt: Date | null }[] = [];

    for (const voucher of issued) {
      const row = liveRows.get(voucher.code.trim());
      const facts = row ? extractOmadaVoucherFacts(row) : null;
      if (!facts || !keepLiveGuestVoucher(facts.status)) {
        dropIds.push(voucher.id);
        continue;
      }

      keepUpdates.push({
        id: voucher.id,
        status: liveStatusToDb(facts.status),
        expiresAt: facts.expiresAt ? new Date(facts.expiresAt) : null,
      });
      vouchers.push({
        code: voucher.code,
        status: facts.status,
        plan: orders.find((order) => order.voucher?.id === voucher.id)?.items[0]?.plan.name ?? "WiFi plan",
        location: displayName(location.name),
      });
    }

    await deleteVouchersByIds(dropIds);
    await syncLiveVoucherStatuses(keepUpdates);
    if (dropIds.length > 0) {
      logger.info("Removed guest vouchers that are expired or gone from the controller", {
        count: dropIds.length,
      });
    }
  } catch (error) {
    if (error instanceof OmadaError) {
      logger.error("Guest voucher lookup could not reach the controller", {
        code: error.code,
        omadaErrorCode: error.omadaErrorCode,
      });
      return { ok: false, reason: "omada_error", message: OMADA_FUNCTION_UNAVAILABLE_MESSAGE };
    }
    throw error;
  }

  return { ok: true, vouchers, pendingReferences };
}

export type ControllerVoucherCheck =
  | { ok: true; location: string; facts: OmadaVoucherFacts }
  | { ok: false; reason: "not_found" | "no_location" | "omada_error" | "location_offline"; message: string };

export async function checkVoucherOnController(
  locationId: string,
  code: string,
): Promise<ControllerVoucherCheck> {
  const location = await getLocationById(locationId);
  if (!location) {
    return { ok: false, reason: "no_location", message: "Choose a location." };
  }
  if (!location.active || !(await isLocationControllerLive(location))) {
    return { ok: false, reason: "location_offline", message: LOCATION_CONTROLLER_OFFLINE_MESSAGE };
  }

  try {
    if (!isOmadaCloudConfigured()) {
      throw new OmadaNotConfiguredError();
    }

    const facts = await withOmadaController(locationOmadaController(location), async () => {
      const siteId = await resolveHotspotSiteId(location);
      const row = await findHotspotVoucherByCode(siteId, code.trim());
      return row ? extractOmadaVoucherFacts(row) : null;
    });

    if (!facts) {
      return {
        ok: false,
        reason: "not_found",
        message: "No voucher was found for that code on this location’s controller.",
      };
    }

    return { ok: true, location: displayName(location.name), facts };
  } catch (error) {
    if (error instanceof OmadaError) {
      logger.error("Voucher check could not reach the controller", {
        code: error.code,
        omadaErrorCode: error.omadaErrorCode,
      });
      return { ok: false, reason: "omada_error", message: OMADA_FUNCTION_UNAVAILABLE_MESSAGE };
    }
    throw error;
  }
}

export const voucherService = {
  lookupGuestVouchers,
  checkVoucherOnController,
};
