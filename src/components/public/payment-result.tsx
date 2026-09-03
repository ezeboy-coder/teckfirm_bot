"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PaymentResult({
  title,
  message,
  voucher,
}: {
  title: string;
  message: string;
  voucher?: { code: string; plan: string; location: string } | null;
}) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    if (!voucher) return;
    try {
      await navigator.clipboard.writeText(voucher.code);
      setCopied(true);
      toast.success("Voucher copied.");
    } catch {
      toast.error("Couldn’t copy. Select the code instead.");
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="font-heading text-2xl font-semibold">{title}</h1>
      <p className="mt-3 text-sm text-muted-foreground">{message}</p>
      {voucher ? (
        <div className="mt-6 rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-black/5">
          <p className="font-mono text-lg font-semibold tracking-wide">{voucher.code}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {voucher.plan} · {voucher.location}
          </p>
          <Button type="button" className="mt-3 h-10 w-full rounded-full" onClick={() => void copyCode()}>
            {copied ? "Copied" : "Copy code"}
          </Button>
        </div>
      ) : null}
      <Link href="/" className={cn(buttonVariants(), "mt-6 inline-flex h-12")}>
        Back to chat
      </Link>
    </div>
  );
}






