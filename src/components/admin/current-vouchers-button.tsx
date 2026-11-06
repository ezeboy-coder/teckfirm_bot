"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatNgnFromKobo } from "@/lib/utils/money";

type AdminActiveVoucher = {
  id: string;
  code: string;
  location: string;
  status: "unused" | "in-use";
  priceKobo: number;
  size: string;
  remainingData: string;
};

type ActiveVouchersResponse =
  | { success: true; message: string; data: { vouchers: AdminActiveVoucher[] } }
  | { success: false; message: string };

function statusLabel(status: AdminActiveVoucher["status"]) {
  return status === "in-use" ? "In use" : "Unused";
}

export function AdminActiveVouchersButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vouchers, setVouchers] = useState<AdminActiveVoucher[] | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  function handleOpenChange(next: boolean) {
    abortRef.current?.abort();
    setOpen(next);
    if (!next) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);

    void fetch("/api/admin/vouchers/active", { signal: controller.signal })
      .then(async (response) => {
        const payload = (await response.json()) as ActiveVouchersResponse;
        if (!payload.success) {
          throw new Error(payload.message);
        }
        if (controller.signal.aborted) return;
        setVouchers(payload.data.vouchers);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setVouchers(null);
        setError(cause instanceof Error ? cause.message : "Could not load active vouchers.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" className="h-9" />}>
        Show voucher
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Active vouchers</DialogTitle>
          <DialogDescription>
            Unused and in-use vouchers, with the paid price, plan size, and remaining data.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading vouchers…</p>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : !vouchers || vouchers.length === 0 ? (
          <p className="text-sm text-muted-foreground">There are no active vouchers right now.</p>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Remaining data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vouchers.map((voucher) => (
                  <TableRow key={voucher.id}>
                    <TableCell className="font-medium">{voucher.code}</TableCell>
                    <TableCell>{voucher.location}</TableCell>
                    <TableCell>{statusLabel(voucher.status)}</TableCell>
                    <TableCell>{formatNgnFromKobo(voucher.priceKobo)}</TableCell>
                    <TableCell>{voucher.size}</TableCell>
                    <TableCell>{voucher.remainingData}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
