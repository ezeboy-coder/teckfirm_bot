export const siteConfig = {
  name: "TeckFirm WiFi",
  shortName: "TeckFirm",
  company: "TeckFirm",
  companyUrl: "https://teckfirm.org",
  description:
    "Purchase TeckFirm WiFi hotspot vouchers online and connect instantly across supported locations in Nigeria.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  supportEmail: "support@teckfirm.org",
  supportPhone: "+234 800 000 0000",
  currency: "NGN",
  locale: "en-NG",
} as const;

export const STAFF_ROLES = [
  "SUPPORT",
  "MANAGER",
  "ADMIN",
  "SUPER_ADMIN",
] as const;

export const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"] as const;
