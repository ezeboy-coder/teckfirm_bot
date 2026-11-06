import { describe, expect, it } from "vitest";
import { nigeriaDayRange, nigeriaMonthRange } from "@/lib/time/nigeria";

describe("nigeria day range", () => {
  it("starts at midnight Lagos time", () => {
    const { start, next } = nigeriaDayRange(new Date("2026-08-26T12:00:00.000Z"));
    expect(start.toISOString()).toBe("2026-08-25T23:00:00.000Z");
    expect(next.toISOString()).toBe("2026-08-26T23:00:00.000Z");
  });

  it("rolls to the next Lagos date after midnight", () => {
    const { start } = nigeriaDayRange(new Date("2026-08-26T23:30:00.000Z"));
    expect(start.toISOString()).toBe("2026-08-26T23:00:00.000Z");
  });
});

describe("nigeria month range", () => {
  it("covers the Lagos calendar month", () => {
    const { start, next, year, month } = nigeriaMonthRange(new Date("2026-11-06T18:00:00.000Z"));
    expect(year).toBe("2026");
    expect(month).toBe("11");
    expect(start.toISOString()).toBe("2026-10-31T23:00:00.000Z");
    expect(next.toISOString()).toBe("2026-11-30T23:00:00.000Z");
  });

  it("rolls December into the next year", () => {
    const { start, next, year, month } = nigeriaMonthRange(new Date("2026-12-15T12:00:00.000Z"));
    expect(year).toBe("2026");
    expect(month).toBe("12");
    expect(start.toISOString()).toBe("2026-11-30T23:00:00.000Z");
    expect(next.toISOString()).toBe("2026-12-31T23:00:00.000Z");
  });
});
