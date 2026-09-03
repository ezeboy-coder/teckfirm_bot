import { describe, expect, it } from "vitest";
import {
  activityStatusLabel,
  isOpenPendingPayment,
  isPaidMissingVoucher,
  isStalePendingOrder,
  STALE_PENDING_MS,
} from "@/lib/admin/order-status";

describe("admin order status", () => {
  it("labels cancelled orders even if payment was left pending", () => {
    expect(activityStatusLabel("CANCELLED", "PENDING")).toBe("Cancelled");
    expect(activityStatusLabel("PAYMENT_PENDING", "ABANDONED")).toBe("Cancelled");
  });

  it("labels successful payments as paid", () => {
    expect(activityStatusLabel("COMPLETED", "SUCCESS")).toBe("Paid");
    expect(activityStatusLabel("PAID", "SUCCESS")).toBe("Paid");
    expect(activityStatusLabel("FULFILLING", "SUCCESS")).toBe("Paid");
  });

  it("flags paid orders that still need a voucher", () => {
    expect(isPaidMissingVoucher("SUCCESS", "PAID")).toBe(true);
    expect(isPaidMissingVoucher("SUCCESS", "FULFILLING")).toBe(true);
    expect(isPaidMissingVoucher("SUCCESS", "COMPLETED", true)).toBe(false);
    expect(isPaidMissingVoucher("PENDING", "PAYMENT_PENDING")).toBe(false);
  });

  it("treats initialized and pending payments without a voucher as open", () => {
    expect(isOpenPendingPayment("PENDING", "PAYMENT_PENDING")).toBe(true);
    expect(isOpenPendingPayment("INITIALIZED", "PENDING")).toBe(true);
    expect(isOpenPendingPayment("PENDING", "PAYMENT_PENDING", true)).toBe(false);
    expect(isOpenPendingPayment("ABANDONED", "CANCELLED")).toBe(false);
    expect(isOpenPendingPayment("SUCCESS", "COMPLETED")).toBe(false);
  });

  it("only allows manual updates after two minutes of pending", () => {
    const createdAt = new Date("2026-09-03T09:00:00.000Z");
    const base = {
      createdAt,
      paymentStatus: "PENDING" as const,
      orderStatus: "PAYMENT_PENDING" as const,
    };

    expect(isStalePendingOrder({ ...base, now: createdAt.getTime() + STALE_PENDING_MS - 1 })).toBe(
      false,
    );
    expect(isStalePendingOrder({ ...base, now: createdAt.getTime() + STALE_PENDING_MS })).toBe(true);
    expect(
      isStalePendingOrder({
        ...base,
        hasVoucher: true,
        now: createdAt.getTime() + STALE_PENDING_MS,
      }),
    ).toBe(false);
  });
});
