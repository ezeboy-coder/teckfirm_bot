import { apiError, apiSuccess } from "@/lib/api/response";
import { getPaystackWebhookSecret } from "@/lib/paystack/client";
import { verifyPaystackSignature } from "@/lib/paystack/webhook";
import { logger } from "@/lib/logger";
import { confirmPaystackReference } from "@/services/payment.service";

export const dynamic = "force-dynamic";

function readReference(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const data = (payload as { data?: unknown }).data;
  if (!data || typeof data !== "object") return null;
  const reference = (data as { reference?: unknown }).reference;
  return typeof reference === "string" && reference.trim() ? reference.trim() : null;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature") ?? "";
  const secret = getPaystackWebhookSecret();

  if (!secret || !verifyPaystackSignature(rawBody, signature, secret)) {
    return apiError("Invalid webhook signature.", "INVALID_SIGNATURE", 401);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody) as unknown;
  } catch {
    return apiError("Invalid webhook payload.", "INVALID_INPUT");
  }

  const event = payload && typeof payload === "object" ? (payload as { event?: unknown }).event : undefined;
  if (event !== "charge.success") {
    return apiSuccess({}, "Webhook ignored");
  }

  const reference = readReference(payload);
  if (!reference) {
    return apiSuccess({}, "Webhook ignored");
  }

  try {
    const result = await confirmPaystackReference(reference);
    if (!result.ok && result.status >= 500) {
      return apiError(result.message, result.code, result.status);
    }
  } catch (error) {
    logger.error("Paystack webhook confirmation failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return apiError("Webhook could not be processed.", "WEBHOOK_FAILED", 500);
  }

  return apiSuccess({}, "Webhook received");
}
