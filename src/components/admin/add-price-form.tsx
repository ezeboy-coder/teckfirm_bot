"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatNairaGrouping } from "@/lib/utils/money";
import { createPriceAction, type AdminActionState } from "@/app/admin/actions";

const initial: AdminActionState = {};

export function AddPriceForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [dataKind, setDataKind] = useState<"GIG" | "UNLIMITED_DAILY" | "UNLIMITED_MONTHLY">("GIG");
  const [state, action, pending] = useActionState(createPriceAction, initial);

  useEffect(() => {
    if (state.success) {
      toast.success("Plan added. It now applies to every community and lodge.");
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <p className="text-xs text-muted-foreground">
        These plans apply to every community and lodge. You do not set a separate plan per location.
      </p>

      <div className="space-y-2">
        <Label htmlFor="price-naira">Price (₦)</Label>
        <Input
          id="price-naira"
          name="priceNaira"
          inputMode="numeric"
          autoComplete="off"
          required
          className="h-11"
          placeholder="1,000"
          onChange={(event) => {
            event.target.value = formatNairaGrouping(event.target.value);
          }}
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Data</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="dataKind"
            value="GIG"
            checked={dataKind === "GIG"}
            onChange={() => setDataKind("GIG")}
          />
          Gig (GB)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="dataKind"
            value="UNLIMITED_DAILY"
            checked={dataKind === "UNLIMITED_DAILY"}
            onChange={() => setDataKind("UNLIMITED_DAILY")}
          />
          Unlimited daily
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="dataKind"
            value="UNLIMITED_MONTHLY"
            checked={dataKind === "UNLIMITED_MONTHLY"}
            onChange={() => setDataKind("UNLIMITED_MONTHLY")}
          />
          Unlimited monthly
        </label>
      </fieldset>

      {dataKind === "GIG" ? (
        <div className="space-y-2">
          <Label htmlFor="gig-amount">Data size (GB)</Label>
          <Input id="gig-amount" name="gigAmount" type="number" min={1} required className="h-11" placeholder="2" />
          <p className="text-xs text-muted-foreground">
            Valid for 30 days. The traffic limit is the total of this GB amount. Devices are unlimited.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="device-limit">Number of devices</Label>
          <Input
            id="device-limit"
            name="deviceLimit"
            type="number"
            min={1}
            max={20}
            required
            className="h-11"
            placeholder="1"
          />
          <p className="text-xs text-muted-foreground">
            {dataKind === "UNLIMITED_DAILY"
              ? "Valid for 1 day. No traffic limit. Only this many devices can use the voucher."
              : "Valid for 30 days. No traffic limit. Only this many devices can use the voucher."}
          </p>
        </div>
      )}

      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <Button type="submit" className="h-11 w-full sm:w-auto" disabled={pending}>
        {pending ? "Saving…" : "Add Plan"}
      </Button>
    </form>
  );
}
