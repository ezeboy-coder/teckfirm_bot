import { Prisma } from "@prisma/client";
import { hashRetrievalPin } from "@/lib/security/retrieval-pin";
import { LOCATION_CONTROLLER_OFFLINE_MESSAGE } from "@/lib/locations/availability";
import { guestCheckoutEmail } from "@/lib/utils/guest";
import { normalizeGuestPhone } from "@/lib/utils/phone";
import { generateOrderReference } from "@/lib/utils/reference";
import { getEnv } from "@/lib/validation/env";
import { toDurationMinutes } from "@/lib/utils/duration";
import { isPaidMissingVoucher, isStalePendingOrder } from "@/lib/admin/order-status";
import { getLocationById } from "@/repositories/location.repository";
import {
  attachVoucherToPaidOrder,
  completeManualPaidOrder,
  createGuestOrder,
  findOrderWithVoucher,
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

export const orderService = {
  createGuestCheckout,
  cancelStalePendingOrder,
  markStalePendingPaidWithVoucher,
  attachIssuedVoucher,
};
