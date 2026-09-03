"use client";

import { useEffect } from "react";

export function PaymentPendingRefresh() {
  useEffect(() => {
    const id = window.setTimeout(() => {
      window.location.reload();
    }, 2500);
    return () => window.clearTimeout(id);
  }, []);

  return null;
}
