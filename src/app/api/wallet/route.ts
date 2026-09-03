import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { apiSuccess } from "@/lib/api/response";
import { formatNgnFromKobo } from "@/lib/utils/money";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return apiSuccess(
      { authenticated: false, balanceKobo: 0, balanceLabel: formatNgnFromKobo(0) },
      "No saved wallet yet. Guest purchases are retrieved with My Vouchers.",
    );
  }

  const wallet = await prisma.wallet.findUnique({
    where: { userId: session.user.id },
    select: { balanceKobo: true },
  });

  const balanceKobo = wallet?.balanceKobo ?? 0;
  return apiSuccess(
    {
      authenticated: true,
      balanceKobo,
      balanceLabel: formatNgnFromKobo(balanceKobo),
    },
    "Wallet balance loaded",
  );
}
