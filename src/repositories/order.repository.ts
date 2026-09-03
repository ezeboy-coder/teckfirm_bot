import { STALE_PENDING_MS } from "@/lib/admin/order-status";
import { prisma } from "@/lib/db/prisma";
import type { OrderStatus, PaymentStatus, Prisma } from "@prisma/client";

export async function createGuestOrder(data: {
  reference: string;
  guestEmail: string;
  guestPhone: string;
  guestPinHash: string;
  locationId: string;
  planId: string;
  amountKobo: number;
}) {
  return prisma.order.create({
    data: {
      reference: data.reference,
      guestEmail: data.guestEmail,
      guestPhone: data.guestPhone,
      guestPinHash: data.guestPinHash,
      locationId: data.locationId,
      subtotalKobo: data.amountKobo,
      totalKobo: data.amountKobo,
      currency: "NGN",
      status: "PAYMENT_PENDING",
      paymentStatus: "INITIALIZED",
      items: {
        create: {
          planId: data.planId,
          locationId: data.locationId,
          quantity: 1,
          unitPriceKobo: data.amountKobo,
          lineTotalKobo: data.amountKobo,
        },
      },
      payments: {
        create: {
          provider: "PAYSTACK",
          providerReference: data.reference,
          amountKobo: data.amountKobo,
          currency: "NGN",
          status: "INITIALIZED",
        },
      },
      events: {
        create: {
          type: "CREATED",
          message: "Guest checkout started",
        },
      },
    },
    include: {
      items: { include: { plan: true } },
      payments: true,
      location: true,
      voucher: true,
    },
  });
}

export async function findOrderByReference(reference: string) {
  return prisma.order.findUnique({
    where: { reference },
    include: {
      items: { include: { plan: true } },
      payments: { where: { provider: "PAYSTACK" }, orderBy: { createdAt: "desc" } },
      location: true,
      voucher: true,
    },
  });
}

export async function markPaymentPending(orderId: string) {
  await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus: "PENDING" },
    }),
    prisma.payment.updateMany({
      where: { orderId, provider: "PAYSTACK" },
      data: { status: "PENDING" },
    }),
    prisma.orderEvent.create({
      data: {
        orderId,
        type: "PAYMENT_INITIALIZED",
        message: "Paystack checkout session created",
      },
    }),
  ]);
}

export async function markCheckoutFailed(orderId: string, message: string) {
  await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: { status: "FAILED", paymentStatus: "FAILED" },
    }),
    prisma.payment.updateMany({
      where: { orderId, provider: "PAYSTACK" },
      data: { status: "FAILED", gatewayResponse: message.slice(0, 240) },
    }),
    prisma.orderEvent.create({
      data: {
        orderId,
        type: "PAYMENT_FAILED",
        message: "Paystack checkout could not be started",
      },
    }),
  ]);
}

function paymentEvent(orderStatus: OrderStatus) {
  if (orderStatus === "PAID") {
    return { type: "PAYMENT_VERIFIED", message: "Payment verified with Paystack" };
  }
  if (orderStatus === "CANCELLED") {
    return { type: "PAYMENT_CANCELLED", message: "Payment was cancelled" };
  }
  return { type: "PAYMENT_FAILED", message: "Payment was not successful" };
}

export async function applyVerifiedPayment(input: {
  orderId: string;
  paymentStatus: PaymentStatus;
  orderStatus: "PAID" | "FAILED" | "MANUAL_REVIEW" | "CANCELLED";
  providerTransactionId: string | null;
  channel: string | null;
  gatewayResponse: string | null;
  paidAt: Date | null;
  sanitized: Prisma.InputJsonValue;
}) {
  if (input.orderStatus === "CANCELLED") {
    await markOpenOrderCancelled({
      orderId: input.orderId,
      providerTransactionId: input.providerTransactionId,
      channel: input.channel,
      gatewayResponse: input.gatewayResponse,
      sanitized: input.sanitized,
    });
    return;
  }

  const event = paymentEvent(input.orderStatus);
  await prisma.$transaction([
    prisma.order.update({
      where: { id: input.orderId },
      data: {
        status: input.orderStatus,
        paymentStatus: input.paymentStatus,
        paidAt: input.paidAt,
      },
    }),
    prisma.payment.updateMany({
      where: { orderId: input.orderId, provider: "PAYSTACK" },
      data: {
        status: input.paymentStatus,
        providerTransactionId: input.providerTransactionId ?? undefined,
        channel: input.channel,
        gatewayResponse: input.gatewayResponse,
        paidAt: input.paidAt,
        verifiedAt: new Date(),
        rawResponseSanitized: input.sanitized,
      },
    }),
    prisma.orderEvent.create({
      data: {
        orderId: input.orderId,
        type: event.type,
        message: event.message,
      },
    }),
  ]);
}

const OPEN_ORDER_FILTER = {
  paymentStatus: { in: ["INITIALIZED", "PENDING"] as PaymentStatus[] },
  status: { in: ["PENDING", "PAYMENT_PENDING"] as OrderStatus[] },
  voucher: { is: null },
};

export async function markOpenOrderCancelled(input: {
  orderId: string;
  locationId?: string;
  requireStale?: boolean;
  providerTransactionId?: string | null;
  channel?: string | null;
  gatewayResponse?: string | null;
  sanitized?: Prisma.InputJsonValue;
}) {
  const staleBefore = new Date(Date.now() - STALE_PENDING_MS);
  const claimed = await prisma.order.updateMany({
    where: {
      id: input.orderId,
      ...(input.locationId ? { locationId: input.locationId } : {}),
      ...(input.requireStale ? { createdAt: { lte: staleBefore } } : {}),
      ...OPEN_ORDER_FILTER,
    },
    data: {
      status: "CANCELLED",
      paymentStatus: "ABANDONED",
    },
  });

  if (claimed.count !== 1) {
    return false;
  }

  await prisma.$transaction([
    prisma.payment.updateMany({
      where: { orderId: input.orderId, provider: "PAYSTACK" },
      data: {
        status: "ABANDONED",
        providerTransactionId: input.providerTransactionId ?? undefined,
        channel: input.channel,
        gatewayResponse: input.gatewayResponse ?? "Cancelled",
        verifiedAt: new Date(),
        ...(input.sanitized !== undefined ? { rawResponseSanitized: input.sanitized } : {}),
      },
    }),
    prisma.orderEvent.create({
      data: {
        orderId: input.orderId,
        type: "PAYMENT_CANCELLED",
        message: "Payment was cancelled",
      },
    }),
  ]);

  return true;
}

export async function completeManualPaidOrder(input: {
  orderId: string;
  locationId: string;
  planId: string;
  code: string;
  deviceLimit: number;
  dataAllowance: number | null;
  durationMinutes: number;
}) {
  const staleBefore = new Date(Date.now() - STALE_PENDING_MS);
  const paidAt = new Date();

  await prisma.$transaction(async (tx) => {
    const claimed = await tx.order.updateMany({
      where: {
        id: input.orderId,
        locationId: input.locationId,
        createdAt: { lte: staleBefore },
        ...OPEN_ORDER_FILTER,
      },
      data: {
        status: "COMPLETED",
        paymentStatus: "SUCCESS",
        fulfillmentStatus: "COMPLETED",
        paidAt,
        fulfilledAt: paidAt,
        lastFulfillmentError: null,
      },
    });

    if (claimed.count !== 1) {
      throw new Error("This order can no longer be marked as paid.");
    }

    await tx.payment.updateMany({
      where: { orderId: input.orderId, provider: "PAYSTACK" },
      data: {
        status: "SUCCESS",
        paidAt,
        verifiedAt: paidAt,
        gatewayResponse: "Marked paid by admin",
      },
    });

    await tx.voucher.create({
      data: {
        orderId: input.orderId,
        locationId: input.locationId,
        planId: input.planId,
        code: input.code,
        status: "UNUSED",
        deviceLimit: input.deviceLimit,
        dataAllowance: input.dataAllowance,
        durationMinutes: input.durationMinutes,
      },
    });

    await tx.orderEvent.create({
      data: {
        orderId: input.orderId,
        type: "MANUAL_PAID",
        message: "Admin marked this order paid and recorded the issued voucher",
      },
    });
  });
}

export async function attachVoucherToPaidOrder(input: {
  orderId: string;
  locationId: string;
  planId: string;
  code: string;
  deviceLimit: number;
  dataAllowance: number | null;
  durationMinutes: number;
}) {
  const fulfilledAt = new Date();

  await prisma.$transaction(async (tx) => {
    const claimed = await tx.order.updateMany({
      where: {
        id: input.orderId,
        locationId: input.locationId,
        paymentStatus: "SUCCESS",
        status: { in: ["PAID", "FULFILLING", "MANUAL_REVIEW"] },
        voucher: { is: null },
      },
      data: {
        status: "COMPLETED",
        fulfillmentStatus: "COMPLETED",
        fulfilledAt,
        lastFulfillmentError: null,
      },
    });

    if (claimed.count !== 1) {
      throw new Error("This order already has a voucher or is not paid.");
    }

    await tx.voucher.create({
      data: {
        orderId: input.orderId,
        locationId: input.locationId,
        planId: input.planId,
        code: input.code,
        status: "UNUSED",
        deviceLimit: input.deviceLimit,
        dataAllowance: input.dataAllowance,
        durationMinutes: input.durationMinutes,
      },
    });

    await tx.orderEvent.create({
      data: {
        orderId: input.orderId,
        type: "VOUCHER_ISSUED",
        message: "Admin recorded the issued voucher",
      },
    });
  });
}

export async function claimOrderForFulfillment(orderId: string) {
  const claimed = await prisma.order.updateMany({
    where: {
      id: orderId,
      paymentStatus: "SUCCESS",
      status: { in: ["PAID", "FULFILLING"] },
      fulfillmentStatus: { in: ["NOT_STARTED", "RETRY_PENDING"] },
      voucher: { is: null },
    },
    data: {
      status: "FULFILLING",
      fulfillmentStatus: "PROCESSING",
      fulfillmentAttempts: { increment: 1 },
    },
  });

  return claimed.count === 1;
}

export async function completeFulfillment(input: {
  orderId: string;
  locationId: string;
  planId: string;
  code: string;
  omadaVoucherId: string;
  omadaSiteId: string | null;
  expiresAt: Date | null;
  deviceLimit: number;
  dataAllowance: number | null;
  durationMinutes: number;
}) {
  await prisma.$transaction([
    prisma.voucher.create({
      data: {
        orderId: input.orderId,
        locationId: input.locationId,
        planId: input.planId,
        code: input.code,
        omadaVoucherId: input.omadaVoucherId,
        omadaSiteId: input.omadaSiteId,
        status: "UNUSED",
        expiresAt: input.expiresAt,
        deviceLimit: input.deviceLimit,
        dataAllowance: input.dataAllowance,
        durationMinutes: input.durationMinutes,
      },
    }),
    prisma.order.update({
      where: { id: input.orderId },
      data: {
        status: "COMPLETED",
        fulfillmentStatus: "COMPLETED",
        fulfilledAt: new Date(),
        lastFulfillmentError: null,
      },
    }),
    prisma.orderEvent.create({
      data: {
        orderId: input.orderId,
        type: "VOUCHER_ISSUED",
        message: "Voucher issued",
      },
    }),
  ]);
}

export async function failFulfillment(orderId: string) {
  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "PAID",
      fulfillmentStatus: "RETRY_PENDING",
      lastFulfillmentError: "Voucher could not be issued",
      nextRetryAt: new Date(Date.now() + 60_000),
    },
  });
}

export async function findOrderWithVoucher(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      voucher: true,
      items: { include: { plan: true } },
      location: true,
    },
  });
}
