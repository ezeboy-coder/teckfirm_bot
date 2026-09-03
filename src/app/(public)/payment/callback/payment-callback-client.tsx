"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CallbackVoucher = {
  code: string;
  status: string;
  plan: string;
  location: string;
};

export function PaymentCallbackClient() {
  const searchParams = useSearchParams();
  const reference = (searchParams.get("reference") ?? searchParams.get("trxref") ?? "").trim();
  const [result, setResult] = useState<{
    failed: boolean;
    pending: boolean;
    message: string;
    vouchers: CallbackVoucher[];
  } | null>(null);

  useEffect(() => {
    if (!reference) {
      return;
    }

    let cancelled = false;
    let attempts = 0;
    let timer: number | undefined;

    async function confirm() {
      attempts += 1;
      try {
        const response = await fetch(`/api/payments/paystack/verify/${encodeURIComponent(reference)}`);
        const payload = (await response.json()) as {
          success: boolean;
          message: string;
          data?: { vouchers?: CallbackVoucher[]; pending?: boolean };
        };
        if (cancelled) return;
        const vouchers = payload.data?.vouchers ?? [];
        const pending = Boolean(payload.success && (payload.data?.pending || vouchers.length === 0));
        setResult({
          failed: !payload.success,
          pending: payload.success && pending && vouchers.length === 0,
          message: payload.message,
          vouchers,
        });
        if (payload.success && pending && vouchers.length === 0 && attempts < 12) {
          timer = window.setTimeout(() => {
            void confirm();
          }, 2500);
        }
      } catch {
        if (!cancelled) {
          setResult({
            failed: true,
            pending: false,
            message: "Payment could not be confirmed right now.",
            vouchers: [],
          });
        }
      }
    }

    void confirm();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [reference]);

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Voucher copied.");
    } catch {
      toast.error("Couldn’t copy. Select the code instead.");
    }
  }

  const failed = !reference || (result?.failed ?? false);
  const pending = Boolean(result?.pending);
  const message = !reference
    ? "No payment reference was returned."
    : (result?.message ?? "Confirming your payment with Paystack…");
  const vouchers = result?.vouchers ?? [];
  const title = failed
    ? "Payment not confirmed"
    : vouchers.length
      ? "Your voucher"
      : pending
        ? "Your payment reference"
        : "Confirming payment";

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <h1 className="font-heading text-center text-2xl font-semibold">{title}</h1>
      <p className="mt-3 text-center text-sm text-muted-foreground">{message}</p>
      {pending && reference && vouchers.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-black/5">
          <p className="text-sm font-medium">Payment reference</p>
          <p className="mt-2 font-mono text-base font-semibold tracking-wide break-all">{reference}</p>
        </div>
      ) : null}
      <div className="mt-6 space-y-3">
        {vouchers.map((item) => (
          <div key={item.code} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <p className="font-mono text-lg font-semibold tracking-wide">{item.code}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {item.plan} · {item.location} · {item.status.toLowerCase()}
            </p>
            <Button type="button" className="mt-3 h-10 w-full rounded-full" onClick={() => copyCode(item.code)}>
              Copy code
            </Button>
          </div>
        ))}
      </div>
      <div className="mt-8 flex justify-center">
        <Link href="/" className={cn(buttonVariants(), "inline-flex h-12")}>
          Back to chat
        </Link>
      </div>
    </div>
  );
}
