import type { Prisma } from "@prisma/client";

export function sanitizePaystackPayload(payload: unknown): Prisma.InputJsonValue {
  if (!payload || typeof payload !== "object") {
    return {};
  }

  const record = payload as Record<string, unknown>;
  return {
    status: typeof record.status === "string" ? record.status : null,
    amount: typeof record.amount === "number" ? record.amount : null,
    currency: typeof record.currency === "string" ? record.currency : null,
    reference: typeof record.reference === "string" ? record.reference : null,
    channel: typeof record.channel === "string" ? record.channel : null,
    paid_at: typeof record.paid_at === "string" ? record.paid_at : null,
  };
}
