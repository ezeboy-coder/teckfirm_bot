"use client";

import { useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { peekIssuedVoucherAction } from "@/app/admin/order-actions";
import type { ResolvedVoucherPeek } from "@/lib/admin/voucher-peek";
import { copyTextToClipboard } from "@/lib/utils/clipboard";
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
      status: "No voucher is recorded for this payment yet.",
      code: null as string | null,
    };
  }
  if (peek.kind === "expired") {
    return {
      title: "Voucher status",
      status: "This voucher has expired.",
      code: null as string | null,
    };
  }
  return {
    title: "Issued voucher",
    status: peek.liveStatus === "in-use" ? "In use" : "Unused",
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
  const [copied, setCopied] = useState(false);

  function closePeek() {
    requestId.current += 1;
    setOpen(false);
    setLoading(false);
    setError(null);
    setPeek(null);
    setCopied(false);
  }

  async function copyVoucher(code: string) {
    const copiedCode = await copyTextToClipboard(code);
    if (!copiedCode) {
      toast.error("Couldn’t copy. Select the code instead.");
      return;
    }
    setCopied(true);
    toast.success("Voucher copied.");
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
                  : "Live voucher for this buyer."}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm">
            <span className="text-muted-foreground">Phone</span>
            <span className="mt-0.5 block font-medium">{contact}</span>
          </p>
          {copy && !loading && !error ? (
            <p className="text-sm">
              <span className="text-muted-foreground">Status</span>
              <span className="mt-0.5 block font-medium">{copy.status}</span>
            </p>
          ) : null}
          {copy?.code ? (
            <div className="flex items-center gap-2">
              <p className="font-mono text-2xl font-semibold tracking-widest">{copy.code}</p>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={copied ? "Voucher copied" : "Copy voucher"}
                onClick={() => {
                  if (copy.code) void copyVoucher(copy.code);
                }}
              >
                {copied ? <Check /> : <Copy />}
              </Button>
            </div>
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
