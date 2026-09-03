import { describe, expect, it } from "vitest";
import { generateOrderReference, lastSixReferenceChars, paymentReferenceMessage } from "@/lib/utils/reference";

describe("order reference", () => {
  it("uses a non-sequential TeckFirm format", () => {
    const value = generateOrderReference(new Date("2026-08-26T10:00:00Z"));
    expect(value).toMatch(/^TFW-20260826-[A-Z0-9]{6}$/);
  });

  it("does not collide in a small sample", () => {
    const values = new Set(Array.from({ length: 50 }, () => generateOrderReference()));
    expect(values.size).toBe(50);
  });

  it("returns the last six characters of a payment reference", () => {
    expect(lastSixReferenceChars("TFW-20260903-K7NP2M")).toBe("K7NP2M");
    expect(lastSixReferenceChars("abc")).toBe("ABC");
  });

  it("tells the guest the payment reference instead of a pending-voucher message", () => {
    expect(paymentReferenceMessage(["TFW-20260903-K7NP2M"])).toBe(
      "Your payment reference is TFW-20260903-K7NP2M.",
    );
    expect(paymentReferenceMessage(["TFW-A", "TFW-B"])).toBe("Your payment references are TFW-A, TFW-B.");
    expect(paymentReferenceMessage([])).not.toMatch(/prepared/i);
  });
});
