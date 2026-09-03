import Link from "next/link";
import { Logo } from "@/components/logo";
import { AdminSignOut } from "@/components/admin/admin-sign-out";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { isStaffRole } from "@/lib/auth/roles";
import { prisma } from "@/lib/db/prisma";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    return (
      <div className="flex min-h-full flex-1 flex-col bg-[radial-gradient(circle_at_top,var(--color-primary)/12,transparent_42%)]">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
          <div className="mb-8 flex justify-center">
            <Logo />
          </div>
          <AdminLoginForm />
        </div>
      </div>
    );
  }

  const dbUser = session.user.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true, firstName: true, status: true },
      })
    : null;
  const role = dbUser?.role ?? session.user.role;
  const firstName = dbUser?.firstName ?? session.user.firstName;

  if (!dbUser || dbUser.status !== "ACTIVE" || !isStaffRole(role)) {
    return (
      <div className="flex min-h-full flex-1 flex-col bg-[radial-gradient(circle_at_top,var(--color-primary)/12,transparent_42%)]">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
          <div className="mb-8 flex justify-center">
            <Logo />
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Admin access needed</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                You are signed in as {firstName}, but this account cannot open the admin console.
              </p>
              <AdminSignOut />
              <p className="text-center text-sm text-muted-foreground">
                <Link href="/" className="underline">
                  Back to buy WiFi
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex items-center justify-between border-b bg-background px-4 py-3">
        <div>
          <Logo href="/admin" />
          <p className="mt-1 text-xs text-muted-foreground">Admin · {firstName}</p>
        </div>
        <AdminSignOut />
      </header>
      <div className="flex-1 bg-muted/20 p-4 sm:p-8">{children}</div>
    </div>
  );
}
