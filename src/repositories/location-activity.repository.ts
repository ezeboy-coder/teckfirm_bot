import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  activityStatusFilterWhere,
  type ActivityStatusFilter,
} from "@/lib/admin/order-status";

function activityStatusSql(filter: ActivityStatusFilter): Prisma.Sql {
  if (filter === "all") return Prisma.empty;
  if (filter === "cancelled") {
    return Prisma.sql`AND ("status" = 'CANCELLED' OR "paymentStatus" = 'ABANDONED')`;
  }
  if (filter === "paid") {
    return Prisma.sql`AND "paymentStatus" = 'SUCCESS' AND "status" <> 'CANCELLED'`;
  }
  if (filter === "failed") {
    return Prisma.sql`AND "status" <> 'CANCELLED'
      AND "paymentStatus" NOT IN ('ABANDONED', 'SUCCESS')
      AND ("status" = 'FAILED' OR "paymentStatus" = 'FAILED')`;
  }
  if (filter === "refunded") {
    return Prisma.sql`AND "status" <> 'CANCELLED'
      AND "paymentStatus" NOT IN ('ABANDONED', 'SUCCESS', 'FAILED')
      AND ("status" = 'REFUNDED' OR "paymentStatus" IN ('REFUNDED', 'REVERSED'))`;
  }
  if (filter === "needs_review") {
    return Prisma.sql`AND "status" = 'MANUAL_REVIEW'
      AND "paymentStatus" NOT IN ('ABANDONED', 'SUCCESS', 'FAILED', 'REFUNDED', 'REVERSED')`;
  }
  return Prisma.sql`AND "status" NOT IN ('CANCELLED', 'FAILED', 'REFUNDED', 'MANUAL_REVIEW')
    AND "paymentStatus" NOT IN ('ABANDONED', 'SUCCESS', 'FAILED', 'REFUNDED', 'REVERSED')`;
}

function activityDateSql(start: Date | null, next: Date | null): Prisma.Sql {
  if (!start || !next) return Prisma.empty;
  return Prisma.sql`AND (
    ("paidAt" IS NOT NULL AND "paidAt" >= ${start} AND "paidAt" < ${next})
    OR ("paidAt" IS NULL AND "createdAt" >= ${start} AND "createdAt" < ${next})
  )`;
}

function activityDateWhere(start: Date | null, next: Date | null): Prisma.OrderWhereInput | undefined {
  if (!start || !next) return undefined;
  return {
    OR: [
      { paidAt: { gte: start, lt: next } },
      { AND: [{ paidAt: null }, { createdAt: { gte: start, lt: next } }] },
    ],
  };
}

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

export async function countLocationActivity(
  locationId: string,
  statusFilter: ActivityStatusFilter = "all",
  start: Date | null = null,
  next: Date | null = null,
) {
  if ((start && !next) || (!start && next)) {
    return 0;
  }

  const statusWhere = activityStatusFilterWhere(statusFilter);
  const dateWhere = activityDateWhere(start, next);
  return prisma.order.count({
    where: {
      locationId,
      ...(statusWhere ?? {}),
      ...(dateWhere ?? {}),
    },
  });
}

export async function listLocationActivity(
  locationId: string,
  take = 10,
  skip = 0,
  statusFilter: ActivityStatusFilter = "all",
  start: Date | null = null,
  next: Date | null = null,
) {
  if ((start && !next) || (!start && next)) {
    return [];
  }

  const statusSql = activityStatusSql(statusFilter);
  const dateSql = activityDateSql(start, next);
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id
    FROM "Order"
    WHERE "locationId" = ${locationId}
    ${statusSql}
    ${dateSql}
    ORDER BY COALESCE("paidAt", "createdAt") DESC, "createdAt" DESC, id DESC
    LIMIT ${take} OFFSET ${skip}
  `;

  if (rows.length === 0) {
    return [];
  }

  const orders = await prisma.order.findMany({
    where: { id: { in: rows.map((row) => row.id) } },
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

  const byId = new Map(orders.map((order) => [order.id, order]));
  return rows.flatMap((row) => {
    const order = byId.get(row.id);
    return order ? [order] : [];
  });
}
