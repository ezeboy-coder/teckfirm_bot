import { createHmac } from "node:crypto";
import { isRetrievalPin } from "@/lib/utils/pin";

export function hashRetrievalPin(normalizedPhone: string, pin: string, secret: string): string {
  if (!isRetrievalPin(pin)) {
    throw new Error("Retrieval PIN must be 5 digits");
  }

  return createHmac("sha256", secret)
    .update(`${normalizedPhone}:${pin.trim()}`)
    .digest("hex");
}
