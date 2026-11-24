import { describe, expect, it } from "vitest";
import { resolveLiveVoucherPeek } from "@/lib/admin/voucher-peek";

describe("resolveLiveVoucherPeek", () => {
  it("shows the issued code from the live controller status", () => {
    expect(
      resolveLiveVoucherPeek({
        code: "123456",
        live: { status: "unused" },
      }),
    ).toEqual({ kind: "issued", code: "123456", liveStatus: "unused" });
  });

  it("marks expired when the controller says expired", () => {
    expect(
      resolveLiveVoucherPeek({
        code: "123456",
        live: { status: "expired" },
      }),
    ).toEqual({ kind: "expired" });
  });

  it("marks expired when the voucher is gone from the controller", () => {
    expect(
      resolveLiveVoucherPeek({
        code: "123456",
        live: { missing: true },
      }),
    ).toEqual({ kind: "expired" });
  });

  it("reports missing when payment has no voucher to check", () => {
    expect(
      resolveLiveVoucherPeek({
        code: null,
        live: null,
      }),
    ).toEqual({ kind: "missing" });
  });
});
