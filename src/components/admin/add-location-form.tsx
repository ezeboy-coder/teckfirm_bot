"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createLocationAction, type AdminActionState } from "@/app/admin/actions";

const initial: AdminActionState = {};

type LocationKind = "COMMUNITY" | "COMMUNITY_AND_LODGE";

export function AddLocationForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [kind, setKind] = useState<LocationKind>("COMMUNITY");
  const [state, action, pending] = useActionState(createLocationAction, initial);

  useEffect(() => {
    if (state.success) {
      toast.success("Omada connection confirmed. Location added.");
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Location type</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="kind"
            value="COMMUNITY"
            checked={kind === "COMMUNITY"}
            onChange={() => setKind("COMMUNITY")}
          />
          Community
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="kind"
            value="COMMUNITY_AND_LODGE"
            checked={kind === "COMMUNITY_AND_LODGE"}
            onChange={() => setKind("COMMUNITY_AND_LODGE")}
          />
          Community and lodges
        </label>
        <p className="text-xs text-muted-foreground">
          Community shows as the community name. Community and lodges shows as community / lodge
          name.
        </p>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="location-community">Community</Label>
        <Input id="location-community" name="community" required className="h-11" placeholder="Gbagada" />
      </div>

      {kind === "COMMUNITY_AND_LODGE" ? (
        <div className="space-y-2">
          <Label htmlFor="location-lodge">Lodge name</Label>
          <Input id="location-lodge" name="lodgeName" required className="h-11" placeholder="Lodge A" />
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="location-omada-device-id">Omada Device ID</Label>
        <Input
          id="location-omada-device-id"
          name="omadaDeviceId"
          required
          className="h-11 font-mono"
          autoComplete="off"
          spellCheck={false}
          placeholder="From the Cloud Access URL"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="location-omada-id">Omada ID</Label>
        <Input
          id="location-omada-id"
          name="omadaId"
          required
          className="h-11 font-mono"
          autoComplete="off"
          spellCheck={false}
          placeholder="From the Cloud Access URL"
        />
        <p className="text-xs text-muted-foreground">
          Open this OC200 in Omada Cloud and copy both IDs from the address bar
          path /omadac/deviceId/omadaId. We will reach this controller before
          saving the location.
        </p>
      </div>

      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <Button type="submit" className="h-11 w-full sm:w-auto" disabled={pending}>
        {pending ? "Checking controller…" : "Add Location"}
      </Button>
    </form>
  );
}
