import { describe, expect, it } from "vitest";
import { boughtDuringRange, countUniqueBuyers } from "@/lib/admin/buyers";

describe("unique buyers", () => {
  it("counts the same phone once", () => {
    expect(
      countUniqueBuyers([
        { id: "1", userId: null, guestPhone: "08030000000", guestEmail: null },
        { id: "2", userId: null, guestPhone: "08030000000", guestEmail: "a@example.com" },
      ]),
    ).toBe(1);
  });

  it("counts registered users separately from guests", () => {
    expect(
      countUniqueBuyers([
        { id: "1", userId: "user-1", guestPhone: null, guestEmail: null },
        { id: "2", userId: null, guestPhone: "08030000000", guestEmail: null },
      ]),
    ).toBe(2);
  });
});

describe("bought during range", () => {
  const start = new Date("2026-08-25T23:00:00.000Z");
  const next = new Date("2026-08-26T23:00:00.000Z");

  it("uses paidAt when present", () => {
    expect(
      boughtDuringRange({ paidAt: new Date("2026-08-26T10:00:00.000Z"), createdAt: start }, start, next),
    ).toBe(true);
  });

  it("excludes the next midnight", () => {
    expect(boughtDuringRange({ paidAt: next, createdAt: next }, start, next)).toBe(false);
  });
});
