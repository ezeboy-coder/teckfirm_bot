"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveSupportPhoneAction, type AdminActionState } from "@/app/admin/support-actions";
import { digitsOnly } from "@/lib/utils/pin";
import { splitSupportPhone } from "@/lib/utils/phone";

const initial: AdminActionState = {};

export function SupportPhoneForm({ currentPhone }: { currentPhone: string }) {
  const [state, action, pending] = useActionState(saveSupportPhoneAction, initial);
  const parts = splitSupportPhone(currentPhone);

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
      <div className="grid grid-cols-[7.5rem_1fr] gap-3">
        <div className="space-y-2">
          <Label htmlFor="support-country-code">Country code</Label>
          <Input
            id="support-country-code"
            name="countryCode"
            defaultValue={parts.countryCode ? `+${parts.countryCode}` : ""}
            className="h-11"
            inputMode="tel"
            autoComplete="tel-country-code"
            maxLength={5}
            placeholder="+234"
            required
            onChange={(event) => {
              const digits = digitsOnly(event.target.value.replace(/^\+/, ""), 4);
              event.target.value = digits ? `+${digits}` : event.target.value.startsWith("+") ? "+" : "";
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="support-phone">Phone number</Label>
          <Input
            id="support-phone"
            name="supportPhone"
            defaultValue={parts.nationalNumber}
            className="h-11"
            inputMode="numeric"
            autoComplete="tel-national"
            maxLength={12}
            placeholder="8012345678"
            required
            onChange={(event) => {
              event.target.value = digitsOnly(event.target.value, 12);
            }}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        These fields load from the saved support contact. Enter the local number without the country
        code.
      </p>
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <Button type="submit" className="h-11 w-full sm:w-auto" disabled={pending}>
        {pending ? "Saving…" : "Save support number"}
      </Button>
    </form>
  );
}
