import { paystackFetch } from "@/lib/paystack/client";
import { PaystackError } from "@/lib/paystack/errors";
import type { PaystackInitializeInput, PaystackInitializeResult } from "@/lib/paystack/types";

type PaystackInitializeData = {
  authorization_url?: string;
  access_code?: string;
  reference?: string;
};

export async function initializePaystackTransaction(
  input: PaystackInitializeInput,
): Promise<PaystackInitializeResult> {
  const data = await paystackFetch<PaystackInitializeData>("/transaction/initialize", {
    method: "POST",
    body: {
      email: input.email,
      amount: input.amountKobo,
      currency: "NGN",
      reference: input.reference,
      ...(input.callbackUrl ? { callback_url: input.callbackUrl } : {}),
      metadata: input.metadata,
    },
  });

  if (!data.access_code || !data.reference) {
    throw new PaystackError("Paystack did not return a checkout session.", "PAYSTACK_INITIALIZE_FAILED");
  }

  return {
    authorizationUrl: data.authorization_url ?? "",
    reference: data.reference,
    accessCode: data.access_code,
  };
}
