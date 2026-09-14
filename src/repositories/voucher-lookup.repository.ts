import { prisma } from "@/lib/db/prisma";

export async function findPaidOrdersByPhoneAndPinHash(
  guestPhone: string,
  guestPinHash: string,
  locationId: string,
) {
  return prisma.order.findMany({
    where: {
      guestPhone,
      guestPinHash,
      locationId,
      paymentStatus: "SUCCESS",
      status: { in: ["PAID", "FULFILLING", "COMPLETED"] },
    },
    include: {
      voucher: true,
      location: { select: { name: true, omadaDeviceId: true, omadaId: true, omadaSiteId: true } },
      items: { include: { plan: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
}

/** Keep the order↔voucher link; only mark expired so admin activity stays accurate. */
export async function markVouchersExpiredByIds(ids: string[]) {
  if (ids.length === 0) return;
  await prisma.voucher.updateMany({
    where: { id: { in: ids } },
    data: { status: "EXPIRED", lastSyncAt: new Date() },
  });
}

export async function syncLiveVoucherStatuses(
  updates: { id: string; status: "UNUSED" | "ACTIVE"; expiresAt: Date | null }[],
) {
  if (updates.length === 0) return;
  const syncedAt = new Date();
  await prisma.$transaction(
    updates.map((update) =>
      prisma.voucher.update({
        where: { id: update.id },
        data: {
          status: update.status,
          lastSyncAt: syncedAt,
          expiresAt: update.expiresAt,
        },
      }),
    ),
  );
}

export async function findVoucherByLocationAndCode(locationId: string, code: string) {
  return prisma.voucher.findUnique({
    where: {
      locationId_code: { locationId, code },
    },
    select: { id: true, orderId: true },
  });
}
