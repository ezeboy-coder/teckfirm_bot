const PAYSTACK_INLINE_SRC = "https://js.paystack.co/v2/inline.js";

type PaystackResumeCallbacks = {
  onSuccess?: (transaction: { reference?: string }) => void;
  onCancel?: () => void;
  onError?: (error: unknown) => void;
};

type PaystackPopInstance = {
  resumeTransaction: (accessCode: string, callbacks?: PaystackResumeCallbacks) => void;
};

type PaystackPopConstructor = {
  new (): PaystackPopInstance;
};

declare global {
  interface Window {
    PaystackPop?: PaystackPopConstructor;
  }
}

function loadPaystackPop(): Promise<PaystackPopConstructor> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Paystack checkout is only available in the browser."));
  }
  if (window.PaystackPop) {
    return Promise.resolve(window.PaystackPop);
  }

  const existing = document.querySelector<HTMLScriptElement>(`script[src="${PAYSTACK_INLINE_SRC}"]`);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => {
        if (window.PaystackPop) resolve(window.PaystackPop);
        else reject(new Error("Paystack checkout failed to load."));
      });
      existing.addEventListener("error", () => reject(new Error("Paystack checkout failed to load.")));
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = PAYSTACK_INLINE_SRC;
    script.async = true;
    script.onload = () => {
      if (window.PaystackPop) resolve(window.PaystackPop);
      else reject(new Error("Paystack checkout failed to load."));
    };
    script.onerror = () => reject(new Error("Paystack checkout failed to load."));
    document.body.appendChild(script);
  });
}

export function openPaystackPopup(accessCode: string): Promise<"success" | "cancelled" | "failed"> {
  return loadPaystackPop().then(
    (PaystackPop) =>
      new Promise((resolve, reject) => {
        let settled = false;
        const finish = (outcome: "success" | "cancelled" | "failed") => {
          if (settled) return;
          settled = true;
          resolve(outcome);
        };

        try {
          const popup = new PaystackPop();
          popup.resumeTransaction(accessCode, {
            onSuccess: () => finish("success"),
            onCancel: () => finish("cancelled"),
            onError: () => finish("failed"),
          });
        } catch (error) {
          reject(error instanceof Error ? error : new Error("Paystack checkout could not open."));
        }
      }),
  );
}
