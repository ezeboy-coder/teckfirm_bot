import { describe, expect, it } from "vitest";
import {
  isElevenDigitCode,
  isNigerianPhone,
  joinSupportPhone,
  normalizeGuestPhone,
  normalizeNigerianPhone,
  splitSupportPhone,
  toWhatsAppDigits,
  toWhatsAppUrl,
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

  it("builds a WhatsApp chat link from a Nigerian number", () => {
    expect(toWhatsAppDigits("08012345678")).toBe("2348012345678");
    expect(toWhatsAppUrl("08012345678")).toBe("https://wa.me/2348012345678");
    expect(toWhatsAppUrl("08012345678", "Hello")).toBe(
      "https://wa.me/2348012345678?text=Hello",
    );
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

describe("support contact phone parts", () => {
  it("joins country code and national number for storage", () => {
    expect(joinSupportPhone("+234", "8012345678")).toBe("+234 8012345678");
    expect(joinSupportPhone("234", "08012345678")).toBe("+234 8012345678");
  });

  it("splits saved support contact into form fields", () => {
    expect(splitSupportPhone("+234 8012345678")).toEqual({
      countryCode: "234",
      nationalNumber: "8012345678",
    });
    expect(splitSupportPhone("08012345678")).toEqual({
      countryCode: "234",
      nationalNumber: "8012345678",
    });
  });

  it("builds WhatsApp links from stored support contact format", () => {
    expect(toWhatsAppDigits("+234 8012345678")).toBe("2348012345678");
    expect(toWhatsAppUrl("+234 8012345678")).toBe("https://wa.me/2348012345678");
  });
});
