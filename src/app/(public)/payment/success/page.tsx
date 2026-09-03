import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Payment successful" };

export default function PaymentSuccessPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="font-heading text-2xl font-semibold">Payment Successful</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        When Paystack verification is enabled, your WiFi voucher will appear in the chat.
      </p>
      <Link href="/" className={cn(buttonVariants(), "mt-6 inline-flex h-12")}>
        Back to chat
      </Link>
    </div>
  );
}
