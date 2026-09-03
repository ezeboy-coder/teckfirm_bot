"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { hasMinRole } from "@/lib/auth/roles";
import {
  adminLocationCreateSchema,
  adminLocationIdSchema,
  adminLocationNameSchema,
  adminPriceCreateSchema,
  adminPriceIdSchema,
} from "@/lib/validation/schemas";
import { OmadaError } from "@/lib/omada/errors";
import { locationService } from "@/services/location.service";
import { planService } from "@/services/plan.service";

export type AdminActionState = {
  error?: string;
  success?: boolean;
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

function locationWriteError(error: unknown, fallback: string) {
  if (error instanceof OmadaError) {
    return error.message;
  }
  if (error instanceof Error && error.message.includes("Unique constraint")) {
    return "A location with that name already exists.";
  }
  return fallback;
}

export async function createLocationAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const session = await requireCatalogAdmin();
  if (!session) {
    return { error: "You need an admin account to add locations." };
  }

  const parsed = adminLocationCreateSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the location details." };
  }

  try {
    await locationService.create(parsed.data, session.user.id);
  } catch (error) {
    return { error: locationWriteError(error, "Could not save that location. Try again.") };
  }

  revalidatePath("/");
  revalidatePath("/admin");
  return { success: true };
}

export async function createPriceAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const session = await requireCatalogAdmin();
  if (!session) {
    return { error: "You need an admin account to set prices." };
  }

  const parsed = adminPriceCreateSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the price details." };
  }

  try {
    await planService.createPrice(parsed.data, session.user.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save that price.";
    return { error: message };
  }

  revalidatePath("/");
  revalidatePath("/admin");
  return { success: true };
}

export async function updateLocationNameAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const session = await requireCatalogAdmin();
  if (!session) {
    return { error: "You need an admin account to update this location." };
  }

  const parsed = adminLocationNameSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the location name." };
  }

  try {
    await locationService.updateName(parsed.data.locationId, parsed.data, session.user.id);
  } catch (error) {
    return { error: locationWriteError(error, "Could not save that name.") };
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath(`/admin/locations/${parsed.data.locationId}`);
  return { success: true };
}

export async function deleteLocationAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const session = await requireCatalogAdmin();
  if (!session) {
    return { error: "You need an admin account to delete locations." };
  }

  const parsed = adminLocationIdSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Choose a location to delete." };
  }

  try {
    await locationService.remove(parsed.data.locationId, session.user.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete that location.";
    return { error: message };
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath(`/admin/locations/${parsed.data.locationId}`);

  if (String(formData.get("from") ?? "") === "manage") {
    redirect("/admin");
  }

  return { success: true };
}

export async function deletePriceAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const session = await requireCatalogAdmin();
  if (!session) {
    return { error: "You need an admin account to delete prices." };
  }

  const parsed = adminPriceIdSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Choose a price to delete." };
  }

  try {
    await planService.remove(parsed.data.planId, session.user.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete that price.";
    return { error: message };
  }

  revalidatePath("/");
  revalidatePath("/admin");
  return { success: true };
}
