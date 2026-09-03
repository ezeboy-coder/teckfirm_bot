import { paystackFetch } from "@/lib/paystack/client";
import { PaystackError } from "@/lib/paystack/errors";
import type { PaystackVerifyResult } from "@/lib/paystack/types";

type PaystackVerifyData = {
  status?: string;
  amount?: number;
  currency?: string;
  reference?: string;
  id?: number;
  channel?: string;
  paid_at?: string;
  gateway_response?: string;
};

export async function verifyPaystackTransaction(reference: string): Promise<PaystackVerifyResult> {
  const data = await paystackFetch<PaystackVerifyData>(
    `/transaction/verify/${encodeURIComponent(reference)}`,
  );

  if (typeof data.status !== "string" || typeof data.amount !== "number" || typeof data.reference !== "string") {
    throw new PaystackError("Paystack verification returned an incomplete charge.", "PAYSTACK_BAD_RESPONSE");
  }

  return {
    status: data.status,
    amount: data.amount,
    currency: typeof data.currency === "string" ? data.currency : "",
    reference: data.reference,
    id: typeof data.id === "number" ? data.id : null,
    channel: typeof data.channel === "string" ? data.channel : null,
    paidAt: typeof data.paid_at === "string" ? data.paid_at : null,
    gatewayResponse: typeof data.gateway_response === "string" ? data.gateway_response : null,
  };
}
