"use client";

import { Logo } from "@/components/logo";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-lg items-center px-4 sm:max-w-2xl">
        <Logo />
      </div>
    </header>
  );
}
