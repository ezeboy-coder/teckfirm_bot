"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { deleteLocationAction, type AdminActionState } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const initial: AdminActionState = {};

function ConfirmDeleteButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending ? "Deleting…" : "Delete location"}
    </Button>
  );
}

export function DeleteLocationButton({
  locationId,
  locationName,
  from = "list",
}: {
  locationId: string;
  locationName: string;
  from?: "list" | "manage";
}) {
  const [state, action] = useActionState(deleteLocationAction, initial);

  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
    }
    if (state.success) {
      toast.success("Location removed from the buy chat.");
    }
  }, [state.error, state.success]);

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="destructive" size="sm" />}>Delete</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {locationName}?</DialogTitle>
          <DialogDescription>
            It will stop showing in the buy chat. Past voucher purchases stay on record for this
            location.
          </DialogDescription>
        </DialogHeader>
        <form action={action}>
          <input type="hidden" name="locationId" value={locationId} />
          <input type="hidden" name="from" value={from} />
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
            <ConfirmDeleteButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
