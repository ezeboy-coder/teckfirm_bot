import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";
import type { Prisma } from "@prisma/client";

type AuditInput = {
  actorId?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  previousData?: Prisma.InputJsonValue | null;
  newData?: Prisma.InputJsonValue | null;
};

export async function writeAuditLog(input: AuditInput) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        action: input.action,
        resource: input.resource,
        resourceId: input.resourceId ?? null,
        previousData: input.previousData ?? undefined,
        newData: input.newData ?? undefined,
      },
    });
  } catch (error) {
    logger.error("Failed to write audit log", {
      action: input.action,
      resource: input.resource,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}
