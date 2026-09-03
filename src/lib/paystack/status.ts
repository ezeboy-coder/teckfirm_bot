export function isSuccessfulPaystackCharge(status: string): boolean {
  return status.toLowerCase() === "success";
}

export function isFailedPaystackCharge(status: string): boolean {
  const normalized = status.toLowerCase();
  return normalized === "failed" || normalized === "reversed";
}

export function isCancelledPaystackCharge(status: string): boolean {
  const normalized = status.toLowerCase();
  return normalized === "abandoned" || normalized === "cancelled";
}

export function isPendingPaystackCharge(status: string): boolean {
  return !isSuccessfulPaystackCharge(status) && !isFailedPaystackCharge(status);
}

export function paystackAmountMatchesOrder(orderKobo: number, paystackAmountKobo: number, currency: string) {
  return orderKobo === paystackAmountKobo && currency.toUpperCase() === "NGN";
}
