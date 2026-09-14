import {
  formatLagosYmd,
  nigeriaDayRange,
  nigeriaYesterdayRange,
  nigeriaYmdRange,
} from "@/lib/time/nigeria";

export const ACTIVITY_DATE_PRESETS = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "custom", label: "Custom" },
] as const;

export type ActivityDatePreset = (typeof ACTIVITY_DATE_PRESETS)[number]["value"];

export type ActivityDateFilter = {
  preset: ActivityDatePreset;
  /** YYYY-MM-DD for custom (and resolved day for today/yesterday). */
  on: string | null;
  start: Date | null;
  next: Date | null;
};

export function parseActivityDateFilter(input: {
  when?: string | null;
  on?: string | null;
  now?: Date;
}): ActivityDateFilter {
  const now = input.now ?? new Date();
  const when = ACTIVITY_DATE_PRESETS.find((item) => item.value === input.when)?.value ?? "all";

  if (when === "today") {
    const { start, next } = nigeriaDayRange(now);
    return { preset: "today", on: formatLagosYmd(now), start, next };
  }

  if (when === "yesterday") {
    const { start, next, ymd } = nigeriaYesterdayRange(now);
    return { preset: "yesterday", on: ymd, start, next };
  }

  if (when === "custom") {
    const custom = input.on?.trim() ? nigeriaYmdRange(input.on.trim()) : null;
    if (!custom) {
      return { preset: "custom", on: input.on?.trim() || null, start: null, next: null };
    }
    return { preset: "custom", on: custom.ymd, start: custom.start, next: custom.next };
  }

  return { preset: "all", on: null, start: null, next: null };
}
