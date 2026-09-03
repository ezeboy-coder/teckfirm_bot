import type { DataUnit, DurationUnit } from "@prisma/client";
import type { adminPriceCreateSchema } from "@/lib/validation/schemas";
import type { z } from "zod";

type AdminPriceInput = z.infer<typeof adminPriceCreateSchema>;

/** Omada `maxUsers` upper bound. Used as the stored "unlimited devices" value for gig plans. */
export const UNLIMITED_DEVICE_LIMIT = 999;

export function isUnlimitedDeviceLimit(limit: number) {
  return limit >= UNLIMITED_DEVICE_LIMIT;
}

export type PlanTerms = {
  duration: number;
  durationUnit: DurationUnit;
  dataAllowance: number | null;
  dataUnit: DataUnit;
  deviceLimit: number;
};

/**
 * Admin price kinds map to voucher terms used at Omada create time.
 * Gig: 30 days, traffic cap = total of the GB entered, unlimited devices.
 * Unlimited daily: 1 day, no traffic cap, device count from admin.
 * Unlimited monthly: 30 days, no traffic cap, device count from admin.
 */
export function planTermsFromAdminInput(input: AdminPriceInput): PlanTerms {
  if (input.dataKind === "GIG") {
    return {
      duration: 30,
      durationUnit: "DAYS",
      dataAllowance: input.gigAmount ?? null,
      dataUnit: "GB",
      deviceLimit: UNLIMITED_DEVICE_LIMIT,
    };
  }

  if (input.dataKind === "UNLIMITED_DAILY") {
    return {
      duration: 1,
      durationUnit: "DAYS",
      dataAllowance: null,
      dataUnit: "UNLIMITED",
      deviceLimit: input.deviceLimit ?? 1,
    };
  }

  return {
    duration: 30,
    durationUnit: "DAYS",
    dataAllowance: null,
    dataUnit: "UNLIMITED",
    deviceLimit: input.deviceLimit ?? 1,
  };
}
