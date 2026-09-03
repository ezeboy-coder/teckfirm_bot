"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ControllerStatus = "checking" | "active" | "off" | "unset";

export function LocationControllerStatus({
  locationId,
  locationName,
  omadaConfigured,
}: {
  locationId: string;
  locationName: string;
  omadaConfigured: boolean;
}) {
  const [status, setStatus] = useState<ControllerStatus>(omadaConfigured ? "checking" : "unset");

  const probe = useCallback(async () => {
    if (!omadaConfigured) {
      return "unset" as const;
    }

    try {
      const response = await fetch(`/api/admin/omada/test?locationId=${encodeURIComponent(locationId)}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        success: boolean;
        data?: { connected?: boolean };
      };
      return payload.success && payload.data?.connected ? ("active" as const) : ("off" as const);
    } catch {
      return "off" as const;
    }
  }, [locationId, omadaConfigured]);

  useEffect(() => {
    if (!omadaConfigured) return;

    let cancelled = false;
    void probe().then((next) => {
      if (!cancelled) setStatus(next);
    });
    return () => {
      cancelled = true;
    };
  }, [omadaConfigured, probe]);

  async function refresh() {
    if (!omadaConfigured) return;
    setStatus("checking");
    setStatus(await probe());
  }

  const label =
    status === "checking" ? "Checking" : status === "active" ? "Active" : status === "unset" ? "Not set" : "Off";

  return (
    <div className="flex items-center gap-0.5">
      <span
        className={cn(
          "text-xs font-medium",
          status === "active" ? "text-emerald-600" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        disabled={status === "checking" || !omadaConfigured}
        aria-label={`Refresh controller status for ${locationName}`}
        onClick={() => void refresh()}
      >
        <RefreshCw className={cn(status === "checking" && "animate-spin")} />
      </Button>
    </div>
  );
}
