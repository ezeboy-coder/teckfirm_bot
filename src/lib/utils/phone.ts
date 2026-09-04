const NIGERIAN_PHONE_REGEX = /^(?:\+234|234|0)(70|80|81|90|91|71)\d{8}$/;
const ELEVEN_DIGITS = /^\d{11}$/;
const SUPPORT_PHONE_STORED = /^\+(\d{1,4})\s+(\d{6,12})$/;

export type SupportPhoneParts = {
  countryCode: string;
  nationalNumber: string;
};

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

/** Store support contact as `+{countryCode} {nationalNumber}` for stable admin round-trips. */
export function joinSupportPhone(countryCode: string, nationalNumber: string): string | null {
  const cc = countryCode.replace(/\D/g, "");
  let national = nationalNumber.replace(/\D/g, "");
  if (!cc || cc.length > 4 || national.length < 6 || national.length > 12) {
    return null;
  }
  if (national.startsWith("0") && national.length > 6) {
    national = national.slice(1);
  }
  const digits = `${cc}${national}`;
  if (digits.length < 10 || digits.length > 15) {
    return null;
  }
  return `+${cc} ${national}`;
}

/** Prefill admin country-code / number fields from the saved support contact. */
export function splitSupportPhone(input: string): SupportPhoneParts {
  const raw = input.trim();
  if (!raw) {
    return { countryCode: "", nationalNumber: "" };
  }

  const spaced = raw.match(SUPPORT_PHONE_STORED);
  if (spaced) {
    return { countryCode: spaced[1] ?? "", nationalNumber: spaced[2] ?? "" };
  }

  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("0")) {
    return { countryCode: "234", nationalNumber: digits.slice(1) };
  }
  if (digits.startsWith("234") && digits.length === 13) {
    return { countryCode: "234", nationalNumber: digits.slice(3) };
  }
  if (raw.startsWith("+") && digits.length >= 10 && digits.length <= 15) {
    // Prefer Nigeria when the digits match; otherwise treat first 1–3 as country code.
    if (digits.startsWith("234") && digits.length === 13) {
      return { countryCode: "234", nationalNumber: digits.slice(3) };
    }
    const ccLen = digits.startsWith("1") && digits.length === 11 ? 1 : Math.min(3, digits.length - 7);
    return {
      countryCode: digits.slice(0, Math.max(1, ccLen)),
      nationalNumber: digits.slice(Math.max(1, ccLen)),
    };
  }

  return { countryCode: "", nationalNumber: digits };
}

/** Digits-only international number for wa.me links (e.g. 2348012345678). */
export function toWhatsAppDigits(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  const fromSupport = raw.match(SUPPORT_PHONE_STORED);
  if (fromSupport) {
    const digits = `${fromSupport[1]}${fromSupport[2]}`;
    return /^\d{10,15}$/.test(digits) ? digits : null;
  }

  if (raw.startsWith("+")) {
    const digits = raw.replace(/\D/g, "");
    if (/^\d{10,15}$/.test(digits)) return digits;
  }

  const normalized = normalizeNigerianPhone(raw) ?? normalizeGuestPhone(raw);
  if (!normalized) {
    const digits = raw.replace(/\D/g, "");
    return /^\d{10,15}$/.test(digits) ? digits : null;
  }
  if (normalized.startsWith("+")) return normalized.slice(1);
  if (normalized.length === 11 && normalized.startsWith("0")) {
    return `234${normalized.slice(1)}`;
  }
  return /^\d{10,15}$/.test(normalized) ? normalized : null;
}

export function toWhatsAppUrl(input: string, text?: string): string | null {
  const digits = toWhatsAppDigits(input);
  if (!digits) return null;
  const url = new URL(`https://wa.me/${digits}`);
  if (text?.trim()) {
    url.searchParams.set("text", text.trim());
  }
  return url.toString();
}
