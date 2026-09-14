import type { OrderStatus, PaymentStatus, Prisma } from "@prisma/client";

export const STALE_PENDING_MS = 2 * 60 * 1000;

const OPEN_ORDER_STATUSES: readonly OrderStatus[] = ["PENDING", "PAYMENT_PENDING"];
const OPEN_PAYMENT_STATUSES: readonly PaymentStatus[] = ["INITIALIZED", "PENDING"];

export const ACTIVITY_STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
  { value: "needs_review", label: "Needs review" },
] as const;

export type ActivityStatusFilter = (typeof ACTIVITY_STATUS_FILTERS)[number]["value"];

export function parseActivityStatusFilter(value: string | undefined | null): ActivityStatusFilter {
  const match = ACTIVITY_STATUS_FILTERS.find((item) => item.value === value);
  return match?.value ?? "all";
}

/** Prisma where clause matching `activityStatusLabel` buckets. */
export function activityStatusFilterWhere(
  filter: ActivityStatusFilter,
): Prisma.OrderWhereInput | undefined {
  if (filter === "all") return undefined;
  if (filter === "cancelled") {
    return {
      OR: [{ status: "CANCELLED" }, { paymentStatus: "ABANDONED" }],
    };
  }
  if (filter === "paid") {
    return {
      paymentStatus: "SUCCESS",
      status: { notIn: ["CANCELLED"] },
    };
  }
  if (filter === "failed") {
    return {
      AND: [
        { status: { not: "CANCELLED" } },
        { paymentStatus: { notIn: ["ABANDONED", "SUCCESS"] } },
        { OR: [{ status: "FAILED" }, { paymentStatus: "FAILED" }] },
      ],
    };
  }
  if (filter === "refunded") {
    return {
      AND: [
        { status: { not: "CANCELLED" } },
        { paymentStatus: { notIn: ["ABANDONED", "SUCCESS", "FAILED"] } },
        {
          OR: [{ status: "REFUNDED" }, { paymentStatus: { in: ["REFUNDED", "REVERSED"] } }],
        },
      ],
    };
  }
  if (filter === "needs_review") {
    return {
      status: "MANUAL_REVIEW",
      paymentStatus: { notIn: ["ABANDONED", "SUCCESS", "FAILED", "REFUNDED", "REVERSED"] },
    };
  }
  return {
    status: { notIn: ["CANCELLED", "FAILED", "REFUNDED", "MANUAL_REVIEW"] },
    paymentStatus: { notIn: ["ABANDONED", "SUCCESS", "FAILED", "REFUNDED", "REVERSED"] },
  };
}

export function isOpenPendingPayment(
  paymentStatus: PaymentStatus,
  orderStatus: OrderStatus,
  hasVoucher = false,
): boolean {
  if (hasVoucher) return false;
  return (
    OPEN_PAYMENT_STATUSES.includes(paymentStatus) && OPEN_ORDER_STATUSES.includes(orderStatus)
  );
}

export function isPaidMissingVoucher(
  paymentStatus: PaymentStatus,
  orderStatus: OrderStatus,
  hasVoucher = false,
): boolean {
  if (hasVoucher) return false;
  if (paymentStatus !== "SUCCESS") return false;
  return orderStatus !== "CANCELLED" && orderStatus !== "REFUNDED" && orderStatus !== "FAILED";
}

export function isStalePendingOrder(input: {
  createdAt: Date;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  hasVoucher?: boolean;
  now?: number;
}): boolean {
  if (!isOpenPendingPayment(input.paymentStatus, input.orderStatus, input.hasVoucher ?? false)) {
    return false;
  }
  return (input.now ?? Date.now()) - input.createdAt.getTime() >= STALE_PENDING_MS;
}

export function activityStatusLabel(orderStatus: OrderStatus, paymentStatus: PaymentStatus): string {
  if (orderStatus === "CANCELLED" || paymentStatus === "ABANDONED") return "Cancelled";
  if (paymentStatus === "SUCCESS") return "Paid";
  if (orderStatus === "FAILED" || paymentStatus === "FAILED") return "Failed";
  if (orderStatus === "REFUNDED" || paymentStatus === "REFUNDED" || paymentStatus === "REVERSED") {
    return "Refunded";
  }
  if (orderStatus === "MANUAL_REVIEW") return "Needs review";
  return "Pending";
}
