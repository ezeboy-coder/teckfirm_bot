import { activityStatusLabel, isOpenPendingPayment, isPaidMissingVoucher, isStalePendingOrder } from "@/lib/admin/order-status";
import { LOCATION_CONTROLLER_OFFLINE_MESSAGE } from "@/lib/locations/availability";
import { locationDisplayName } from "@/lib/locations/label";
import { boughtDuringRange, countUniqueBuyers } from "@/lib/admin/buyers";
import { logger } from "@/lib/logger";
import { isOmadaCloudConfigured } from "@/lib/omada/config";
import { locationOmadaController, withOmadaController } from "@/lib/omada/context";
import { OmadaError, OmadaNotConfiguredError } from "@/lib/omada/errors";
import { testOmadaConnection } from "@/lib/omada/sites";
import { nigeriaDayRange } from "@/lib/time/nigeria";
import { lastSixReferenceChars } from "@/lib/utils/reference";
import type { adminLocationCreateSchema } from "@/lib/validation/schemas";
import {
  createLocation,
  getLocationById,
  getLocationBySlug,
  listAdminLocations,
  listActiveLocations,
  uniqueLocationSlug,
  updateLocation,
} from "@/repositories/location.repository";
import {
  countLocationRecords,
  countVouchers,
  countVouchersForLocations,
  deactivateLocation,
  getAdminLocationRecord,
  hardDeleteLocation,
  listLocationActivity,
  listPaidOrderBuyers,
  sumSuccessfulPayments,
} from "@/repositories/location-activity.repository";
import { writeAuditLog } from "@/services/audit.service";
import type { z } from "zod";

type AdminLocationInput = z.infer<typeof adminLocationCreateSchema>;

function isDemoName(name: string) {
  return name.toLowerCase().includes("demo");
}

async function assertControllerReachable(omadaDeviceId: string, omadaId: string) {
  if (!isOmadaCloudConfigured()) {
    throw new OmadaNotConfiguredError(
      "Set OMADA_CLOUD_USERNAME and OMADA_CLOUD_PASSWORD before adding a location.",
    );
  }

  const result = await withOmadaController(
    locationOmadaController({ omadaDeviceId, omadaId }),
    () => testOmadaConnection(),
  );

  if (!result.connected) {
    throw new OmadaError(
      "Omada Cloud Access did not confirm this controller.",
      "OMADA_CONNECTION_FAILED",
      true,
    );
  }

  return result;
}

export async function isLocationControllerLive(location: {
  active: boolean;
  name: string;
  omadaDeviceId: string | null;
  omadaId: string | null;
}): Promise<boolean> {
  if (!location.active || isDemoName(location.name)) {
    return false;
  }

  try {
    await assertControllerReachable(location.omadaDeviceId ?? "", location.omadaId ?? "");
    return true;
  } catch (error) {
    logger.warn("Location controller is not reachable", {
      code: error instanceof OmadaError ? error.code : "unknown",
      omadaErrorCode: error instanceof OmadaError ? error.omadaErrorCode : undefined,
    });
    return false;
  }
}

export const locationService = {
  listPublic: listActiveLocations,
  getBySlug: getLocationBySlug,
  getById: getLocationById,
  listAdmin: listAdminLocations,

  async listAdminDashboard() {
    const { start, next } = nigeriaDayRange();
    const locations = await listAdminLocations();
    const ids = locations.map((location) => location.id);
    const [todayVouchers, buyers] = await Promise.all([
      countVouchersForLocations(ids, start),
      listPaidOrderBuyers(ids),
    ]);

    const todayVoucherMap = new Map(todayVouchers.map((row) => [row.locationId, row._count._all]));

    return locations.map((location) => {
      const locationBuyers = buyers.filter((row) => row.locationId === location.id);
      const buyersToday = countUniqueBuyers(
        locationBuyers.filter((row) => boughtDuringRange(row, start, next)),
      );
      return {
        id: location.id,
        name: location.name,
        kind: location.kind,
        vouchersOverall: location._count.vouchers,
        vouchersToday: todayVoucherMap.get(location.id) ?? 0,
        buyersToday,
        buyersOverall: countUniqueBuyers(locationBuyers),
        omadaConfigured: Boolean(location.omadaDeviceId?.trim() && location.omadaId?.trim()),
      };
    });
  },

  async getAdminDashboard(id: string) {
    const location = await getAdminLocationRecord(id);
    if (!location || isDemoName(location.name) || !location.active) {
      return null;
    }

    const { start, next } = nigeriaDayRange();
    const [vouchersOverall, vouchersToday, revenueOverall, revenueToday, buyers, activity] =
      await Promise.all([
        countVouchers(id),
        countVouchers(id, start),
        sumSuccessfulPayments(id),
        sumSuccessfulPayments(id, start),
        listPaidOrderBuyers([id]),
        listLocationActivity(id),
      ]);

    return {
      location,
      stats: {
        vouchersOverall,
        vouchersToday,
        buyersOverall: countUniqueBuyers(buyers),
        buyersToday: countUniqueBuyers(buyers.filter((row) => boughtDuringRange(row, start, next))),
        revenueOverallKobo: revenueOverall._sum.amountKobo ?? 0,
        revenueTodayKobo: revenueToday._sum.amountKobo ?? 0,
      },
      activity: activity.map((order) => ({
        id: order.id,
        at: order.paidAt ?? order.createdAt,
        buyer:
          order.guestFirstName?.trim() ||
          order.user?.firstName?.trim() ||
          order.guestPhone ||
          order.user?.phone ||
          order.guestEmail ||
          order.user?.email ||
          "Guest",
        contact: order.guestPhone || order.user?.phone || order.guestEmail || order.user?.email || "—",
        plan: order.items[0]?.plan.name ?? "WiFi plan",
        amountKobo: order.totalKobo,
        referenceTail: lastSixReferenceChars(order.reference),
        statusLabel: activityStatusLabel(order.status, order.paymentStatus),
        createdAt: order.createdAt.toISOString(),
        isOpenPending: isOpenPendingPayment(order.paymentStatus, order.status, Boolean(order.voucher)),
        needsVoucher: isPaidMissingVoucher(order.paymentStatus, order.status, Boolean(order.voucher)),
        canResolve: isStalePendingOrder({
          createdAt: order.createdAt,
          paymentStatus: order.paymentStatus,
          orderStatus: order.status,
          hasVoucher: Boolean(order.voucher),
        }),
      })),
    };
  },

  async create(input: AdminLocationInput, actorId: string) {
    const lodgeName = input.kind === "COMMUNITY_AND_LODGE" ? (input.lodgeName ?? null) : null;
    const name = locationDisplayName(input.kind, input.community, lodgeName);
    const slug = await uniqueLocationSlug(name);
    await assertControllerReachable(input.omadaDeviceId, input.omadaId);
    const location = await createLocation({
      name,
      slug,
      kind: input.kind,
      community: input.community,
      lodgeName,
      omadaControllerIp: null,
      omadaDeviceId: input.omadaDeviceId,
      omadaId: input.omadaId,
      city: input.community,
      state: "Nigeria",
      active: true,
      displayOrder: 0,
    });
    await writeAuditLog({
      actorId,
      action: "location.create",
      resource: "Location",
      resourceId: location.id,
      newData: {
        name: location.name,
        kind: location.kind,
        community: location.community,
        lodgeName: location.lodgeName,
        omadaConfigured: true,
      },
    });
    return location;
  },

  async updateName(
    id: string,
    input: { community: string; lodgeName?: string },
    actorId: string,
  ) {
    const record = await getLocationById(id);
    if (!record || isDemoName(record.name) || !record.active) {
      throw new Error("That location is not available to update.");
    }

    const lodgeName = record.kind === "COMMUNITY_AND_LODGE" ? (input.lodgeName ?? null) : null;
    if (record.kind === "COMMUNITY_AND_LODGE" && !lodgeName) {
      throw new Error("Enter the lodge name.");
    }

    const name = locationDisplayName(record.kind, input.community, lodgeName);
    const slug = await uniqueLocationSlug(name, id);
    const location = await updateLocation(id, {
      name,
      slug,
      community: input.community,
      lodgeName,
      city: input.community,
    });
    await writeAuditLog({
      actorId,
      action: "location.update_name",
      resource: "Location",
      resourceId: location.id,
      previousData: { name: record.name },
      newData: { name: location.name },
    });
    return location;
  },

  async getGuestControllerStatus(locationId: string) {
    const location = await getLocationById(locationId);
    if (!location || !location.active || isDemoName(location.name)) {
      return { ok: false as const, reason: "not_found" as const };
    }

    const live = await isLocationControllerLive(location);
    if (!live) {
      return {
        ok: false as const,
        reason: "offline" as const,
        message: LOCATION_CONTROLLER_OFFLINE_MESSAGE,
      };
    }

    return { ok: true as const, live: true as const };
  },

  async remove(id: string, actorId: string) {
    const record = await countLocationRecords(id);
    if (!record || isDemoName(record.name) || !record.active) {
      throw new Error("That location is not available to delete.");
    }

    const related = record._count.orders + record._count.vouchers + record._count.orderItems;
    if (related === 0) {
      await hardDeleteLocation(id);
    } else {
      await deactivateLocation(id);
    }

    await writeAuditLog({
      actorId,
      action: related === 0 ? "location.delete" : "location.deactivate",
      resource: "Location",
      resourceId: id,
      previousData: { name: record.name, related },
    });
  },
};
