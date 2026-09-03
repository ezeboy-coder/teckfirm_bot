import { describe, expect, it } from "vitest";
import { planTermsFromAdminInput, UNLIMITED_DEVICE_LIMIT } from "@/lib/plans/terms";

describe("admin price terms for Omada vouchers", () => {
  it("sets a gig plan to 30 days with that GB as the traffic cap", () => {
    expect(
      planTermsFromAdminInput({
        priceNaira: 1000,
        dataKind: "GIG",
        gigAmount: 5,
      }),
    ).toEqual({
      duration: 30,
      durationUnit: "DAYS",
      dataAllowance: 5,
      dataUnit: "GB",
      deviceLimit: UNLIMITED_DEVICE_LIMIT,
    });
  });

  it("sets unlimited daily to 1 day, no traffic cap, and the device count", () => {
    expect(
      planTermsFromAdminInput({
        priceNaira: 500,
        dataKind: "UNLIMITED_DAILY",
        deviceLimit: 2,
      }),
    ).toEqual({
      duration: 1,
      durationUnit: "DAYS",
      dataAllowance: null,
      dataUnit: "UNLIMITED",
      deviceLimit: 2,
    });
  });

  it("sets unlimited monthly to 30 days, no traffic cap, and the device count", () => {
    expect(
      planTermsFromAdminInput({
        priceNaira: 8000,
        dataKind: "UNLIMITED_MONTHLY",
        deviceLimit: 3,
      }),
    ).toEqual({
      duration: 30,
      durationUnit: "DAYS",
      dataAllowance: null,
      dataUnit: "UNLIMITED",
      deviceLimit: 3,
    });
  });
});
