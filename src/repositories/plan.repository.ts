import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";

export async function listActivePlans() {
  return prisma.plan.findMany({
    where: {
      active: true,
      locationId: null,
    },
    include: { location: true },
    orderBy: [{ featured: "desc" }, { displayOrder: "asc" }, { priceKobo: "asc" }],
  });
}

export async function listFeaturedPlans() {
  return prisma.plan.findMany({
    where: {
      active: true,
      featured: true,
      locationId: null,
    },
    include: { location: true },
    orderBy: [{ displayOrder: "asc" }, { priceKobo: "asc" }],
  });
}

export async function listAdminPlans() {
  return prisma.plan.findMany({
    where: {
      active: true,
      locationId: null,
    },
    include: {
      location: { select: { id: true, name: true, city: true } },
      _count: { select: { vouchers: true, orderItems: true } },
    },
    orderBy: [{ displayOrder: "asc" }, { priceKobo: "asc" }],
  });
}

export async function getPlanById(id: string) {
  return prisma.plan.findUnique({
    where: { id },
    include: { location: true },
  });
}

export async function alignGigPlanTerms() {
  return prisma.plan.updateMany({
    where: {
      dataUnit: "GB",
      active: true,
    },
    data: {
      duration: 30,
      durationUnit: "DAYS",
      deviceLimit: 999,
    },
  });
}

export async function createPlan(data: Prisma.PlanCreateInput) {
  return prisma.plan.create({ data, include: { location: true } });
}

export async function updatePlan(id: string, data: Prisma.PlanUpdateInput) {
  return prisma.plan.update({ where: { id }, data, include: { location: true } });
}

export async function countPlanRecords(id: string) {
  return prisma.plan.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      active: true,
      locationId: true,
      _count: { select: { vouchers: true, orderItems: true } },
    },
  });
}

export async function deactivatePlan(id: string) {
  return prisma.plan.update({
    where: { id },
    data: { active: false },
  });
}

export async function hardDeletePlan(id: string) {
  return prisma.plan.delete({ where: { id } });
}
