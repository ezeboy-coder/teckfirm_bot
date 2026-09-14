const LAGOS = "Africa/Lagos";
const YMD = /^\d{4}-\d{2}-\d{2}$/;

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

export function formatLagosYmd(date = new Date()) {
  const { year, month, day } = lagosYmd(date);
  return `${year}-${month}-${day}`;
}

/** Start/end of a calendar day in West Africa Time (Africa/Lagos). End is exclusive. */
export function nigeriaYmdRange(ymd: string) {
  if (!YMD.test(ymd)) return null;
  const start = new Date(`${ymd}T00:00:00+01:00`);
  if (Number.isNaN(start.getTime())) return null;
  const next = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, next, ymd };
}

/** Calendar day in West Africa Time (Africa/Lagos). */
export function nigeriaDayRange(now = new Date()) {
  const range = nigeriaYmdRange(formatLagosYmd(now));
  if (!range) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return { start, next: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
  }
  return { start: range.start, next: range.next };
}

export function nigeriaYesterdayRange(now = new Date()) {
  const today = nigeriaDayRange(now);
  const start = new Date(today.start.getTime() - 24 * 60 * 60 * 1000);
  return { start, next: today.start, ymd: formatLagosYmd(start) };
}

export function formatLagosDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-NG", {
    timeZone: LAGOS,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
