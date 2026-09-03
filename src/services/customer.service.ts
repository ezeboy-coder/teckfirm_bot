import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db/prisma";
import { normalizeNigerianPhone } from "@/lib/utils/phone";
import type { registerSchema } from "@/lib/validation/schemas";
import type { z } from "zod";

export async function createCustomer(input: z.infer<typeof registerSchema>) {
  const email = input.email.toLowerCase();
  const phone = input.phone ? normalizeNigerianPhone(input.phone) : null;
  const passwordHash = await hashPassword(input.password);
  const name = [input.firstName, input.lastName].filter(Boolean).join(" ");

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        phone,
        firstName: input.firstName,
        lastName: input.lastName,
        name,
        passwordHash,
        role: "CUSTOMER",
        customerProfile: { create: {} },
        wallet: { create: { currency: "NGN", balanceKobo: 0 } },
      },
    });

    return user;
  });
}
