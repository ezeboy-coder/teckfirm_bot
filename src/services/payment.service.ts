import { logger } from "@/lib/logger";
import {
  isPaystackConfigured,
  initializePaystackTransaction,
  verifyPaystackTransaction,
} from "@/lib/paystack";
import { PaystackError, PaystackNotConfiguredError } from "@/lib/paystack/errors";
import { sanitizePaystackPayload } from "@/lib/paystack/sanitize";
import {
  isFailedPaystackCharge,
  isSuccessfulPaystackCharge,
  paystackAmountMatchesOrder,
} from "@/lib/paystack/status";
import { displayName } from "@/lib/utils/display";
import { guestCheckoutEmail } from "@/lib/utils/guest";
import {
  applyVerifiedPayment,
  findOrderByReference,
  findOrderWithVoucher,
  markCheckoutFailed,
  markOpenOrderCancelled,
  markPaymentPending,
} from "@/repositories/order.repository";
import { fulfillPaidOrder } from "@/services/fulfillment.service";
import { CheckoutError, createGuestCheckout } from "@/services/order.service";

export type IssuedVoucher = {
  code: string;
  status: string;
  plan: string;
  location: string;
};

export type ConfirmPaymentResult =
  | { ok: true; vouchers: IssuedVoucher[]; pending: boolean }
  | { ok: false; message: string; code: string; status: number };

function toIssuedVoucher(order: {
  voucher: { code: string; status: string } | null;
  items: { plan: { name: string } }[];
  location: { name: string };
}): IssuedVoucher | null {
  if (!order.voucher) return null;
  return {
    code: order.voucher.code,
    status: order.voucher.status,
    plan: order.items[0]?.plan.name ?? "WiFi plan",
    location: displayName(order.location.name),
  };
}

async function vouchersForOrder(orderId: string): Promise<{ vouchers: IssuedVoucher[]; pending: boolean }> {
  const order = await findOrderWithVoucher(orderId);
  if (!order) {
    return { vouchers: [], pending: true };
  }
  const voucher = toIssuedVoucher(order);
  return {
    vouchers: voucher ? [voucher] : [],
    pending: !voucher,
  };
}

export async function initializeGuestPayment(input: {
  locationId: string;
  planId: string;
  phone: string;
  pin: string;
}) {
  if (!isPaystackConfigured()) {
    throw new PaystackNotConfiguredError();
  }

  const order = await createGuestCheckout(input);

  try {
    const initialized = await initializePaystackTransaction({
      email: order.guestEmail ?? guestCheckoutEmail(order.guestPhone ?? ""),
      amountKobo: order.totalKobo,
      reference: order.reference,
      metadata: {
        orderId: order.id,
        locationId: order.locationId,
        planId: order.items[0]?.planId ?? "",
      },
    });
    await markPaymentPending(order.id);
    return {
      accessCode: initialized.accessCode,
      reference: initialized.reference,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Paystack checkout could not be started";
    await markCheckoutFailed(order.id, message);
    throw error;
  }
}

export async function confirmPaystackReference(reference: string): Promise<ConfirmPaymentResult> {
  const order = await findOrderByReference(reference);
  if (!order) {
    return {
      ok: false,
      message: "No payment was found for that reference.",
      code: "ORDER_NOT_FOUND",
      status: 404,
    };
  }

  const existingVoucher = toIssuedVoucher(order);
  if (existingVoucher) {
    return { ok: true, vouchers: [existingVoucher], pending: false };
  }

  if (order.status === "MANUAL_REVIEW") {
    return {
      ok: false,
      message: "This payment needs a manual check. Contact support with your reference.",
      code: "MANUAL_REVIEW",
      status: 409,
    };
  }

  if (order.paymentStatus === "SUCCESS" && (order.status === "PAID" || order.status === "FULFILLING" || order.status === "COMPLETED")) {
    const fulfillment = await fulfillPaidOrder(order.id);
    const issued = await vouchersForOrder(order.id);
    return {
      ok: true,
      vouchers: issued.vouchers,
      pending: fulfillment !== "issued" && issued.pending,
    };
  }

  let verified;
  try {
    verified = await verifyPaystackTransaction(reference);
  } catch (error) {
    if (error instanceof PaystackNotConfiguredError) {
      return { ok: false, message: error.message, code: error.code, status: 503 };
    }
    logger.warn("Paystack verification failed", {
      orderId: order.id,
      error: error instanceof PaystackError ? error.code : "unknown",
    });
    return {
      ok: false,
      message: "Payment could not be confirmed right now.",
      code: "PAYSTACK_VERIFY_FAILED",
      status: 502,
    };
  }

  const sanitized = sanitizePaystackPayload({
    status: verified.status,
    amount: verified.amount,
    currency: verified.currency,
    reference: verified.reference,
    channel: verified.channel,
    paid_at: verified.paidAt,
  });
  const providerTransactionId = verified.id !== null ? String(verified.id) : null;
  const paidAt = verified.paidAt ? new Date(verified.paidAt) : new Date();

  if (!isSuccessfulPaystackCharge(verified.status)) {
    if (isFailedPaystackCharge(verified.status)) {
      await applyVerifiedPayment({
        orderId: order.id,
        paymentStatus: "FAILED",
        orderStatus: "FAILED",
        providerTransactionId,
        channel: verified.channel,
        gatewayResponse: verified.gatewayResponse,
        paidAt: null,
        sanitized,
      });
      return {
        ok: false,
        message: "Payment was not successful. No voucher was issued.",
        code: "PAYMENT_NOT_SUCCESS",
        status: 402,
      };
    }
    return { ok: true, vouchers: [], pending: true };
  }

  if (!paystackAmountMatchesOrder(order.totalKobo, verified.amount, verified.currency)) {
    logger.warn("Paystack amount did not match order", {
      orderId: order.id,
      expectedKobo: order.totalKobo,
      receivedKobo: verified.amount,
    });
    await applyVerifiedPayment({
      orderId: order.id,
      paymentStatus: "SUCCESS",
      orderStatus: "MANUAL_REVIEW",
      providerTransactionId,
      channel: verified.channel,
      gatewayResponse: verified.gatewayResponse,
      paidAt,
      sanitized,
    });
    return {
      ok: false,
      message: "This payment needs a manual check. Contact support with your reference.",
      code: "AMOUNT_MISMATCH",
      status: 409,
    };
  }

  await applyVerifiedPayment({
    orderId: order.id,
    paymentStatus: "SUCCESS",
    orderStatus: "PAID",
    providerTransactionId,
    channel: verified.channel,
    gatewayResponse: verified.gatewayResponse,
    paidAt,
    sanitized,
  });

  const fulfillment = await fulfillPaidOrder(order.id);
  const issued = await vouchersForOrder(order.id);
  return {
    ok: true,
    vouchers: issued.vouchers,
    pending: fulfillment !== "issued" && issued.pending,
  };
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function cancelPendingCheckout(reference: string): Promise<ConfirmPaymentResult> {
  const confirmed = await confirmPaystackReference(reference);
  if (!confirmed.ok) return confirmed;
  if (confirmed.vouchers.length > 0 || !confirmed.pending) {
    return confirmed;
  }

  await wait(2500);
  const again = await confirmPaystackReference(reference);
  if (!again.ok) return again;
  if (again.vouchers.length > 0 || !again.pending) {
    return again;
  }

  const order = await findOrderByReference(reference);
  if (!order) {
    return {
      ok: false,
      message: "No payment was found for that reference.",
      code: "ORDER_NOT_FOUND",
      status: 404,
    };
  }

  if (order.voucher || order.paymentStatus === "SUCCESS") {
    return confirmPaystackReference(reference);
  }

  if (order.status === "CANCELLED" || order.paymentStatus === "ABANDONED") {
    return { ok: true, vouchers: [], pending: false };
  }

  const cancelled = await markOpenOrderCancelled({
    orderId: order.id,
    gatewayResponse: "Cancelled by customer after Paystack verification",
  });

  if (!cancelled) {
    return confirmPaystackReference(reference);
  }

  return { ok: true, vouchers: [], pending: false };
}

export const paymentService = {
  initializeGuestPayment,
  confirmPaystackReference,
  cancelPendingCheckout,
};

export { CheckoutError };
