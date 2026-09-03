const LAGOS = "Africa/Lagos";

function lagosYmd(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: LAGOS,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
  };
}

/** Calendar day in West Africa Time (Africa/Lagos). */
export function nigeriaDayRange(now = new Date()) {
  const { year, month, day } = lagosYmd(now);
  const start = new Date(`${year}-${month}-${day}T00:00:00+01:00`);
  const next = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, next };
}

export function formatLagosDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-NG", {
    timeZone: LAGOS,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
