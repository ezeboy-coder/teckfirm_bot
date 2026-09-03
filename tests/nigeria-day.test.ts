import { describe, expect, it } from "vitest";
import { nigeriaDayRange } from "@/lib/time/nigeria";

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
