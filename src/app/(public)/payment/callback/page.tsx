import { Suspense } from "react";
import type { Metadata } from "next";
import { PaymentCallbackClient } from "./payment-callback-client";

export const metadata: Metadata = { title: "Confirming payment" };

export default function PaymentCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <h1 className="font-heading text-2xl font-semibold">Confirming your payment...</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Checking with Paystack. We never treat a redirect as payment success on its own.
          </p>
        </div>
      }
    >
      <PaymentCallbackClient />
    </Suspense>
  );
}
