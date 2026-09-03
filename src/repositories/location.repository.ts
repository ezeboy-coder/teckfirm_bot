import { prisma } from "@/lib/db/prisma";
import { slugify } from "@/lib/utils/slug";
import type { Prisma } from "@prisma/client";


export async function listActiveLocations() {
  return prisma.location.findMany({
    where: {
      active: true,
      NOT: { name: { contains: "DEMO", mode: "insensitive" } },
    },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { plans: { where: { active: true } } } },
    },
  });
}

export async function listAdminLocations() {
  return prisma.location.findMany({
    where: {
      active: true,
      NOT: { name: { contains: "DEMO", mode: "insensitive" } },
    },
    include: {
      omadaController: { select: { id: true, name: true } },
      _count: { select: { plans: true, orders: true, vouchers: true } },
    },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
  });
}

export async function getLocationBySlug(slug: string) {
  return prisma.location.findUnique({
    where: { slug },
    include: {
      plans: {
        where: { active: true },
        orderBy: [{ displayOrder: "asc" }, { priceKobo: "asc" }],
      },
    },
  });
}

export async function getLocationById(id: string) {
  return prisma.location.findUnique({
    where: { id },
    include: {
      omadaController: { select: { id: true, name: true } },
    },
  });
}

export async function uniqueLocationSlug(name: string, excludeId?: string) {
  const base = slugify(name);
  let slug = base;
  let attempt = 2;

  while (true) {
    const existing = await prisma.location.findUnique({ where: { slug } });
    if (!existing || existing.id === excludeId) {
      return slug;
    }
    slug = `${base}-${attempt}`;
    attempt += 1;
  }
}

export async function createLocation(data: Prisma.LocationCreateInput) {
  return prisma.location.create({ data });
}

export async function updateLocation(id: string, data: Prisma.LocationUpdateInput) {
  return prisma.location.update({ where: { id }, data });
}

export async function listOmadaControllers() {
  return prisma.omadaController.findMany({
    where: { active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}
