import { formatNgnFromKobo } from "@/lib/utils/money";

export function paymentEnquiryWhatsAppText(input: {
  reference: string;
  locationName?: string | null;
  planName?: string | null;
  amountKobo?: number | null;
  phone?: string | null;
}): string {
  const lines = [
    "Hello TeckFirm Support,",
    "",
    "I need help with a WiFi payment.",
    `Reference: ${input.reference}`,
  ];

  if (input.locationName?.trim()) {
    lines.push(`Location: ${input.locationName.trim()}`);
  }
  if (input.planName?.trim()) {
    lines.push(`Plan: ${input.planName.trim()}`);
  }
  if (typeof input.amountKobo === "number" && Number.isFinite(input.amountKobo)) {
    lines.push(`Amount: ${formatNgnFromKobo(input.amountKobo)}`);
  }
  if (input.phone?.trim()) {
    lines.push(`Phone used at checkout: ${input.phone.trim()}`);
  }

  lines.push("", "Please help me complete this purchase.");
  return lines.join("\n");
}
