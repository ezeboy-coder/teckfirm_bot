import { describe, expect, it } from "vitest";
import { isFailedPaystackCharge, isSuccessfulPaystackCharge, isCancelledPaystackCharge, paystackAmountMatchesOrder } from "@/lib/paystack/status";

describe("Paystack charge status", () => {
  it("treats only success as a paid charge", () => {
    expect(isSuccessfulPaystackCharge("success")).toBe(true);
    expect(isSuccessfulPaystackCharge("SUCCESS")).toBe(true);
    expect(isSuccessfulPaystackCharge("failed")).toBe(false);
    expect(isSuccessfulPaystackCharge("abandoned")).toBe(false);
  });

  it("treats abandoned and cancelled as cancelled charges", () => {
    expect(isCancelledPaystackCharge("abandoned")).toBe(true);
    expect(isCancelledPaystackCharge("cancelled")).toBe(true);
    expect(isCancelledPaystackCharge("success")).toBe(false);
    expect(isCancelledPaystackCharge("failed")).toBe(false);
  });

  it("treats failed and reversed as terminal failed charges", () => {
    expect(isFailedPaystackCharge("failed")).toBe(true);
    expect(isFailedPaystackCharge("reversed")).toBe(true);
    expect(isFailedPaystackCharge("success")).toBe(false);
    expect(isFailedPaystackCharge("abandoned")).toBe(false);
  });

  it("requires the verified amount and currency to match the order", () => {
    expect(paystackAmountMatchesOrder(150000, 150000, "NGN")).toBe(true);
    expect(paystackAmountMatchesOrder(150000, 150000, "ngn")).toBe(true);
    expect(paystackAmountMatchesOrder(150000, 149900, "NGN")).toBe(false);
    expect(paystackAmountMatchesOrder(150000, 150000, "USD")).toBe(false);
  });
});
