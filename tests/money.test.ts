import { describe, expect, it } from "vitest";
import { formatNairaGrouping, formatNgnFromKobo, nairaToKobo, parseNairaInput } from "@/lib/utils/money";

describe("money", () => {
  it("stores ₦1,000 as 100000 kobo", () => {
    expect(nairaToKobo(1000)).toBe(100_000);
  });

  it("formats kobo as Nigerian Naira", () => {
    expect(formatNgnFromKobo(100_000)).toContain("1,000");
  });

  it("groups naira with commas while typing", () => {
    expect(formatNairaGrouping("1000")).toBe("1,000");
    expect(formatNairaGrouping("50000")).toBe("50,000");
    expect(formatNairaGrouping("1,234")).toBe("1,234");
  });

  it("parses grouped naira input", () => {
    expect(parseNairaInput("1,000")).toBe(1000);
    expect(parseNairaInput("50,000")).toBe(50_000);
  });
});
