"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveSupportPhoneAction, type AdminActionState } from "@/app/admin/support-actions";
import { digitsOnly } from "@/lib/utils/pin";

const initial: AdminActionState = {};

export function SupportPhoneForm({ currentPhone }: { currentPhone: string }) {
  const [state, action, pending] = useActionState(saveSupportPhoneAction, initial);

  useEffect(() => {
    if (state.success) {
      toast.success("Support phone number saved.");
    }
  }, [state.success]);

  return (
    <form action={action} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Customers see this number when a payment is still pending after confirmation.
        They use it to call in complaints or enquiries with their payment reference.
      </p>
      <div className="space-y-2">
        <Label htmlFor="support-phone">Support phone number</Label>
        <Input
          id="support-phone"
          name="supportPhone"
          defaultValue={currentPhone}
          className="h-11"
          inputMode="numeric"
          autoComplete="tel"
          maxLength={11}
          placeholder="08012345678"
          required
          onChange={(event) => {
            event.target.value = digitsOnly(event.target.value, 11);
          }}
        />
        <p className="text-xs text-muted-foreground">Enter an 11-digit Nigerian number.</p>
      </div>
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <Button type="submit" className="h-11 w-full sm:w-auto" disabled={pending}>
        {pending ? "Saving…" : "Save support number"}
      </Button>
    </form>
  );
}
