import { getSiteSetting, upsertSupportPhone } from "@/repositories/site-setting.repository";

export async function getSupportPhone(): Promise<string | null> {
  const setting = await getSiteSetting();
  const phone = setting?.supportPhone?.trim();
  return phone ? phone : null;
}

export async function saveSupportPhone(supportPhone: string) {
  return upsertSupportPhone(supportPhone);
}
