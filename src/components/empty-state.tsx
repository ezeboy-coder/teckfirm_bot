import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
  icon: Icon = Inbox,
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed bg-muted/30 px-6 py-12 text-center">
      <Icon className="mb-3 size-8 text-muted-foreground" aria-hidden="true" />
      <h2 className="font-heading text-lg font-semibold">{title}</h2>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className={cn(buttonVariants({ size: "lg" }), "mt-5 h-11 px-5")}
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
