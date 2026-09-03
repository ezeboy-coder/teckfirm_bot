import { planTermsFromAdminInput } from "@/lib/plans/terms";
import { nairaToKobo } from "@/lib/utils/money";
import type { adminPriceCreateSchema } from "@/lib/validation/schemas";
import {
  alignGigPlanTerms,
  countPlanRecords,
  createPlan,
  deactivatePlan,
  getPlanById,
  hardDeletePlan,
  listActivePlans,
  listAdminPlans,
  listFeaturedPlans,
} from "@/repositories/plan.repository";
import { writeAuditLog } from "@/services/audit.service";
import type { z } from "zod";

type AdminPriceInput = z.infer<typeof adminPriceCreateSchema>;

function priceLabel(input: AdminPriceInput) {
  if (input.dataKind === "UNLIMITED_DAILY" || input.dataKind === "UNLIMITED_MONTHLY") {
    const devices = input.deviceLimit ?? 1;
    const period = input.dataKind === "UNLIMITED_DAILY" ? "daily" : "monthly";
    return `Unlimited ${period} · ${devices} device${devices === 1 ? "" : "s"}`;
  }
  return `${input.gigAmount} GB`;
}

export const planService = {
  listPublic: listActivePlans,
  listFeatured: listFeaturedPlans,
  getById: getPlanById,
  async listAdmin() {
    await alignGigPlanTerms();
    return listAdminPlans();
  },

  async createPrice(input: AdminPriceInput, actorId: string) {
    const terms = planTermsFromAdminInput(input);
    const name = priceLabel(input);

    const plan = await createPlan({
      name,
      priceKobo: nairaToKobo(input.priceNaira),
      duration: terms.duration,
      durationUnit: terms.durationUnit,
      dataAllowance: terms.dataAllowance,
      dataUnit: terms.dataUnit,
      deviceLimit: terms.deviceLimit,
      active: true,
      featured: input.dataKind === "UNLIMITED_MONTHLY",
      displayOrder: 0,
    });

    await writeAuditLog({
      actorId,
      action: "plan.create",
      resource: "Plan",
      resourceId: plan.id,
      newData: {
        name: plan.name,
        priceKobo: plan.priceKobo,
        dataUnit: plan.dataUnit,
        duration: plan.duration,
        durationUnit: plan.durationUnit,
        deviceLimit: plan.deviceLimit,
      },
    });
    return plan;
  },

  async remove(id: string, actorId: string) {
    const record = await countPlanRecords(id);
    if (!record || !record.active || record.locationId !== null) {
      throw new Error("That price is not available to delete.");
    }

    const related = record._count.vouchers + record._count.orderItems;
    if (related === 0) {
      await hardDeletePlan(id);
    } else {
      await deactivatePlan(id);
    }

    await writeAuditLog({
      actorId,
      action: related === 0 ? "plan.delete" : "plan.deactivate",
      resource: "Plan",
      resourceId: id,
      previousData: { name: record.name, related },
    });
  },
};
