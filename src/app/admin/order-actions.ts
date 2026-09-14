"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/auth/session";
import { hasMinRole } from "@/lib/auth/roles";
import { PaystackNotConfiguredError } from "@/lib/paystack/errors";
import { adminOrderStatusSchema } from "@/lib/validation/schemas";
import { orderService, type AdminPaymentSyncSummary } from "@/services/order.service";

export type AdminOrderActionState = {
  error?: string;
  success?: boolean;
  intent?: "paid" | "cancelled" | "attach_voucher" | "refresh_pending";
  summary?: AdminPaymentSyncSummary;
};

async function requireCatalogAdmin() {
  const session = await getCurrentSession();
  if (!session?.user || !hasMinRole(session.user.role, "ADMIN")) {
    return null;
  }
  return session;
}

function formObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function updateLocationOrderAction(
  _prev: AdminOrderActionState,
  formData: FormData,
): Promise<AdminOrderActionState> {
  const session = await requireCatalogAdmin();
  if (!session) {
    return { error: "You need an admin account to update orders." };
  }

  const parsed = adminOrderStatusSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the order details." };
  }

  try {
    if (parsed.data.intent === "refresh_pending") {
      const summary = await orderService.syncLocationPendingPayments({
        locationId: parsed.data.locationId,
        actorId: session.user.id,
      });
      revalidatePath(`/admin/locations/${parsed.data.locationId}`);
      revalidatePath("/admin");
      return { success: true, intent: "refresh_pending", summary };
    }

    if (parsed.data.intent === "cancelled") {
      await orderService.cancelStalePendingOrder({
        orderId: parsed.data.orderId,
        locationId: parsed.data.locationId,
        actorId: session.user.id,
      });
    } else if (parsed.data.intent === "attach_voucher") {
      await orderService.attachIssuedVoucher({
        orderId: parsed.data.orderId,
        locationId: parsed.data.locationId,
        voucherCode: parsed.data.voucherCode,
        actorId: session.user.id,
      });
    } else {
      await orderService.markStalePendingPaidWithVoucher({
        orderId: parsed.data.orderId,
        locationId: parsed.data.locationId,
        voucherCode: parsed.data.voucherCode,
        actorId: session.user.id,
      });
    }
  } catch (error) {
    if (error instanceof PaystackNotConfiguredError) {
      return { error: error.message };
    }
    const message = error instanceof Error ? error.message : "Could not update that order.";
    return { error: message };
  }

  revalidatePath(`/admin/locations/${parsed.data.locationId}`);
  revalidatePath("/admin");
  return { success: true, intent: parsed.data.intent };
}
