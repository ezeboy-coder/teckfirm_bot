import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  compact = false,
  href = "/",
}: {
  className?: string;
  compact?: boolean;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        className,
      )}
      aria-label="TeckFirm WiFi home"
    >
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
          <path
            fill="currentColor"
            d="M12 18.5a1.5 1.5 0 1 1 0 3a1.5 1.5 0 0 1 0-3Zm0-5.2c1.7 0 3.25.7 4.37 1.82l-1.5 1.5A4.47 4.47 0 0 0 12 15.3c-1.2 0-2.28.47-3.07 1.24l-1.5-1.5A6.47 6.47 0 0 1 12 13.3Zm0-4.4c2.9 0 5.53 1.18 7.43 3.08l-1.5 1.5A8.45 8.45 0 0 0 12 11.3c-2.27 0-4.33.92-5.82 2.41l-1.5-1.5A10.45 10.45 0 0 1 12 8.9Zm0-4.4c4.1 0 7.82 1.67 10.51 4.36l-1.5 1.5A12.94 12.94 0 0 0 12 6.9C8.5 6.9 5.35 8.32 3.1 10.67L1.6 9.17A16.94 16.94 0 0 1 12 4.5Z"
          />
        </svg>
      </span>
      {compact ? null : (
        <span className="leading-tight">
          <span className="block text-sm font-semibold tracking-tight text-foreground">
            TeckFirm
          </span>
          <span className="block text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
            WiFi
          </span>
        </span>
      )}
    </Link>
  );
}
