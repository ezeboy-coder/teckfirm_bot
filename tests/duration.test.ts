import { describe, expect, it } from "vitest";
import { toDurationMinutes } from "@/lib/utils/duration";

describe("plan duration in minutes", () => {
  it("converts hours and days", () => {
    expect(toDurationMinutes(30, "MINUTES")).toBe(30);
    expect(toDurationMinutes(2, "HOURS")).toBe(120);
    expect(toDurationMinutes(1, "DAYS")).toBe(1440);
    expect(toDurationMinutes(30, "DAYS")).toBe(43200);
  });
});
