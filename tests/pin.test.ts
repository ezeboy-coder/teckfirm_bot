import { describe, expect, it } from "vitest";
import { hashRetrievalPin } from "@/lib/security/retrieval-pin";
import { digitsOnly, isRetrievalPin, isVoucherCode } from "@/lib/utils/pin";

describe("retrieval PIN", () => {
  it("accepts exactly five digits", () => {
    expect(isRetrievalPin("48291")).toBe(true);
    expect(isRetrievalPin(" 00000 ")).toBe(true);
  });

  it("rejects anything that is not five digits", () => {
    expect(isRetrievalPin("1234")).toBe(false);
    expect(isRetrievalPin("123456")).toBe(false);
    expect(isRetrievalPin("12a45")).toBe(false);
    expect(isRetrievalPin("12 345")).toBe(false);
  });

  it("keeps only digits up to the requested length", () => {
    expect(digitsOnly("48a29b1c", 5)).toBe("48291");
  });

  it("accepts a 6-digit voucher code", () => {
    expect(isVoucherCode("383659")).toBe(true);
    expect(isVoucherCode("12345")).toBe(false);
    expect(isVoucherCode("1234567")).toBe(false);
    expect(isVoucherCode("12a456")).toBe(false);
  });

  it("hashes the same phone and PIN to the same value", () => {
    const secret = "a".repeat(32);
    const first = hashRetrievalPin("+2348012345678", "48291", secret);
    const second = hashRetrievalPin("+2348012345678", "48291", secret);
    expect(first).toBe(second);
    expect(first).toHaveLength(64);
  });

  it("treats a different PIN or phone as a separate retrieval group", () => {
    const secret = "a".repeat(32);
    const base = hashRetrievalPin("+2348012345678", "48291", secret);
    expect(hashRetrievalPin("+2348012345678", "48292", secret)).not.toBe(base);
    expect(hashRetrievalPin("+2348098765432", "48291", secret)).not.toBe(base);
  });
});
