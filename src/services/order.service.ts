import { Prisma } from "@prisma/client";
import { hashRetrievalPin } from "@/lib/security/retrieval-pin";
import { isPaidMissingVoucher, isStalePendingOrder } from "@/lib/admin/order-status";
import { LOCATION_CONTROLLER_OFFLINE_MESSAGE } from "@/lib/locations/availability";
import { logger } from "@/lib/logger";
import {
  isFailedPaystackCharge,
  isSuccessfulPaystackCharge,
  paystackAmountMatchesOrder,
  sanitizePaystackPayload,
  verifyPaystackTransaction,
} from "@/lib/paystack";
import { PaystackError, PaystackNotConfiguredError } from "@/lib/paystack/errors";
import { guestCheckoutEmail } from "@/lib/utils/guest";
import { normalizeGuestPhone } from "@/lib/utils/phone";
import { generateOrderReference } from "@/lib/utils/reference";
import { getEnv } from "@/lib/validation/env";
import { toDurationMinutes } from "@/lib/utils/duration";
import { getLocationById } from "@/repositories/location.repository";
import {
  applyVerifiedPayment,
  attachVoucherToPaidOrder,
  completeManualPaidOrder,
  createGuestOrder,
  findOrderWithVoucher,
  listOpenPendingOrdersForLocation,
  markOpenOrderCancelled,
} from "@/repositories/order.repository";
import { getPlanById } from "@/repositories/plan.repository";
import { writeAuditLog } from "@/services/audit.service";
import { isLocationControllerLive } from "@/services/location.service";

export class CheckoutError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "CheckoutError";
  }
}

function isDemoLocation(name: string) {
  return name.toLowerCase().includes("demo");
}

export async function createGuestCheckout(input: {
  locationId: string;
  planId: string;
  phone: string;
  pin: string;
}) {
  const phone = normalizeGuestPhone(input.phone);
  if (!phone) {
    throw new CheckoutError("Enter an 11-digit phone number.", "INVALID_INPUT");
  }

  const location = await getLocationById(input.locationId);
  if (!location || !location.active || isDemoLocation(location.name)) {
    throw new CheckoutError("That location is not available.", "LOCATION_UNAVAILABLE");
  }
  if (!(await isLocationControllerLive(location))) {
    throw new CheckoutError(LOCATION_CONTROLLER_OFFLINE_MESSAGE, "LOCATION_OFFLINE", 409);
  }

  const plan = await getPlanById(input.planId);
  if (!plan || !plan.active) {
    throw new CheckoutError("That plan is not available.", "PLAN_UNAVAILABLE");
  }

  const amountKobo = plan.priceKobo;
  const guestPinHash = hashRetrievalPin(phone, input.pin, getEnv().AUTH_SECRET);
  const guestEmail = guestCheckoutEmail(phone);

  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await createGuestOrder({
        reference: generateOrderReference(),
        guestEmail,
        guestPhone: phone,
        guestPinHash,
        locationId: location.id,
        planId: plan.id,
        amountKobo,
      });
    } catch (error) {
      lastError = error;
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        continue;
      }
      throw error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Could not create order");
}

export async function cancelStalePendingOrder(input: {
  orderId: string;
  locationId: string;
  actorId: string;
}) {
  const order = await findOrderWithVoucher(input.orderId);
  if (!order || order.locationId !== input.locationId) {
    throw new Error("That order was not found at this location.");
  }
  if (
    !isStalePendingOrder({
      createdAt: order.createdAt,
      paymentStatus: order.paymentStatus,
      orderStatus: order.status,
      hasVoucher: Boolean(order.voucher),
    })
  ) {
    throw new Error("Wait until a pending order is at least 2 minutes old, then you can cancel it.");
  }

  const cancelled = await markOpenOrderCancelled({
    orderId: input.orderId,
    locationId: input.locationId,
    requireStale: true,
    gatewayResponse: "Cancelled by admin",
  });
  if (!cancelled) {
    throw new Error("This order is not a pending purchase that can be cancelled yet.");
  }

  await writeAuditLog({
    actorId: input.actorId,
    action: "order.manual_cancel",
    resource: "Order",
    resourceId: input.orderId,
    newData: { status: "CANCELLED" },
  });
}

export async function markStalePendingPaidWithVoucher(input: {
  orderId: string;
  locationId: string;
  voucherCode: string;
  actorId: string;
}) {
  const order = await findOrderWithVoucher(input.orderId);
  if (!order || order.locationId !== input.locationId) {
    throw new Error("That order was not found at this location.");
  }

  const plan = order.items[0]?.plan;
  if (!plan) {
    throw new Error("That order has no plan.");
  }
  if (
    !isStalePendingOrder({
      createdAt: order.createdAt,
      paymentStatus: order.paymentStatus,
      orderStatus: order.status,
      hasVoucher: Boolean(order.voucher),
    })
  ) {
    throw new Error("Wait until a pending order is at least 2 minutes old, then you can mark it paid.");
  }

  try {
    await completeManualPaidOrder({
      orderId: order.id,
      locationId: order.locationId,
      planId: plan.id,
      code: input.voucherCode,
      deviceLimit: plan.deviceLimit,
      dataAllowance: plan.dataAllowance,
      durationMinutes: toDurationMinutes(plan.duration, plan.durationUnit),
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("That voucher code is already recorded at this location.");
    }
    throw error;
  }

  await writeAuditLog({
    actorId: input.actorId,
    action: "order.manual_paid",
    resource: "Order",
    resourceId: order.id,
    newData: { status: "COMPLETED" },
  });
}

export async function attachIssuedVoucher(input: {
  orderId: string;
  locationId: string;
  voucherCode: string;
  actorId: string;
}) {
  const order = await findOrderWithVoucher(input.orderId);
  if (!order || order.locationId !== input.locationId) {
    throw new Error("That order was not found at this location.");
  }

  const plan = order.items[0]?.plan;
  if (!plan) {
    throw new Error("That order has no plan.");
  }
  if (
    !isPaidMissingVoucher(order.paymentStatus, order.status, Boolean(order.voucher))
  ) {
    throw new Error("This order is not a paid purchase that still needs a voucher.");
  }

  try {
    await attachVoucherToPaidOrder({
      orderId: order.id,
      locationId: order.locationId,
      planId: plan.id,
      code: input.voucherCode,
      deviceLimit: plan.deviceLimit,
      dataAllowance: plan.dataAllowance,
      durationMinutes: toDurationMinutes(plan.duration, plan.durationUnit),
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("That voucher code is already recorded at this location.");
    }
    throw error;
  }

  await writeAuditLog({
    actorId: input.actorId,
    action: "order.attach_voucher",
    resource: "Order",
    resourceId: order.id,
    newData: { status: "COMPLETED" },
  });
}

export type AdminPaymentSyncSummary = {
  checked: number;
  paid: number;
  failed: number;
  pending: number;
  manualReview: number;
  errors: number;
};

export async function syncLocationPendingPayments(input: {
  locationId: string;
  actorId: string;
}): Promise<AdminPaymentSyncSummary> {
  const orders = await listOpenPendingOrdersForLocation(input.locationId);
  const summary: AdminPaymentSyncSummary = {
    checked: orders.length,
    paid: 0,
    failed: 0,
    pending: 0,
    manualReview: 0,
    errors: 0,
  };

  for (const order of orders) {
    try {
      const outcome = await syncOnePendingOrderFromPaystack({
        orderId: order.id,
        reference: order.reference,
        totalKobo: order.totalKobo,
        actorId: input.actorId,
      });
      if (outcome === "paid") summary.paid += 1;
      else if (outcome === "failed") summary.failed += 1;
      else if (outcome === "manual_review") summary.manualReview += 1;
      else summary.pending += 1;
    } catch (error) {
      if (error instanceof PaystackNotConfiguredError) {
        throw error;
      }
      summary.errors += 1;
      logger.warn("Admin Paystack status refresh failed for order", {
        orderId: order.id,
        error: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  await writeAuditLog({
    actorId: input.actorId,
    action: "order.paystack_refresh",
    resource: "Location",
    resourceId: input.locationId,
    newData: summary,
  });

  return summary;
}

async function syncOnePendingOrderFromPaystack(input: {
  orderId: string;
  reference: string;
  totalKobo: number;
  actorId: string;
}): Promise<"paid" | "failed" | "pending" | "manual_review"> {
  let verified;
  try {
    verified = await verifyPaystackTransaction(input.reference);
  } catch (error) {
    if (error instanceof PaystackNotConfiguredError) {
      throw error;
    }
    logger.warn("Admin Paystack status check failed", {
      orderId: input.orderId,
      error: error instanceof PaystackError ? error.code : "unknown",
    });
    throw new Error("Could not read that payment status from Paystack right now.");
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

  if (isSuccessfulPaystackCharge(verified.status)) {
    if (!paystackAmountMatchesOrder(input.totalKobo, verified.amount, verified.currency)) {
      await applyVerifiedPayment({
        orderId: input.orderId,
        paymentStatus: "SUCCESS",
        orderStatus: "MANUAL_REVIEW",
        providerTransactionId,
        channel: verified.channel,
        gatewayResponse: verified.gatewayResponse,
        paidAt,
        sanitized,
      });
      return "manual_review";
    }

    await applyVerifiedPayment({
      orderId: input.orderId,
      paymentStatus: "SUCCESS",
      orderStatus: "PAID",
      providerTransactionId,
      channel: verified.channel,
      gatewayResponse: verified.gatewayResponse,
      paidAt,
      sanitized,
    });
    return "paid";
  }

  // Only hard Paystack failures become Failed. Ongoing/abandoned stay Pending.
  if (isFailedPaystackCharge(verified.status)) {
    await applyVerifiedPayment({
      orderId: input.orderId,
      paymentStatus: "FAILED",
      orderStatus: "FAILED",
      providerTransactionId,
      channel: verified.channel,
      gatewayResponse: verified.gatewayResponse,
      paidAt: null,
      sanitized,
    });
    return "failed";
  }

  return "pending";
}

export const orderService = {
  createGuestCheckout,
  cancelStalePendingOrder,
  markStalePendingPaidWithVoucher,
  attachIssuedVoucher,
  syncLocationPendingPayments,
};
