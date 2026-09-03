-- AlterTable
ALTER TABLE "Location" ADD COLUMN "omadaDeviceId" TEXT;
ALTER TABLE "Location" ADD COLUMN "omadaId" TEXT;

-- DropIndex
DROP INDEX IF EXISTS "Voucher_code_key";

-- CreateIndex
CREATE UNIQUE INDEX "Voucher_locationId_code_key" ON "Voucher"("locationId", "code");
CREATE INDEX "Voucher_code_idx" ON "Voucher"("code");
