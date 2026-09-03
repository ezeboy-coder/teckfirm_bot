import type { OrderStatus, PaymentStatus } from "@prisma/client";

export const STALE_PENDING_MS = 2 * 60 * 1000;

const OPEN_ORDER_STATUSES: readonly OrderStatus[] = ["PENDING", "PAYMENT_PENDING"];
const OPEN_PAYMENT_STATUSES: readonly PaymentStatus[] = ["INITIALIZED", "PENDING"];

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
