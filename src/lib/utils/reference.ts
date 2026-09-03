import { randomBytes } from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomToken(length: number): string {
  const bytes = randomBytes(length);
  let token = "";
  for (const byte of bytes) {
    token += ALPHABET[byte % ALPHABET.length];
  }
  return token;
}

export function generateOrderReference(date = new Date()): string {
  const stamp = date.toISOString().slice(0, 10).replaceAll("-", "");
  return `TFW-${stamp}-${randomToken(6)}`;
}

export function generateTicketReference(date = new Date()): string {
  const stamp = date.toISOString().slice(0, 10).replaceAll("-", "");
  return `TFS-${stamp}-${randomToken(5)}`;
}

export function generateWalletReference(): string {
  return `TFWLT-${randomToken(10)}`;
}

export function lastSixReferenceChars(reference: string): string {
  const compact = reference.replaceAll("-", "").trim().toUpperCase();
  return compact.slice(-6);
}

export function paymentReferenceMessage(references: string[]): string {
  const unique = [...new Set(references.map((value) => value.trim()).filter((value) => value.length > 0))];
  if (unique.length === 0) {
    return "Your payment reference is not available yet.";
  }
  if (unique.length === 1) {
    return `Your payment reference is ${unique[0]}.`;
  }
  return `Your payment references are ${unique.join(", ")}.`;
}
