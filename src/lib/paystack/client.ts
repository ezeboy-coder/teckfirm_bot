import { PaystackError, PaystackNotConfiguredError } from "@/lib/paystack/errors";
import { getEnv } from "@/lib/validation/env";

export const PAYSTACK_API_BASE = "https://api.paystack.co";

const REQUEST_TIMEOUT_MS = 20_000;

type PaystackEnvelope<T> = {
  status: boolean;
  message?: string;
  data?: T;
};

export function isPaystackConfigured(): boolean {
  return Boolean(getEnv().PAYSTACK_SECRET_KEY?.trim());
}

export function getPaystackSecretKey(): string {
  const key = getEnv().PAYSTACK_SECRET_KEY?.trim();
  if (!key) {
    throw new PaystackNotConfiguredError();
  }
  return key;
}

/** Paystack signs webhooks with the webhook secret when set, otherwise the secret key. */
export function getPaystackWebhookSecret(): string | undefined {
  const env = getEnv();
  return env.PAYSTACK_WEBHOOK_SECRET?.trim() || env.PAYSTACK_SECRET_KEY?.trim() || undefined;
}

export async function paystackFetch<T>(
  path: string,
  init: { method?: "GET" | "POST"; body?: unknown } = {},
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${PAYSTACK_API_BASE}${path}`, {
      method: init.method ?? "GET",
      headers: {
        Authorization: `Bearer ${getPaystackSecretKey()}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new PaystackError("Paystack timed out. Please try again.", "PAYSTACK_TIMEOUT");
    }
    throw new PaystackError("Could not reach Paystack.", "PAYSTACK_NETWORK");
  } finally {
    clearTimeout(timer);
  }

  const raw = await response.text();
  let parsed: PaystackEnvelope<T>;
  try {
    parsed = JSON.parse(raw) as PaystackEnvelope<T>;
  } catch {
    throw new PaystackError(
      `Paystack returned a non-JSON response (${response.status}).`,
      "PAYSTACK_BAD_RESPONSE",
    );
  }

  if (!response.ok || parsed.status !== true || parsed.data === undefined) {
    throw new PaystackError(
      parsed.message?.trim() || "Paystack request failed.",
      "PAYSTACK_REQUEST_FAILED",
    );
  }

  return parsed.data;
}
