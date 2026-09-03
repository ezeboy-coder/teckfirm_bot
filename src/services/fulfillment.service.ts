import { Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";
import { isOmadaCloudConfigured } from "@/lib/omada/config";
import { locationOmadaController, withOmadaController } from "@/lib/omada/context";
import { OmadaError } from "@/lib/omada/errors";
import { createVoucherGroup, getVoucherGroup, listVoucherPortals } from "@/lib/omada/operations";
import { extractPortalList } from "@/lib/omada/parse";
import { resolveHotspotSiteId } from "@/lib/omada/sites";
import { buildOmadaVoucherCreateBody, extractCreatedId, extractCreatedVoucher } from "@/lib/omada/vouchers";
import { toDurationMinutes } from "@/lib/utils/duration";
import {
  claimOrderForFulfillment,
  completeFulfillment,
  failFulfillment,
  findOrderWithVoucher,
} from "@/repositories/order.repository";

function dataAllowanceMb(plan: {
  dataAllowance: number | null;
  dataUnit: "MB" | "GB" | "UNLIMITED";
}): number | null {
  if (plan.dataUnit === "UNLIMITED" || plan.dataAllowance == null) {
    return null;
  }
  if (plan.dataUnit === "GB") {
    return plan.dataAllowance * 1024;
  }
  return plan.dataAllowance;
}

function speedLimitKbps(speedLimitMbps: number | null): number | null {
  if (speedLimitMbps == null || speedLimitMbps <= 0) return null;
  return speedLimitMbps * 1024;
}

export async function fulfillPaidOrder(orderId: string): Promise<"issued" | "pending" | "skipped"> {
  const existing = await findOrderWithVoucher(orderId);
  if (existing?.voucher) return "issued";
  if (!existing) return "skipped";
  if (existing.paymentStatus !== "SUCCESS" || existing.status === "MANUAL_REVIEW") {
    return "skipped";
  }

  const claimed = await claimOrderForFulfillment(orderId);
  if (!claimed) {
    const raced = await findOrderWithVoucher(orderId);
    return raced?.voucher ? "issued" : "pending";
  }

  const plan = existing.items[0]?.plan;
  if (!plan) {
    logger.error("Paid order has no plan item", { orderId });
    await failFulfillment(orderId);
    return "pending";
  }

  try {
    if (!isOmadaCloudConfigured()) {
      throw new OmadaError("Omada Cloud Access is not configured.", "OMADA_NOT_CONFIGURED", true);
    }

    const controller = locationOmadaController(existing.location);
    const issued = await withOmadaController(controller, async () => {
      const siteId = await resolveHotspotSiteId(existing.location);
      const portals = extractPortalList(await listVoucherPortals(siteId));
      const portalIds = portals.map((portal) => portal.id).filter((id) => id.trim().length > 0);
      if (portalIds.length === 0) {
        throw new OmadaError(
          "No Omada hotspot portal is available to attach this voucher to.",
          "OMADA_NO_PORTAL",
          true,
        );
      }

      const durationMinutes = toDurationMinutes(plan.duration, plan.durationUnit);
      const created = await createVoucherGroup(
        siteId,
        buildOmadaVoucherCreateBody({
          name: existing.reference,
          durationMinutes,
          deviceLimit: plan.deviceLimit,
          dataAllowanceMb: dataAllowanceMb(plan),
          speedLimitKbps: speedLimitKbps(plan.speedLimitMbps),
          note: `TFW ${existing.reference}`,
        }),
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

      return { siteId, voucher, durationMinutes };
    });

    await completeFulfillment({
      orderId,
      locationId: existing.locationId,
      planId: plan.id,
      code: issued.voucher.code,
      omadaVoucherId: issued.voucher.id,
      omadaSiteId: issued.siteId,
      expiresAt: new Date(Date.now() + issued.durationMinutes * 60_000),
      deviceLimit: plan.deviceLimit,
      dataAllowance: plan.dataAllowance,
      durationMinutes: issued.durationMinutes,
    });

    logger.info("Voucher issued for paid order", { orderId });
    return "issued";
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const raced = await findOrderWithVoucher(orderId);
      if (raced?.voucher) return "issued";
    }

    logger.error("Voucher fulfillment failed", {
      orderId,
      error: error instanceof Error ? error.message : "unknown",
    });
    await failFulfillment(orderId);
    return "pending";
  }
}

export const fulfillmentService = {
  fulfillPaidOrder,
};
