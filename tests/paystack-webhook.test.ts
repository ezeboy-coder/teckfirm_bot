import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyPaystackSignature } from "@/lib/paystack/webhook";

describe("paystack webhook signature", () => {
  it("accepts a valid HMAC SHA512 signature", () => {
    const body = '{"event":"charge.success"}';
    const secret = "test_secret";
    const signature = createHmac("sha512", secret).update(body).digest("hex");
    expect(verifyPaystackSignature(body, signature, secret)).toBe(true);
  });

  it("rejects an invalid signature", () => {
    expect(verifyPaystackSignature("{}", "deadbeef", "test_secret")).toBe(false);
  });
});
