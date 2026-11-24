"use client";

import { useRef, useState } from "react";
import { peekIssuedVoucherAction } from "@/app/admin/order-actions";
import type { ResolvedVoucherPeek } from "@/lib/admin/voucher-peek";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function peekCopy(peek: ResolvedVoucherPeek) {
  if (peek.kind === "missing") {
    return {
      title: "Issued voucher",
      body: "No voucher is recorded for this payment yet.",
      code: null as string | null,
    };
  }
  if (peek.kind === "expired") {
    return {
      title: "Voucher status",
      body: "This voucher has expired.",
      code: null as string | null,
    };
  }
  const live = peek.liveStatus === "in-use" ? "In use" : "Unused";
  return {
    title: "Issued voucher",
    body: `Status: ${live}`,
    code: peek.code,
  };
}

export function BuyerVoucherPeek({
  orderId,
  locationId,
  buyer,
  contact,
  paymentConfirmed,
}: {
  orderId: string;
  locationId: string;
  buyer: string;
  contact: string;
  paymentConfirmed: boolean;
}) {
  const requestId = useRef(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [peek, setPeek] = useState<ResolvedVoucherPeek | null>(null);

  function closePeek() {
    requestId.current += 1;
    setOpen(false);
    setLoading(false);
    setError(null);
    setPeek(null);
  }

  async function openPeek() {
    const id = requestId.current + 1;
    requestId.current = id;
    setOpen(true);
    setLoading(true);
    setError(null);
    setPeek(null);

    const result = await peekIssuedVoucherAction({ orderId, locationId });
    if (requestId.current !== id) {
      return;
    }

    setLoading(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setPeek(result.peek);
  }

  const copy = peek ? peekCopy(peek) : null;

  return (
    <>
      <span className="block">{buyer}</span>
      {paymentConfirmed ? (
        <button
          type="button"
          className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          onClick={() => void openPeek()}
        >
          {contact}
        </button>
      ) : (
        <span className="text-xs text-muted-foreground">{contact}</span>
      )}
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) closePeek();
        }}
      >
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>{copy?.title ?? "Issued voucher"}</DialogTitle>
            <DialogDescription>
              {loading
                ? "Checking this payment’s voucher…"
                : error
                  ? error
                  : (copy?.body ?? "Could not load that voucher.")}
            </DialogDescription>
          </DialogHeader>
          {copy?.code ? (
            <p className="font-mono text-2xl font-semibold tracking-widest">{copy.code}</p>
          ) : null}
          <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" onClick={closePeek}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
