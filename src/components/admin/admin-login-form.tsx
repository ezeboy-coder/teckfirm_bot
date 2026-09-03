"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const LOGIN_FAILED = "That email, phone, or password is incorrect. Try again.";

export function AdminLoginForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    setPending(true);

    try {
      const result = await signIn("credentials", {
        identifier: String(form.get("identifier") ?? ""),
        password: String(form.get("password") ?? ""),
        redirect: false,
      });

      if (!result || result.error || result.ok === false) {
        setError(LOGIN_FAILED);
        toast.error(LOGIN_FAILED);
        return;
      }

      toast.success("Welcome back");
      router.replace("/admin");
      router.refresh();
    } catch {
      setError(LOGIN_FAILED);
      toast.error(LOGIN_FAILED);
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Admin login</CardTitle>
        <p className="text-sm text-muted-foreground">
          Customers buy WiFi from the home chat. No account is required.
        </p>
      </CardHeader>
      <CardContent>
        <form method="post" action="/admin" onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="identifier">Email or phone</Label>
            <Input
              id="identifier"
              name="identifier"
              className="h-12"
              required
              autoComplete="username"
              aria-invalid={Boolean(error)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              className="h-12"
              required
              autoComplete="current-password"
              aria-invalid={Boolean(error)}
            />
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="h-12 w-full" disabled={pending}>
            {pending ? "Signing in..." : "Login"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link href="/" className="underline">
            Back to buy WiFi
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
