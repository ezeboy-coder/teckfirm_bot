import { prisma } from "@/lib/db/prisma";

export async function getAdminLocationRecord(id: string) {
  return prisma.location.findFirst({
    where: {
      id,
      NOT: { name: { contains: "DEMO", mode: "insensitive" } },
    },
  });
}

export async function countLocationRecords(id: string) {
  return prisma.location.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      active: true,
      _count: { select: { orders: true, vouchers: true, orderItems: true } },
    },
  });
}

export async function deactivateLocation(id: string) {
  return prisma.location.update({
    where: { id },
    data: { active: false },
  });
}

export async function hardDeleteLocation(id: string) {
  return prisma.location.delete({ where: { id } });
}

export async function countVouchersForLocations(locationIds: string[], createdAtFrom?: Date) {
  if (locationIds.length === 0) return [];
  return prisma.voucher.groupBy({
    by: ["locationId"],
    where: {
      locationId: { in: locationIds },
      ...(createdAtFrom ? { createdAt: { gte: createdAtFrom } } : {}),
    },
    _count: { _all: true },
  });
}

export async function listPaidOrderBuyers(locationIds: string[]) {
  if (locationIds.length === 0) return [];
  return prisma.order.findMany({
    where: {
      locationId: { in: locationIds },
      paymentStatus: "SUCCESS",
    },
    select: {
      id: true,
      locationId: true,
      userId: true,
      guestPhone: true,
      guestEmail: true,
      paidAt: true,
      createdAt: true,
    },
  });
}

export async function sumSuccessfulPayments(locationId: string, paidAtFrom?: Date) {
  return prisma.payment.aggregate({
    _sum: { amountKobo: true },
    where: {
      status: "SUCCESS",
      order: { locationId },
      ...(paidAtFrom
        ? {
            OR: [{ paidAt: { gte: paidAtFrom } }, { paidAt: null, createdAt: { gte: paidAtFrom } }],
          }
        : {}),
    },
  });
}

export async function countVouchers(locationId: string, createdAtFrom?: Date) {
  return prisma.voucher.count({
    where: {
      locationId,
      ...(createdAtFrom ? { createdAt: { gte: createdAtFrom } } : {}),
    },
  });
}

export async function listLocationActivity(locationId: string, take = 50) {
  return prisma.order.findMany({
    where: { locationId },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      reference: true,
      createdAt: true,
      paidAt: true,
      totalKobo: true,
      status: true,
      paymentStatus: true,
      guestFirstName: true,
      guestPhone: true,
      guestEmail: true,
      user: { select: { firstName: true, phone: true, email: true } },
      voucher: { select: { id: true } },
      items: {
        select: { plan: { select: { name: true } } },
        take: 1,
      },
    },
  });
}
