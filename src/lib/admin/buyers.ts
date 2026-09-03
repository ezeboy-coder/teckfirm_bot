export type BuyerIdentity = {
  id?: string;
  userId: string | null;
  guestPhone: string | null;
  guestEmail: string | null;
};

export function buyerKey(identity: BuyerIdentity): string {
  if (identity.userId) return `user:${identity.userId}`;
  const phone = identity.guestPhone?.trim();
  if (phone) return `phone:${phone}`;
  const email = identity.guestEmail?.trim().toLowerCase();
  if (email) return `email:${email}`;
  return `order:${identity.id ?? "unknown"}`;
}

export function countUniqueBuyers(identities: BuyerIdentity[]): number {
  return new Set(identities.map(buyerKey)).size;
}

export function boughtDuringRange(
  identity: { paidAt: Date | null; createdAt: Date },
  start: Date,
  next: Date,
) {
  const at = identity.paidAt ?? identity.createdAt;
  return at >= start && at < next;
}
