"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { deletePriceAction, type AdminActionState } from "@/app/admin/actions";
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
      {pending ? "Deleting…" : "Delete plan"}
    </Button>
  );
}

export function DeletePriceButton({
  planId,
  priceLabel,
}: {
  planId: string;
  priceLabel: string;
}) {
  const [state, action] = useActionState(deletePriceAction, initial);

  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
    }
    if (state.success) {
      toast.success("Plan removed from the buy chat.");
    }
  }, [state.error, state.success]);

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="destructive" size="sm" />}>Delete</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {priceLabel}?</DialogTitle>
          <DialogDescription>
            It will stop showing for every location. Past voucher purchases that used this plan stay
            on record.
          </DialogDescription>
        </DialogHeader>
        <form action={action}>
          <input type="hidden" name="planId" value={planId} />
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
            <ConfirmDeleteButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
