"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col justify-center px-4 text-center">
      <h1 className="font-heading text-2xl font-semibold">We hit a snag</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        We couldn&apos;t complete that request. Your payment is safe if you already paid. Please try
        again.
      </p>
      <button
        type="button"
        className="mt-6 self-center rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
        onClick={reset}
      >
        Try again
      </button>
    </div>
  );
}
