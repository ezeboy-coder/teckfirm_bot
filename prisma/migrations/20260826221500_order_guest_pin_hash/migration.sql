-- AlterTable
ALTER TABLE "Order" ADD COLUMN "guestPinHash" TEXT;

CREATE INDEX "Order_guestPhone_guestPinHash_idx" ON "Order"("guestPhone", "guestPinHash");
