"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function AdminSignOut() {
  return (
    <Button variant="outline" className="h-9" onClick={() => signOut({ callbackUrl: "/" })}>
      Logout
    </Button>
  );
}
