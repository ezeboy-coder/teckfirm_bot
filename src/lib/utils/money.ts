const NAIRA_LOCALE = "en-NG";

export function koboToNaira(kobo: number): number {
  return kobo / 100;
}

export function nairaToKobo(naira: number): number {
  return Math.round(naira * 100);
}

export function formatNgnFromKobo(kobo: number): string {
  return new Intl.NumberFormat(NAIRA_LOCALE, {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(koboToNaira(kobo));
}

export function parseNairaInput(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value !== "string") return undefined;
  const digits = value.replace(/\D/g, "");
  if (!digits) return undefined;
  return Number(digits);
}

/** Groups naira as 1,000 while typing. */
export function formatNairaGrouping(value: string): string {
  const parsed = parseNairaInput(value);
  if (parsed === undefined) return "";
  return String(parsed).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function formatDuration(value: number, unit: "MINUTES" | "HOURS" | "DAYS"): string {
  const labels: Record<typeof unit, string> = {
    MINUTES: "Minute",
    HOURS: "Hour",
    DAYS: "Day",
  };
  const label = labels[unit];
  return `${value} ${label}${value === 1 ? "" : "s"}`;
}

export function formatDataAllowance(
  amount: number | null | undefined,
  unit: "MB" | "GB" | "UNLIMITED",
): string {
  if (unit === "UNLIMITED" || amount == null) {
    return "Unlimited data";
  }
  return `${amount} ${unit}`;
}
