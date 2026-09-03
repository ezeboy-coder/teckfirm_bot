import { describe, expect, it } from "vitest";
import {
  isElevenDigitCode,
  isNigerianPhone,
  normalizeGuestPhone,
  normalizeNigerianPhone,
} from "@/lib/utils/phone";

describe("nigerian phone", () => {
  it("accepts local and international formats", () => {
    expect(normalizeNigerianPhone("08012345678")).toBe("+2348012345678");
    expect(normalizeNigerianPhone("+2348012345678")).toBe("+2348012345678");
    expect(normalizeNigerianPhone("2348012345678")).toBe("+2348012345678");
  });

  it("rejects invalid numbers", () => {
    expect(isNigerianPhone("12345")).toBe(false);
    expect(isNigerianPhone("0801234")).toBe(false);
  });
});

describe("guest 11-digit number", () => {
  it("accepts any eleven digits", () => {
    expect(normalizeGuestPhone("12345678901")).toBe("12345678901");
    expect(normalizeGuestPhone("00000000000")).toBe("00000000000");
    expect(isElevenDigitCode("111-222-33344")).toBe(true);
  });

  it("rejects anything that is not eleven digits", () => {
    expect(isElevenDigitCode("1234567890")).toBe(false);
    expect(isElevenDigitCode("123456789012")).toBe(false);
    expect(isElevenDigitCode("abcdefghijk")).toBe(false);
  });
});
