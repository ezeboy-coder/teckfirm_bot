"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/auth/session";
import { hasMinRole } from "@/lib/auth/roles";
import { adminSupportPhoneSchema } from "@/lib/validation/schemas";
import { saveSupportPhone } from "@/services/site-setting.service";

export type AdminActionState = {
  error?: string;
  success?: boolean;
};

export async function saveSupportPhoneAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const session = await getCurrentSession();
  if (!session?.user || !hasMinRole(session.user.role, "ADMIN")) {
    return { error: "You need an admin account to set the support number." };
  }

  const parsed = adminSupportPhoneSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter an 11-digit phone number." };
  }

  try {
    await saveSupportPhone(parsed.data.supportPhone);
  } catch {
    return { error: "Could not save that support number. Try again." };
  }

  revalidatePath("/");
  revalidatePath("/admin");
  return { success: true };
}
