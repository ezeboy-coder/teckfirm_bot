import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Payment failed" };

export default function PaymentFailedPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="font-heading text-2xl font-semibold">Payment did not complete</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        No voucher is issued unless payment is verified. You can try again from the chat.
      </p>
      <div className="mt-6 flex justify-center">
        <Link href="/" className={cn(buttonVariants(), "h-12")}>
          Back to chat
        </Link>
      </div>
    </div>
  );
}
