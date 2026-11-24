import type { OmadaVoucherStatus } from "@/lib/omada/vouchers";

export type ResolvedVoucherPeek =
  | { kind: "missing" }
  | { kind: "expired" }
  | { kind: "issued"; code: string; liveStatus: OmadaVoucherStatus };

export function resolveLiveVoucherPeek(input: {
  code: string | null;
  live: { status: OmadaVoucherStatus } | { missing: true } | null;
}): ResolvedVoucherPeek {
  if (!input.code) {
    return { kind: "missing" };
  }
  if (!input.live || "missing" in input.live) {
    return { kind: "expired" };
  }
  if (input.live.status === "expired") {
    return { kind: "expired" };
  }
  return { kind: "issued", code: input.code, liveStatus: input.live.status };
}
