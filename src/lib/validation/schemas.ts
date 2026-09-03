import { z } from "zod";
import { parseNairaInput } from "@/lib/utils/money";
import { isElevenDigitCode, isNigerianPhone } from "@/lib/utils/phone";
import { isRetrievalPin } from "@/lib/utils/pin";

export const emailSchema = z.string().trim().email("Enter a valid email address");

export const nigerianPhoneSchema = z
  .string()
  .trim()
  .refine(isNigerianPhone, "Enter a valid Nigerian phone number");

export const guestPhoneSchema = z
  .string()
  .trim()
  .refine(isElevenDigitCode, "Enter an 11-digit phone number");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password is too long");

export const loginSchema = z.object({
  identifier: z.string().trim().min(3, "Enter your email or phone number"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  firstName: z.string().trim().min(2, "First name is required").max(80),
  lastName: z.string().trim().max(80).optional(),
  email: emailSchema,
  phone: nigerianPhoneSchema.optional(),
  password: passwordSchema,
});

export const omadaPathIdSchema = z
  .string()
  .trim()
  .min(8, "Copy the ID from the Omada Cloud address bar")
  .max(80, "That ID is too long")
  .regex(/^[A-Za-z0-9_-]+$/, "Use the ID from the Omada Cloud URL");

export const voucherCheckSchema = z.object({
  locationId: z.string().trim().min(1, "Choose a location"),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit voucher code"),
});

export const retrievalPinSchema = z
  .string()
  .trim()
  .refine(isRetrievalPin, "Enter a unique 5-digit PIN");

export const guestCheckoutDetailsSchema = z.object({
  pin: retrievalPinSchema,
  phone: guestPhoneSchema,
});

export const guestCheckoutInitializeSchema = guestCheckoutDetailsSchema.extend({
  locationId: z.string().trim().min(1, "Choose a location"),
  planId: z.string().trim().min(1, "Choose a plan"),
});

export const guestVoucherLookupSchema = guestCheckoutDetailsSchema.extend({
  locationId: z.string().trim().min(1, "Choose a location"),
});

const emptyToUndefined = (value: unknown) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
};

export const adminLocationIdSchema = z.object({
  locationId: z.string().trim().min(1, "Choose a location"),
});

export const adminLocationNameSchema = z.object({
  locationId: z.string().trim().min(1, "Choose a location"),
  community: z.string().trim().min(2, "Enter the community name").max(120),
  lodgeName: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
});

export const adminPriceIdSchema = z.object({
  planId: z.string().trim().min(1, "Choose a price"),
});

export const adminSupportPhoneSchema = z.object({
  supportPhone: guestPhoneSchema,
});

export const paystackReferenceSchema = z.object({
  reference: z.string().trim().min(8, "Missing payment reference").max(80),
});

export const adminOrderStatusSchema = z.discriminatedUnion("intent", [
  z.object({
    intent: z.literal("cancelled"),
    orderId: z.string().trim().min(1, "Choose an order"),
    locationId: z.string().trim().min(1, "Choose a location"),
  }),
  z.object({
    intent: z.literal("paid"),
    orderId: z.string().trim().min(1, "Choose an order"),
    locationId: z.string().trim().min(1, "Choose a location"),
    voucherCode: z
      .string()
      .trim()
      .regex(/^\d{6}$/, "Enter the 6-digit voucher code"),
  }),
  z.object({
    intent: z.literal("attach_voucher"),
    orderId: z.string().trim().min(1, "Choose an order"),
    locationId: z.string().trim().min(1, "Choose a location"),
    voucherCode: z
      .string()
      .trim()
      .regex(/^\d{6}$/, "Enter the 6-digit voucher code"),
  }),
]);

export const adminLocationCreateSchema = z
  .object({
    kind: z.enum(["COMMUNITY", "COMMUNITY_AND_LODGE"]),
    community: z.string().trim().min(2, "Enter the community name").max(120),
    lodgeName: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
    omadaDeviceId: omadaPathIdSchema,
    omadaId: omadaPathIdSchema,
  })
  .superRefine((data, ctx) => {
    if (data.kind === "COMMUNITY_AND_LODGE" && !data.lodgeName) {
      ctx.addIssue({
        code: "custom",
        message: "Enter the lodge name",
        path: ["lodgeName"],
      });
    }
  });

export const adminPriceCreateSchema = z
  .object({
    priceNaira: z.preprocess((value) => {
      if (value === "" || value === null || value === undefined) return undefined;
      const parsed = parseNairaInput(value);
      return parsed;
    }, z.number({ error: "Enter a price in naira" }).min(50, "Price must be at least ₦50").max(500_000, "Price is too high")),
    dataKind: z.enum(["GIG", "UNLIMITED_DAILY", "UNLIMITED_MONTHLY"]),
    gigAmount: z.preprocess((value) => {
      if (value === "" || value === null || value === undefined) return undefined;
      return value;
    }, z.coerce.number().int().min(1).max(10_000).optional()),
    deviceLimit: z.preprocess((value) => {
      if (value === "" || value === null || value === undefined) return undefined;
      return value;
    }, z.coerce.number().int().min(1).max(20).optional()),
  })
  .superRefine((data, ctx) => {
    if (data.dataKind === "GIG" && !data.gigAmount) {
      ctx.addIssue({
        code: "custom",
        message: "Enter the data size in GB",
        path: ["gigAmount"],
      });
    }
    if (
      (data.dataKind === "UNLIMITED_DAILY" || data.dataKind === "UNLIMITED_MONTHLY") &&
      !data.deviceLimit
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Enter how many devices this unlimited voucher can use",
        path: ["deviceLimit"],
      });
    }
  });
