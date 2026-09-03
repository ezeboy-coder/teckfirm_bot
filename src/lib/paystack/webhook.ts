import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyPaystackSignature(rawBody: string, signature: string, secret: string) {
  const hash = createHmac("sha512", secret).update(rawBody).digest("hex");
  const expected = Buffer.from(hash);
  const received = Buffer.from(signature);
  if (expected.length !== received.length) {
    return false;
  }
  return timingSafeEqual(expected, received);
}
