import { describe, expect, it } from "vitest";
import { paymentEnquiryWhatsAppText } from "@/lib/utils/support-message";

describe("paymentEnquiryWhatsAppText", () => {
  it("builds a ready-to-send support message with the payment summary", () => {
    const text = paymentEnquiryWhatsAppText({
      reference: "TFW-20260904-ABC123",
      locationName: "Yaba",
      planName: "1 GB",
      amountKobo: 50000,
      phone: "08012345678",
    });

    expect(text).toContain("Reference: TFW-20260904-ABC123");
    expect(text).toContain("Location: Yaba");
    expect(text).toContain("Plan: 1 GB");
    expect(text).toContain("Amount: ₦500");
    expect(text).toContain("Phone used at checkout: 08012345678");
  });
});
