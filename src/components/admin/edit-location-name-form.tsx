"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateLocationNameAction, type AdminActionState } from "@/app/admin/actions";

const initial: AdminActionState = {};

export function EditLocationNameForm({
  locationId,
  kind,
  community,
  lodgeName,
}: {
  locationId: string;
  kind: "COMMUNITY" | "COMMUNITY_AND_LODGE";
  community: string;
  lodgeName: string;
}) {
  const [state, action, pending] = useActionState(updateLocationNameAction, initial);

  useEffect(() => {
    if (state.success) {
      toast.success("Location name saved.");
    }
  }, [state.success]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locationId" value={locationId} />
      <div className="space-y-2">
        <Label htmlFor="edit-location-community">Community</Label>
        <Input
          id="edit-location-community"
          name="community"
          required
          defaultValue={community}
          className="h-11"
        />
      </div>
      {kind === "COMMUNITY_AND_LODGE" ? (
        <div className="space-y-2">
          <Label htmlFor="edit-location-lodge">Lodge name</Label>
          <Input
            id="edit-location-lodge"
            name="lodgeName"
            required
            defaultValue={lodgeName}
            className="h-11"
          />
        </div>
      ) : null}
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <Button type="submit" className="h-11 w-full sm:w-auto" disabled={pending}>
        {pending ? "Saving…" : "Save name"}
      </Button>
    </form>
  );
}
