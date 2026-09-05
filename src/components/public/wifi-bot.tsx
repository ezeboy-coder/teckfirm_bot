"use client";

import { useEffect, useRef, useState } from "react";
import { Wifi } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { LOCATION_CONTROLLER_OFFLINE_MESSAGE } from "@/lib/locations/availability";
import { displayName } from "@/lib/utils/display";
import {
  formatDuration,
  formatNgnFromKobo,
} from "@/lib/utils/money";
import { isElevenDigitCode, toWhatsAppUrl } from "@/lib/utils/phone";
import { isUnlimitedDeviceLimit } from "@/lib/plans/terms";
import { digitsOnly, isRetrievalPin, isVoucherCode } from "@/lib/utils/pin";
import { openPaystackPopup } from "@/lib/paystack/popup";
import { paymentEnquiryWhatsAppText } from "@/lib/utils/support-message";
import { WhatsAppIcon } from "@/components/public/whatsapp-icon";
import type { PublicLocation, PublicPlan } from "@/types/catalog";

type Choice = {
  id: FlowId;
  label: string;
};

type ChatMessage = {
  id: string;
  role: "bot" | "user";
  text: string;
};

type FlowId = "buy" | "codes" | "check";

type Stage = "menu" | "location" | "plan" | "details" | "pay" | "codes" | "check" | "result";

type LookupVoucher = {
  code: string;
  status: "unused" | "in-use";
  plan: string;
  location: string;
};

type ResultCard =
  | { kind: "codes"; message: string; vouchers: LookupVoucher[] }
  | { kind: "purchase"; message: string; vouchers: LookupVoucher[] }
  | {
      kind: "pay-pending";
      message: string;
      reference: string;
      supportPhone: string | null;
      locationName: string | null;
      planName: string | null;
      amountKobo: number | null;
      phone: string | null;
    }
  | {
      kind: "check";
      message: string;
      code: string;
      status: "unused" | "in-use" | "expired";
      location: string;
      traffic: string;
      duration: string;
      devices: string;
      expiresAt: string | null;
    };

function voucherStatusClass(status: "unused" | "in-use" | "expired") {
  if (status === "unused") return "text-emerald-600";
  if (status === "in-use") return "text-sky-600";
  return "text-red-600";
}

function voucherTrafficLabel(status: "unused" | "in-use" | "expired") {
  if (status === "unused") return "Bundle";
  if (status === "in-use") return "Remaining Bundle";
  return "Traffic";
}

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function unlimitedCaption(plan: PublicPlan) {
  const period =
    plan.durationUnit === "DAYS" && plan.duration === 1
      ? "Daily"
      : plan.durationUnit === "DAYS" && plan.duration === 30
        ? "Monthly"
        : formatDuration(plan.duration, plan.durationUnit);
  return `${period} · ${plan.deviceLimit} device${plan.deviceLimit === 1 ? "" : "s"}`;
}

function planBoxTitle(plan: PublicPlan) {
  if (plan.dataUnit === "UNLIMITED") {
    if (plan.durationUnit === "DAYS" && plan.duration === 1) return "Unlimited daily";
    if (plan.durationUnit === "DAYS" && plan.duration === 30) return "Unlimited monthly";
  }
  if (plan.dataUnit === "GB" && plan.dataAllowance) return `${plan.dataAllowance} GB`;
  return plan.name;
}

function PaymentReferenceCard({
  reference,
  supportPhone,
  locationName,
  planName,
  amountKobo,
  phone,
}: {
  reference: string;
  supportPhone: string | null;
  locationName?: string | null;
  planName?: string | null;
  amountKobo?: number | null;
  phone?: string | null;
}) {
  const message = paymentEnquiryWhatsAppText({
    reference,
    locationName,
    planName,
    amountKobo,
    phone,
  });
  const whatsappUrl = supportPhone ? toWhatsAppUrl(supportPhone, message) : null;

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <p className="text-sm font-medium">Payment reference</p>
      <div className="mt-2 flex items-start gap-2">
        {whatsappUrl ? (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="min-w-0 flex-1 font-mono text-base font-semibold tracking-wide break-all text-primary underline-offset-2 hover:underline"
          >
            {reference}
          </a>
        ) : (
          <p className="min-w-0 flex-1 font-mono text-base font-semibold tracking-wide break-all">{reference}</p>
        )}
        {whatsappUrl ? (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Send this payment summary on WhatsApp"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white shadow-sm transition hover:bg-[#1ebe57] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#25D366]/40"
          >
            <WhatsAppIcon className="size-5" />
          </a>
        ) : null}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        {whatsappUrl
          ? "Tap the reference or WhatsApp icon to message support. The payment summary is already filled in — just send."
          : "Contact support with this reference to log your enquiry."}
      </p>
    </div>
  );
}

function Bubble({ role, children }: { role: "bot" | "user"; children: React.ReactNode }) {
  return (
    <div className={cn("flex gap-2", role === "user" ? "justify-end" : "justify-start")}>
      {role === "bot" ? (
        <span className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Wifi className="size-3.5" aria-hidden="true" />
        </span>
      ) : null}
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[15px] leading-6",
          role === "user"
            ? "rounded-br-md bg-primary text-primary-foreground"
            : "rounded-bl-md bg-white text-foreground shadow-sm ring-1 ring-black/5",
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function WifiBot({
  locations,
  plans,
  refreshCatalog,
  startInBuy = false,
  supportPhone = null,
}: {
  locations: PublicLocation[];
  plans: PublicPlan[];
  refreshCatalog: () => Promise<{ locations: PublicLocation[]; plans: PublicPlan[] }>;
  startInBuy?: boolean;
  supportPhone?: string | null;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const welcome: ChatMessage = {
      id: "welcome",
      role: "bot",
      text: "Hi, I’m the TeckFirm WiFi assistant. You can buy a voucher in a few taps — no account needed.",

    };
    if (!startInBuy) return [welcome];
    return [
      welcome,
      {
        id: "ask-location",
        role: "bot",
        text: "Where would you like to connect?",
      },
    ];
  });
  const [stage, setStage] = useState<Stage>(startInBuy ? "location" : "menu");
  const [intent, setIntent] = useState<FlowId>("buy");
  const [typing, setTyping] = useState(false);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [phone, setPhone] = useState("");
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [lookupPhone, setLookupPhone] = useState("");
  const [lookupPin, setLookupPin] = useState("");
  const [voucherCode, setVoucherCode] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [result, setResult] = useState<ResultCard | null>(null);
  const [pendingCheckout, setPendingCheckout] = useState<{
    reference: string;
    supportPhone: string | null;
    locationName: string | null;
    planName: string | null;
    amountKobo: number | null;
    phone: string | null;
  } | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const flowSeq = useRef(0);

  const location = locations.find((item) => item.id === locationId) ?? null;
  const plan = plans.find((item) => item.id === planId) ?? null;

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing, stage, result, pendingCheckout]);

  useEffect(() => {
    return () => {
      timers.current.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  function push(role: "bot" | "user", text: string) {
    setMessages((current) => [...current, { id: newId(), role, text }]);
  }

  function botSay(text: string, next: Stage, delay = 320) {
    setTyping(true);
    const id = window.setTimeout(() => {
      push("bot", text);
      setStage(next);
      setTyping(false);
    }, delay);
    timers.current.push(id);
  }

  function locationPrompt(nextIntent: FlowId, hasLocations: boolean) {
    if (!hasLocations) {
      return "No hotspots are published yet. Please check back shortly.";
    }
    if (nextIntent === "codes") {
      return "Which location did you buy WiFi at?";
    }
    if (nextIntent === "check") {
      return "Which location is this voucher for?";
    }
    return "Where would you like to connect?";
  }

  function resetPurchase() {
    setLocationId(null);
    setPlanId(null);
    setPin("");
    setPhone("");
    setDetailsError(null);
  }

  function clearTimers() {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
    setTyping(false);
  }

  function bumpFlow() {
    flowSeq.current += 1;
    clearTimers();
    return flowSeq.current;
  }

  async function startBuy() {
    const seq = bumpFlow();
    setIntent("buy");
    resetPurchase();
    setResult(null);
    setPendingCheckout(null);
    push("user", "Buy WiFi");
    setTyping(true);
    const catalog = await refreshCatalog();
    if (seq !== flowSeq.current) return;
    botSay(locationPrompt("buy", catalog.locations.length > 0), "location");
  }

  async function startCodes() {
    const seq = bumpFlow();
    setIntent("codes");
    setLocationId(null);
    setFormError(null);
    setLookupPhone("");
    setLookupPin("");
    setResult(null);
    push("user", "My Vouchers");
    setTyping(true);
    const catalog = await refreshCatalog();
    if (seq !== flowSeq.current) return;
    botSay(locationPrompt("codes", catalog.locations.length > 0), "location");
  }

  async function startCheck() {
    const seq = bumpFlow();
    setIntent("check");
    setLocationId(null);
    setFormError(null);
    setVoucherCode("");
    setResult(null);
    push("user", "Voucher Balance");
    setTyping(true);
    const catalog = await refreshCatalog();
    if (seq !== flowSeq.current) return;
    botSay(locationPrompt("check", catalog.locations.length > 0), "location");
  }

  function startFlow(flow: FlowId) {
    if (flow === "buy") void startBuy();
    if (flow === "codes") void startCodes();
    if (flow === "check") void startCheck();
  }

  async function onLocation(item: PublicLocation) {
    const seq = flowSeq.current;
    push("user", displayName(item.name));
    setTyping(true);
    const [, live] = await Promise.all([
      refreshCatalog(),
      fetch(`/api/locations/${encodeURIComponent(item.id)}/live`, { cache: "no-store" })
        .then(async (response) => {
          const payload = (await response.json()) as {
            success: boolean;
            message: string;
            data?: { live?: boolean };
          };
          return {
            live: Boolean(payload.success && payload.data?.live),
            message: payload.message || LOCATION_CONTROLLER_OFFLINE_MESSAGE,
          };
        })
        .catch(() => ({
          live: false,
          message: LOCATION_CONTROLLER_OFFLINE_MESSAGE,
        })),
    ]);
    if (seq !== flowSeq.current) return;
    if (!live.live) {
      botSay(live.message, "location");
      return;
    }
    setLocationId(item.id);
    setPlanId(null);
    if (intent === "codes") {
      botSay(
        "Enter the phone number and 5-digit PIN you used when you bought WiFi at this location.",
        "codes",
      );
      return;
    }
    if (intent === "check") {
      botSay("Enter the 6-digit voucher code for this location.", "check");
      return;
    }
    botSay("Nice. Pick a plan.", "plan");
  }

  function onPlan(item: PublicPlan) {
    setPlanId(item.id);
    push("user", `${item.name} · ${formatNgnFromKobo(item.priceKobo)}`);
    if (isRetrievalPin(pin) && isElevenDigitCode(phone)) {
      botSay("Here’s your updated order. Pay securely to receive your voucher instantly.", "pay");
      return;
    }
    botSay(
      "Almost done. Choose a 5-digit PIN and enter your phone number. The PIN is only for retrieving your vouchers later.",
      "details",
    );
  }

  async function editPlan() {
    const seq = bumpFlow();
    setDetailsError(null);
    push("user", "Edit");
    setTyping(true);
    await refreshCatalog();
    if (seq !== flowSeq.current) return;
    botSay("Pick a plan.", "plan");
  }

  function onDetails(event: React.FormEvent) {
    event.preventDefault();
    if (!isRetrievalPin(pin)) {
      setDetailsError("Enter a unique 5-digit PIN.");
      return;
    }
    if (!isElevenDigitCode(phone)) {
      setDetailsError("Enter an 11-digit phone number.");
      return;
    }
    setDetailsError(null);
    push("user", `PIN saved for voucher retrieval · ${phone.trim()}`);
    botSay("Here’s your order. Pay securely to receive your voucher instantly.", "pay");
  }

  async function onPay() {
    if (!location || !plan) return;
    setSubmitting(true);
    try {
      const response = await fetch("/api/payments/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId: location.id,
          planId: plan.id,
          phone,
          pin,
        }),
      });
      const payload = (await response.json()) as {
        success: boolean;
        message: string;
        data?: { accessCode?: string; reference?: string };
      };
      if (!payload.success || !payload.data?.accessCode || !payload.data.reference) {
        toast.error(payload.message || "Could not start payment.");
        return;
      }

      const outcome = await openPaystackPopup(payload.data.accessCode);
      const closedWithoutSuccess = outcome === "cancelled" || outcome === "failed";
      push("user", "Pay");
      setSubmitting(false);
      await confirmPaymentInBot(payload.data.reference, { closedWithoutSuccess });
    } catch {
      toast.error("Could not start payment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function showPendingReference(_message: string, ref: string, contact: string | null) {
    const details = {
      reference: ref,
      supportPhone: contact,
      locationName: location ? displayName(location.name) : null,
      planName: plan?.name ?? null,
      amountKobo: plan?.priceKobo ?? null,
      phone: phone.trim() || null,
    };
    setPendingCheckout(details);
    botSay("Here is your payment reference.", "result");
    setResult({
      kind: "pay-pending",
      message: "Here is your payment reference.",
      ...details,
    });
  }

  async function confirmPaymentInBot(reference: string, options?: { closedWithoutSuccess?: boolean }) {
    setConfirmingPayment(true);
    const maxAttempts = 12;
    const closedWithoutSuccess = Boolean(options?.closedWithoutSuccess);

    try {
      if (closedWithoutSuccess) {
        await new Promise((resolve) => window.setTimeout(resolve, 2500));
      }
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
          const response = await fetch(`/api/payments/paystack/verify/${encodeURIComponent(reference)}`);
          const payload = (await response.json()) as {
            success: boolean;
            message: string;
            data?: {
              vouchers?: LookupVoucher[];
              pending?: boolean;
              paid?: boolean;
              cancelled?: boolean;
              reference?: string;
              supportPhone?: string | null;
            };
          };
          const vouchers = (payload.data?.vouchers ?? []).map((item) => ({
            ...item,
            status: item.status === "in-use" || item.status.toLowerCase() === "active" ? "in-use" : "unused",
          })) as LookupVoucher[];
          const pending = Boolean(payload.success && (payload.data?.pending || vouchers.length === 0));
          const paid = Boolean(payload.data?.paid);
          const contactPhone = payload.data?.supportPhone ?? supportPhone;
          const resolvedReference = payload.data?.reference ?? reference;

          if (payload.success && vouchers.length > 0) {
            setPendingCheckout(null);
            botSay(payload.message, "result");
            setResult({ kind: "purchase", message: payload.message, vouchers });
            return;
          }

          if (!payload.success) {
            botSay(payload.message || "Payment was not successful. No voucher was issued.", "pay");
            return;
          }

          if (pending && attempt < maxAttempts) {
            await new Promise((resolve) => window.setTimeout(resolve, 2500));
            continue;
          }

          // Paid (or still waiting on voucher) must never be shown as cancelled.
          if (paid || (pending && !closedWithoutSuccess)) {
            showPendingReference(
              payload.message || `Your payment reference is ${resolvedReference}.`,
              resolvedReference,
              contactPhone,
            );
            return;
          }

          if (closedWithoutSuccess) {
            if (paid) {
              showPendingReference(
                payload.message || `Your payment reference is ${resolvedReference}.`,
                resolvedReference,
                contactPhone,
              );
              return;
            }

            const cancelResponse = await fetch("/api/payments/paystack/cancel", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ reference }),
            });
            const cancelPayload = (await cancelResponse.json()) as {
              success: boolean;
              message: string;
              data?: {
                vouchers?: LookupVoucher[];
                pending?: boolean;
                paid?: boolean;
                cancelled?: boolean;
                reference?: string;
                supportPhone?: string | null;
              };
            };
            const cancelVouchers = (cancelPayload.data?.vouchers ?? []).map((item) => ({
              ...item,
              status: item.status === "in-use" || item.status.toLowerCase() === "active" ? "in-use" : "unused",
            })) as LookupVoucher[];
            const cancelContact = cancelPayload.data?.supportPhone ?? contactPhone;
            const cancelReference = cancelPayload.data?.reference ?? resolvedReference;

            if (cancelPayload.success && cancelVouchers.length > 0) {
              setPendingCheckout(null);
              botSay(cancelPayload.message, "result");
              setResult({ kind: "purchase", message: cancelPayload.message, vouchers: cancelVouchers });
              return;
            }
            if (cancelPayload.success && (cancelPayload.data?.paid || cancelPayload.data?.pending)) {
              showPendingReference(
                cancelPayload.message || `Your payment reference is ${cancelReference}.`,
                cancelReference,
                cancelContact,
              );
              return;
            }
            botSay(
              cancelPayload.message || "Payment was cancelled. No voucher was issued. You can try again when you’re ready.",
              "pay",
            );
            return;
          }

          showPendingReference(
            payload.message || `Your payment reference is ${resolvedReference}.`,
            resolvedReference,
            contactPhone,
          );
          return;
        } catch {
          if (attempt === maxAttempts) {
            showPendingReference(
              "Payment could not be confirmed right now. Keep this reference and contact support.",
              reference,
              supportPhone,
            );
            return;
          }
          await new Promise((resolve) => window.setTimeout(resolve, 2500));
        }
      }
    } finally {
      setConfirmingPayment(false);
    }
  }

  async function onLookup(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (!isElevenDigitCode(lookupPhone)) {
      setFormError("Enter the same 11-digit phone number you used at purchase.");
      return;
    }
    if (!isRetrievalPin(lookupPin)) {
      setFormError("Enter your 5-digit PIN.");
      return;
    }
    if (!locationId) {
      setFormError("Choose a location first.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/vouchers/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId, phone: lookupPhone, pin: lookupPin }),
      });
      const payload = (await response.json()) as {
        success: boolean;
        message: string;
        data?: { vouchers: LookupVoucher[] };
      };
      if (!payload.success) {
        setFormError(payload.message);
        return;
      }
      push("user", "Look up my vouchers");
      const vouchers = payload.data?.vouchers ?? [];
      botSay(payload.message, "result");
      setResult({
        kind: "codes",
        message: payload.message,
        vouchers,
      });
    } catch {
      setFormError("I couldn’t look that up right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onCheck(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (!isVoucherCode(voucherCode)) {
      setFormError("Enter the 6-digit voucher code.");
      return;
    }
    if (!locationId) {
      setFormError("Choose a location first.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/vouchers/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId, code: voucherCode }),
      });
      const payload = (await response.json()) as {
        success: boolean;
        message: string;
        data?: {
          code: string;
          status: "unused" | "in-use" | "expired";
          location: string;
          traffic: string;
          duration: string;
          devices: string;
          expiresAt: string | null;
        };
      };
      if (!payload.success) {
        setFormError(payload.message);
        return;
      }
      push("user", voucherCode.trim().toUpperCase());
      botSay(payload.message, "result");
      setResult({
        kind: "check",
        message: payload.message,
        code: payload.data?.code ?? voucherCode.trim(),
        status: payload.data?.status ?? "unused",
        location: displayName(payload.data?.location ?? ""),
        traffic: payload.data?.traffic ?? "Unlimited",
        duration: payload.data?.duration ?? "—",
        devices: payload.data?.devices ?? "0",
        expiresAt: payload.data?.expiresAt ?? null,
      });
    } catch {
      setFormError("I couldn’t check that code right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Voucher copied.");
    } catch {
      toast.error("Couldn’t copy. Select the code instead.");
    }
  }

  function clearLastResultMessages() {
    setMessages((current) => {
      const next = [...current];
      if (next.at(-1)?.role === "bot") next.pop();
      if (next.at(-1)?.role === "user") next.pop();
      return next;
    });
  }

  function clearLastVoucherView() {
    setVoucherCode("");
    clearLastResultMessages();
  }

  function goToMenu() {
    bumpFlow();
    setIntent("buy");
    resetPurchase();
    setResult(null);
    setPendingCheckout(null);
    setFormError(null);
    setLookupPhone("");
    setLookupPin("");
    setVoucherCode("");
    setSubmitting(false);
    setConfirmingPayment(false);
    setStage("menu");
  }

  function clickMainMenu() {
    if (confirmingPayment) return;
    if (stage === "result" && result?.kind === "check") {
      clearLastVoucherView();
    }
    goToMenu();
    push("user", "Main menu");
    push("bot", "What would you like to do next?");
  }

  function goBack() {
    if (confirmingPayment) return;
    clearTimers();
    setFormError(null);
    setDetailsError(null);

    if (stage === "plan") {
      if (planId && isRetrievalPin(pin) && isElevenDigitCode(phone)) {
        setStage("pay");
        return;
      }
      setPlanId(null);
      setStage("location");
      return;
    }
    if (stage === "details") {
      setStage("plan");
      return;
    }
    if (stage === "pay") {
      if (!location || !plan) {
        setPlanId(null);
        setStage("location");
        return;
      }
      setStage("details");
      return;
    }
    if (stage === "codes" || stage === "check") {
      setStage("location");
      return;
    }
    if (stage === "result") {
      if (result?.kind === "check") {
        clearLastVoucherView();
        setResult(null);
        setStage("check");
        return;
      }
      if (result?.kind === "purchase" || result?.kind === "pay-pending") {
        clearLastResultMessages();
        setResult(null);
        setStage("pay");
        return;
      }
      setResult(null);
      setStage("codes");
      return;
    }
    goToMenu();
  }

  function clearScreen() {
    if (confirmingPayment) return;
    goToMenu();
    setMessages([
      {
        id: "welcome",
        role: "bot",
        text: "Hi, I’m the TeckFirm WiFi assistant. You can buy a voucher in a few taps — no account needed.",
      },
    ]);
  }

  const menuChoices: Choice[] = [
    { id: "buy", label: "Buy WiFi" },
    { id: "codes", label: "My Vouchers" },
    { id: "check", label: "Voucher Balance" },
  ];

  return (
    <section className="mx-auto w-full max-w-lg px-4">
      <div className="flex h-[min(34rem,70vh)] flex-col overflow-hidden rounded-3xl bg-[#eef3f1] shadow-[0_20px_50px_-24px_rgba(15,40,45,0.45)] ring-1 ring-black/5">
        <div className="flex items-center gap-3 bg-primary px-4 py-3 text-primary-foreground">
          <span className="flex size-10 items-center justify-center rounded-full bg-white/15">
            <Wifi className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium leading-tight">TeckFirm Assistant</p>
            <p className="flex items-center gap-1.5 text-xs text-primary-foreground/80">
              <span className="size-1.5 rounded-full bg-emerald-300" />
              Online · replies instantly
            </p>
          </div>
          {messages.length > 1 || stage !== "menu" ? (
            <button
              type="button"
              className="shrink-0 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium hover:bg-white/25 disabled:opacity-50"
              onClick={clearScreen}
              disabled={confirmingPayment}
            >
              Clear screen
            </button>
          ) : null}
        </div>

        <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
          {messages.map((message) => (
            <Bubble key={message.id} role={message.role}>
              {message.text}
            </Bubble>
          ))}

          {typing ? (
            <div className="flex gap-2">
              <span className="mt-1 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Wifi className="size-3.5" />
              </span>
              <div className="rounded-2xl rounded-bl-md bg-white px-3 py-2.5 text-sm text-muted-foreground shadow-sm">
                Typing…
              </div>
            </div>
          ) : null}

          {!typing && stage === "menu" ? (
            <div className="flex flex-wrap gap-2 pl-9">
              {menuChoices.map((choice) => (
                <Button key={choice.id} className="h-11 rounded-full px-4" onClick={() => startFlow(choice.id)}>
                  {choice.label}
                </Button>
              ))}
            </div>
          ) : null}

          {!typing && stage === "location" ? (
            <div className="flex flex-wrap gap-2 pl-9">
              {locations.map((item) => (
                <Button
                  key={item.id}
                  variant="outline"
                  className="h-11 rounded-full border-white bg-white px-4"
                  onClick={() => onLocation(item)}
                >
                  {displayName(item.name)}
                </Button>
              ))}
              <div className="flex w-full justify-center gap-4">
                <button type="button" className="text-xs text-muted-foreground underline" onClick={goBack}>
                  Back
                </button>
                <button type="button" className="text-xs text-muted-foreground underline" onClick={clickMainMenu}>
                  Main menu
                </button>
              </div>
            </div>
          ) : null}

          {!typing && stage === "plan" ? (
            <div className="space-y-2 pl-9">
              {plans.length === 0 ? (
                <p className="text-sm text-muted-foreground">No prices are set yet.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {plans.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onPlan(item)}
                      className="rounded-2xl bg-white px-3 py-2.5 text-left shadow-sm ring-1 ring-black/5"
                    >
                      {item.dataUnit === "UNLIMITED" ? (
                        <span className="block text-[11px] leading-tight text-muted-foreground">
                          {unlimitedCaption(item)}
                        </span>
                      ) : (
                        <span className="block text-[11px] leading-tight text-muted-foreground">
                          {formatDuration(item.duration, item.durationUnit)}
                          {isUnlimitedDeviceLimit(item.deviceLimit) ? " · Unlimited devices" : ""}
                        </span>
                      )}
                      <span className="block font-medium leading-snug">{planBoxTitle(item)}</span>
                      <span className="mt-1 block text-sm font-semibold">{formatNgnFromKobo(item.priceKobo)}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="flex w-full justify-center gap-4">
                <button type="button" className="text-xs text-muted-foreground underline" onClick={goBack}>
                  Back
                </button>
                <button type="button" className="text-xs text-muted-foreground underline" onClick={clickMainMenu}>
                  Main menu
                </button>
              </div>
            </div>
          ) : null}

          {!typing && stage === "details" ? (
            <form onSubmit={onDetails} className="ml-9 space-y-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5">
              <div className="space-y-1.5">
                <Label htmlFor="bot-pin">Retrieval PIN</Label>
                <Input
                  id="bot-pin"
                  value={pin}
                  onChange={(event) => setPin(digitsOnly(event.target.value, 5))}
                  className="h-11 bg-muted/40 tracking-[0.3em]"
                  inputMode="numeric"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={5}
                  placeholder="48291"
                  aria-describedby="bot-pin-help"
                  required
                />
                <p id="bot-pin-help" className="text-xs leading-5 text-muted-foreground">
                  Choose a unique 5-digit number. This PIN is only for retrieving your vouchers — it is not a WiFi
                  password and is not used for payment. Anyone with this phone number and PIN can see those vouchers,
                  so remember it and keep it to yourself.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bot-phone">Phone number</Label>
                <Input
                  id="bot-phone"
                  value={phone}
                  onChange={(event) => setPhone(digitsOnly(event.target.value, 11))}
                  className="h-11 bg-muted/40"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={11}
                  placeholder="12345678901"
                  aria-describedby="bot-phone-help"
                  required
                />
                <p id="bot-phone-help" className="text-xs leading-5 text-muted-foreground">
                  Enter any 11 digits. It does not have to be your real phone number.
                </p>
              </div>
              {detailsError ? <p className="text-sm text-destructive">{detailsError}</p> : null}
              <Button type="submit" className="h-11 w-full rounded-full">
                Continue
              </Button>
              <div className="flex w-full justify-center gap-4">
                <button type="button" className="text-xs text-muted-foreground underline" onClick={goBack}>
                  Back
                </button>
                <button type="button" className="text-xs text-muted-foreground underline" onClick={clickMainMenu}>
                  Main menu
                </button>
              </div>
            </form>
          ) : null}

          {!typing && stage === "pay" && location && plan ? (
            <div className="ml-9 space-y-3">
              {pendingCheckout ? (
                <PaymentReferenceCard
                  reference={pendingCheckout.reference}
                  supportPhone={pendingCheckout.supportPhone}
                  locationName={pendingCheckout.locationName}
                  planName={pendingCheckout.planName}
                  amountKobo={pendingCheckout.amountKobo}
                  phone={pendingCheckout.phone}
                />
              ) : null}
              <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
                <p className="text-sm font-medium">Order summary</p>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Location</dt>
                  <dd>{displayName(location.name)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Plan</dt>
                  <dd className="flex items-center gap-2 text-right">
                    <span>{plan.name}</span>
                    <button
                      type="button"
                      className="cursor-pointer text-xs font-medium text-primary underline"
                      onClick={() => void editPlan()}
                    >
                      Edit
                    </button>
                  </dd>
                </div>
                {plan.dataUnit === "UNLIMITED" ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Devices</dt>
                    <dd>{plan.deviceLimit}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Phone number</dt>
                  <dd>{phone.trim()}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Amount</dt>
                  <dd className="font-semibold">{formatNgnFromKobo(plan.priceKobo)}</dd>
                </div>
              </dl>
              {confirmingPayment ? (
                <div className="rounded-xl bg-muted/60 px-4 py-3 text-center">
                  <p className="text-sm font-medium">Confirming payment…</p>
                  <p className="mt-1 text-xs text-muted-foreground">Do not close this page.</p>
                </div>
              ) : (
                <>
                  <Button
                    className="h-12 w-full rounded-full text-base"
                    disabled={submitting}
                    onClick={() => void onPay()}
                  >
                    {submitting ? "Opening Paystack…" : `Pay ${formatNgnFromKobo(plan.priceKobo)}`}
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    Secure checkout with Paystack. Card, transfer, or USSD.
                  </p>
                  <div className="flex w-full justify-center gap-4">
                    <button type="button" className="text-xs text-muted-foreground underline" onClick={goBack}>
                      Back
                    </button>
                    <button type="button" className="text-xs text-muted-foreground underline" onClick={clickMainMenu}>
                      Main menu
                    </button>
                  </div>
                </>
              )}
              </div>
            </div>
          ) : null}

          {!typing && stage === "pay" && (!location || !plan) ? (
            <div className="grid gap-2 pl-9">
              <p className="text-sm text-muted-foreground">
                That location or price is no longer available. Pick again from the menu.
              </p>
              <div className="flex w-full justify-center gap-4">
                <button type="button" className="text-xs text-muted-foreground underline" onClick={goBack}>
                  Back
                </button>
                <button type="button" className="text-xs text-muted-foreground underline" onClick={clickMainMenu}>
                  Main menu
                </button>
              </div>
            </div>
          ) : null}

          {!typing && stage === "codes" ? (
            <form onSubmit={onLookup} className="ml-9 space-y-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5">
              <div className="space-y-1.5">
                <Label htmlFor="bot-lookup-phone">Phone number</Label>
                <Input
                  id="bot-lookup-phone"
                  value={lookupPhone}
                  onChange={(event) => setLookupPhone(digitsOnly(event.target.value, 11))}
                  className="h-11 bg-muted/40"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={11}
                  placeholder="12345678901"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bot-lookup-pin">Retrieval PIN</Label>
                <Input
                  id="bot-lookup-pin"
                  value={lookupPin}
                  onChange={(event) => setLookupPin(digitsOnly(event.target.value, 5))}
                  className="h-11 bg-muted/40 tracking-[0.3em]"
                  inputMode="numeric"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={5}
                  placeholder="5-digit PIN"
                  aria-describedby="bot-lookup-pin-help"
                  required
                />
                <p id="bot-lookup-pin-help" className="text-xs leading-5 text-muted-foreground">
                  Use the same 5-digit PIN you chose at purchase. It only retrieves vouchers for this phone number.
                </p>
              </div>
              {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
              <Button type="submit" className="h-11 w-full rounded-full" disabled={submitting}>
                {submitting ? "Looking up…" : "Show my Vouchers"}
              </Button>
              <div className="flex w-full justify-center gap-4">
                <button type="button" className="text-xs text-muted-foreground underline" onClick={goBack}>
                  Back
                </button>
                <button type="button" className="text-xs text-muted-foreground underline" onClick={clickMainMenu}>
                  Main menu
                </button>
              </div>
            </form>
          ) : null}

          {!typing && stage === "check" ? (
            <form onSubmit={onCheck} className="ml-9 space-y-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5">
              <div className="space-y-1.5">
                <Label htmlFor="bot-code">Voucher code</Label>
                <Input
                  id="bot-code"
                  value={voucherCode}
                  onChange={(event) => setVoucherCode(digitsOnly(event.target.value, 6))}
                  className="h-11 bg-muted/40 tracking-[0.3em]"
                  inputMode="numeric"
                  autoComplete="off"
                  spellCheck={false}
                  minLength={6}
                  maxLength={6}
                  pattern="\d{6}"
                  placeholder="6-digit code"
                  required
                />
              </div>
              {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
              <Button type="submit" className="h-11 w-full rounded-full" disabled={submitting}>
                {submitting ? "Checking…" : "Show details"}
              </Button>
              <div className="flex w-full justify-center gap-4">
                <button type="button" className="text-xs text-muted-foreground underline" onClick={goBack}>
                  Back
                </button>
                <button type="button" className="text-xs text-muted-foreground underline" onClick={clickMainMenu}>
                  Main menu
                </button>
              </div>
            </form>
          ) : null}

          {!typing && stage === "result" && result?.kind === "codes" ? (
            <div className="ml-9 space-y-3">
              {result.vouchers.length === 0 ? (
                <p className="text-sm text-muted-foreground">{result.message}</p>
              ) : (
                result.vouchers.map((item) => (
                  <div key={item.code} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
                    <p className="font-mono text-lg font-semibold tracking-wide">{item.code}</p>
                    <div className="mt-1 flex items-start justify-between gap-3 text-sm">
                      <p className="text-muted-foreground">
                        {item.plan} · {item.location}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Status: </span>
                        <span className={`font-medium ${voucherStatusClass(item.status)}`}>{item.status}</span>
                      </p>
                    </div>
                    <Button type="button" className="mt-3 h-10 w-full rounded-full" onClick={() => copyCode(item.code)}>
                      Copy code
                    </Button>
                  </div>
                ))
              )}
              <div className="flex w-full justify-center gap-4">
                <button type="button" className="text-xs text-muted-foreground underline" onClick={goBack}>
                  Back
                </button>
                <button type="button" className="text-xs text-muted-foreground underline" onClick={clickMainMenu}>
                  Main menu
                </button>
              </div>
            </div>
          ) : null}

          {!typing && stage === "result" && result?.kind === "purchase" ? (
            <div className="ml-9 space-y-3">
              {result.vouchers.map((item) => (
                <div key={item.code} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
                  <p className="font-mono text-lg font-semibold tracking-wide">{item.code}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.plan} · {item.location}
                  </p>
                  <Button type="button" className="mt-3 h-10 w-full rounded-full" onClick={() => copyCode(item.code)}>
                    Copy code
                  </Button>
                </div>
              ))}
              <div className="flex w-full justify-center gap-4">
                <button type="button" className="text-xs text-muted-foreground underline" onClick={goBack}>
                  Back
                </button>
                <button type="button" className="text-xs text-muted-foreground underline" onClick={clickMainMenu}>
                  Main menu
                </button>
              </div>
            </div>
          ) : null}

          {!typing && stage === "result" && result?.kind === "pay-pending" ? (
            <div className="ml-9 space-y-3">
              <PaymentReferenceCard
                reference={result.reference}
                supportPhone={result.supportPhone ?? supportPhone}
                locationName={result.locationName}
                planName={result.planName}
                amountKobo={result.amountKobo}
                phone={result.phone}
              />
              <div className="flex w-full justify-center gap-4">
                <button type="button" className="text-xs text-muted-foreground underline" onClick={goBack}>
                  Back
                </button>
                <button type="button" className="text-xs text-muted-foreground underline" onClick={clickMainMenu}>
                  Main menu
                </button>
              </div>
            </div>
          ) : null}

          {!typing && stage === "result" && result?.kind === "check" ? (
            <div className="ml-9 space-y-3">
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Code: </span>
                    <span className="font-mono text-base font-semibold tracking-wide">{result.code}</span>
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Status: </span>
                    <span className={`font-medium ${voucherStatusClass(result.status)}`}>{result.status}</span>
                  </p>
                </div>
                <dl className="mt-3 space-y-1 text-sm text-muted-foreground">
                  <div className="flex justify-between gap-3">
                    <dt>Location</dt>
                    <dd>{result.location}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>{voucherTrafficLabel(result.status)}</dt>
                    <dd>{result.traffic}</dd>
                  </div>
                  {result.expiresAt ? (
                    <div className="flex justify-between gap-3">
                      <dt>
                        {result.status === "expired"
                          ? "Expired On"
                          : result.status === "in-use"
                            ? "Expires On"
                            : "Expires"}
                      </dt>
                      <dd>
                        {new Date(result.expiresAt).toLocaleString("en-NG", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </dd>
                    </div>
                  ) : null}
                  {result.status === "unused" ? (
                    <>
                      <div className="flex justify-between gap-3">
                        <dt>Duration</dt>
                        <dd>{result.duration}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt>Devices</dt>
                        <dd>{result.devices}</dd>
                      </div>
                    </>
                  ) : null}
                  {result.status === "in-use" ? (
                    <div className="flex justify-between gap-3">
                      <dt>Active Devices</dt>
                      <dd>{result.devices}</dd>
                    </div>
                  ) : null}
                </dl>
              </div>
              <div className="flex w-full justify-center gap-4">
                <button type="button" className="text-xs text-muted-foreground underline" onClick={goBack}>
                  Back
                </button>
                <button type="button" className="text-xs text-muted-foreground underline" onClick={clickMainMenu}>
                  Main menu
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="border-t bg-white/80 px-3 py-2.5">
          <Input
            disabled
            readOnly
            tabIndex={-1}
            className="h-11 rounded-full border-0 bg-muted"
            placeholder="Use the buttons above"
            aria-label="Typing is disabled. Use the buttons to continue."
          />
        </div>
      </div>
    </section>
  );
}
