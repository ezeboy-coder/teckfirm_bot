import type { DurationUnit } from "@prisma/client";

export function toDurationMinutes(duration: number, unit: DurationUnit): number {
  if (unit === "HOURS") return duration * 60;
  if (unit === "DAYS") return duration * 24 * 60;
  return duration;
}
