"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { updateLocationOrderAction, type AdminOrderActionState } from "@/app/admin/order-actions";
import { STALE_PENDING_MS } from "@/lib/admin/order-status";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const initial: AdminOrderActionState = {};

function useStaleReady(createdAt: string, alreadyReady: boolean) {
  const readyAt = new Date(createdAt).getTime() + STALE_PENDING_MS;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (alreadyReady) return;
    const remaining = readyAt - Date.now();
    if (remaining <= 0) return;
    const timer = window.setTimeout(() => setNow(Date.now()), remaining);
    return () => window.clearTimeout(timer);
  }, [alreadyReady, readyAt]);

  return alreadyReady || now >= readyAt;
}

function VoucherCodeFields({
  orderId,
  locationId,
  intent,
}: {
  orderId: string;
  locationId: string;
  intent: "paid" | "attach_voucher";
}) {
  return (
    <>
      <input type="hidden" name="intent" value={intent} />
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="locationId" value={locationId} />
      <div className="space-y-2">
        <Label htmlFor={`voucher-${orderId}`}>Voucher code</Label>
        <Input
          id={`voucher-${orderId}`}
          name="voucherCode"
          inputMode="numeric"
          autoComplete="off"
          required
          maxLength={6}
          className="h-11 font-mono tracking-widest"
          placeholder="000000"
        />
      </div>
    </>
  );
}

export function LocationOrderStatus({
  orderId,
  locationId,
  statusLabel,
  createdAt,
  isOpenPending,
  needsVoucher,
  referenceTail,
  canResolve,
}: {
  orderId: string;
  locationId: string;
  statusLabel: string;
  createdAt: string;
  isOpenPending: boolean;
  needsVoucher: boolean;
  referenceTail: string;
  canResolve: boolean;
}) {
  const ready = useStaleReady(createdAt, canResolve);
  const [dialog, setDialog] = useState<"paid" | "cancelled" | "attach_voucher" | null>(null);
  const [state, action, pending] = useActionState(updateLocationOrderAction, initial);

  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
    }
    if (state.success) {
      toast.success(
        state.intent === "attach_voucher"
          ? "Voucher recorded."
          : state.intent === "paid"
            ? "Order marked as paid."
            : "Order marked as cancelled.",
      );
    }
  }, [state.error, state.intent, state.success]);

  if (needsVoucher) {
    return (
      <div className="space-y-2">
        <p>Paid</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8"
          onClick={() => setDialog("attach_voucher")}
        >
          Add voucher · {referenceTail}
        </Button>
        <Dialog
          open={dialog === "attach_voucher" && !state.success}
          onOpenChange={(open) => setDialog(open ? "attach_voucher" : null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add the issued voucher</DialogTitle>
              <DialogDescription>
                Payment is already paid. Match this to Paystack with reference ending {referenceTail},
                then enter the 6-digit voucher that was issued.
              </DialogDescription>
            </DialogHeader>
            <form action={action} className="space-y-4">
              <VoucherCodeFields orderId={orderId} locationId={locationId} intent="attach_voucher" />
              <DialogFooter>
                <DialogClose render={<Button variant="outline" type="button" />}>Back</DialogClose>
                <Button type="submit" disabled={pending}>
                  {pending ? "Saving…" : "Save voucher"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (!isOpenPending || !ready) {
    return <span>{statusLabel}</span>;
  }

  return (
    <div className="space-y-2">
      <p>{statusLabel}</p>
      <Select
        value={null}
        onValueChange={(value) => {
          if (value === "paid" || value === "cancelled") {
            setDialog(value);
          }
        }}
      >
        <SelectTrigger size="sm" className="h-8 min-w-28">
          <SelectValue placeholder="Update" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="paid">Paid</SelectItem>
          <SelectItem value="cancelled">Cancel</SelectItem>
        </SelectContent>
      </Select>

      <Dialog open={dialog === "paid" && !state.success} onOpenChange={(open) => setDialog(open ? "paid" : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark this order as paid?</DialogTitle>
            <DialogDescription>
              Enter the voucher code that was issued for this purchase. The code is not shown in logs.
            </DialogDescription>
          </DialogHeader>
          <form action={action} className="space-y-4">
            <VoucherCodeFields orderId={orderId} locationId={locationId} intent="paid" />
            <DialogFooter>
              <DialogClose render={<Button variant="outline" type="button" />}>Back</DialogClose>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Mark paid"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialog === "cancelled" && !state.success}
        onOpenChange={(open) => setDialog(open ? "cancelled" : null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this order?</DialogTitle>
            <DialogDescription>
              The activity list will show Cancelled. No voucher will be attached.
            </DialogDescription>
          </DialogHeader>
          <form action={action}>
            <input type="hidden" name="intent" value="cancelled" />
            <input type="hidden" name="orderId" value={orderId} />
            <input type="hidden" name="locationId" value={locationId} />
            <DialogFooter>
              <DialogClose render={<Button variant="outline" type="button" />}>Back</DialogClose>
              <Button type="submit" variant="destructive" disabled={pending}>
                {pending ? "Saving…" : "Cancel order"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
