const NIGERIAN_PHONE_REGEX = /^(?:\+234|234|0)(70|80|81|90|91|71)\d{8}$/;
const ELEVEN_DIGITS = /^\d{11}$/;

export function normalizeGuestPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  return ELEVEN_DIGITS.test(digits) ? digits : null;
}

export function isElevenDigitCode(input: string): boolean {
  return normalizeGuestPhone(input) !== null;
}

export function normalizeNigerianPhone(input: string): string | null {
  const digits = input.replace(/[\s()-]/g, "");
  if (!NIGERIAN_PHONE_REGEX.test(digits)) {
    return null;
  }

  if (digits.startsWith("0")) {
    return `+234${digits.slice(1)}`;
  }

  if (digits.startsWith("234")) {
    return `+${digits}`;
  }

  return digits;
}

export function isNigerianPhone(input: string): boolean {
  return normalizeNigerianPhone(input) !== null;
}
