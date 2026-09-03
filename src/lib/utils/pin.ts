const RETRIEVAL_PIN_PATTERN = /^\d{5}$/;
const VOUCHER_CODE_PATTERN = /^\d{6}$/;

export function digitsOnly(value: string, maxLength: number): string {
  return value.replace(/\D/g, "").slice(0, maxLength);
}

export function isRetrievalPin(value: string): boolean {
  return RETRIEVAL_PIN_PATTERN.test(value.trim());
}

export function isVoucherCode(value: string): boolean {
  return VOUCHER_CODE_PATTERN.test(value.trim());
}
