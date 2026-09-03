import { describe, expect, it } from "vitest";
import { guestCheckoutEmail, paymentCallbackUrl } from "@/lib/utils/guest";

describe("guest checkout helpers", () => {
  it("synthesizes a Paystack email from the guest phone", () => {
    expect(guestCheckoutEmail("08012345678")).toBe("08012345678@guest.teckfirm.org");
  });

  it("builds the Paystack callback URL from the app origin", () => {
    expect(paymentCallbackUrl("http://localhost:3000/")).toBe("http://localhost:3000/payment/callback");
  });
});
