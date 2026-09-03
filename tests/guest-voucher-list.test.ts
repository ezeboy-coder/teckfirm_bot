import { describe, expect, it } from "vitest";
import { keepLiveGuestVoucher } from "@/lib/omada/vouchers";

describe("My Vouchers live list", () => {
  it("keeps unused and in-use controller statuses", () => {
    expect(keepLiveGuestVoucher("unused")).toBe(true);
    expect(keepLiveGuestVoucher("in-use")).toBe(true);
  });

  it("drops expired vouchers and codes missing from the controller", () => {
    expect(keepLiveGuestVoucher("expired")).toBe(false);
    expect(keepLiveGuestVoucher(null)).toBe(false);
  });
});
