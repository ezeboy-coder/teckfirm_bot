import { prisma } from "@/lib/db/prisma";

const SITE_SETTING_ID = "site";

export async function getSiteSetting() {
  return prisma.siteSetting.findUnique({ where: { id: SITE_SETTING_ID } });
}

export async function upsertSupportPhone(supportPhone: string | null) {
  return prisma.siteSetting.upsert({
    where: { id: SITE_SETTING_ID },
    create: { id: SITE_SETTING_ID, supportPhone },
    update: { supportPhone },
  });
}
