"use client";

import { useActionState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { updateLocationOrderAction, type AdminOrderActionState } from "@/app/admin/order-actions";
import { activityHref } from "@/lib/admin/activity-href";
import {
  ACTIVITY_DATE_PRESETS,
  type ActivityDateFilter,
  type ActivityDatePreset,
} from "@/lib/admin/activity-date";
import {
  ACTIVITY_STATUS_FILTERS,
  type ActivityStatusFilter,
} from "@/lib/admin/order-status";
import { formatLagosYmd } from "@/lib/time/nigeria";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const initial: AdminOrderActionState = {};

export function ActivityDateControls({
  locationId,
  statusFilter,
  dateFilter,
}: {
  locationId: string;
  statusFilter: ActivityStatusFilter;
  dateFilter: ActivityDateFilter;
}) {
  const router = useRouter();
  const [navigating, startTransition] = useTransition();

  function go(when: ActivityDatePreset, on: string | null = dateFilter.on) {
    startTransition(() => {
      router.push(
        activityHref(locationId, {
          status: statusFilter,
          when,
          on: when === "custom" ? on : null,
          page: 1,
        }),
        { scroll: false },
      );
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">Day</span>
      <Select
        value={dateFilter.preset}
        onValueChange={(value) => {
          if (!value) return;
          const next = ACTIVITY_DATE_PRESETS.find((item) => item.value === value)?.value ?? "all";
          if (next === "custom") {
            go("custom", dateFilter.on ?? formatLagosYmd());
            return;
          }
          go(next, null);
        }}
        disabled={navigating}
      >
        <SelectTrigger size="sm" className="h-8 min-w-28" aria-label="Filter activity by day">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ACTIVITY_DATE_PRESETS.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {dateFilter.preset === "custom" ? (
        <Input
          type="date"
          className="h-8 w-auto"
          value={dateFilter.on ?? ""}
          max={formatLagosYmd()}
          disabled={navigating}
          aria-label="Custom activity date"
          onChange={(event) => {
            const value = event.target.value;
            if (!value) return;
            go("custom", value);
          }}
        />
      ) : null}
    </div>
  );
}

export function ActivityStatusControls({
  locationId,
  statusFilter,
  dateFilter,
}: {
  locationId: string;
  statusFilter: ActivityStatusFilter;
  dateFilter: ActivityDateFilter;
}) {
  const router = useRouter();
  const [navigating, startTransition] = useTransition();
  const [state, action, pending] = useActionState(updateLocationOrderAction, initial);

  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
    }
    if (state.success && state.intent === "refresh_pending" && state.summary) {
      const { checked, paid, failed, pending: stillPending, manualReview, errors } = state.summary;
      if (checked === 0) {
        toast.message("No pending payments to refresh.");
        return;
      }
      const parts = [
        paid > 0 ? `${paid} paid` : null,
        failed > 0 ? `${failed} failed` : null,
        stillPending > 0 ? `${stillPending} still pending` : null,
        manualReview > 0 ? `${manualReview} need review` : null,
        errors > 0 ? `${errors} could not be checked` : null,
      ].filter(Boolean);
      toast.success(`Checked ${checked} pending payment${checked === 1 ? "" : "s"}. ${parts.join(", ")}.`);
    }
  }, [state.error, state.intent, state.success, state.summary]);

  return (
    <div className="inline-flex items-center gap-1.5">
      <span>Status</span>
      <Select
        value={statusFilter}
        onValueChange={(value) => {
          if (!value) return;
          const next = ACTIVITY_STATUS_FILTERS.find((item) => item.value === value)?.value ?? "all";
          startTransition(() => {
            router.push(
              activityHref(locationId, {
                status: next,
                when: dateFilter.preset,
                on: dateFilter.on,
                page: 1,
              }),
              { scroll: false },
            );
          });
        }}
        disabled={navigating}
      >
        <SelectTrigger size="sm" className="h-7 min-w-28" aria-label="Filter by transaction status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ACTIVITY_STATUS_FILTERS.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <form action={action} className="inline-flex">
        <input type="hidden" name="intent" value="refresh_pending" />
        <input type="hidden" name="locationId" value={locationId} />
        <Button
          type="submit"
          variant="ghost"
          size="icon-xs"
          disabled={pending}
          aria-label="Refresh pending payment statuses"
        >
          <RefreshCw className={cn(pending && "animate-spin")} />
        </Button>
      </form>
    </div>
  );
}
