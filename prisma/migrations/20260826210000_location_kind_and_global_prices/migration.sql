-- CreateEnum
CREATE TYPE "LocationKind" AS ENUM ('COMMUNITY', 'COMMUNITY_AND_LODGE');

-- AlterTable
ALTER TABLE "Location" ADD COLUMN "kind" "LocationKind" NOT NULL DEFAULT 'COMMUNITY';
ALTER TABLE "Location" ADD COLUMN "community" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Location" ADD COLUMN "lodgeName" TEXT;
ALTER TABLE "Location" ADD COLUMN "omadaControllerIp" TEXT;

UPDATE "Location"
SET "community" = CASE
  WHEN btrim("city") <> '' THEN "city"
  ELSE "name"
END
WHERE "community" = '';

ALTER TABLE "Location" ALTER COLUMN "community" DROP DEFAULT;

CREATE INDEX "Location_kind_community_idx" ON "Location"("kind", "community");

-- Prices apply to every location: detach existing plans and allow null locationId.
ALTER TABLE "Plan" DROP CONSTRAINT "Plan_locationId_fkey";
ALTER TABLE "Plan" ALTER COLUMN "locationId" DROP NOT NULL;
UPDATE "Plan" SET "locationId" = NULL;
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Plan_active_displayOrder_idx" ON "Plan"("active", "displayOrder");
