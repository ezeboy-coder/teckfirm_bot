-- Restore the column so running Prisma clients that still select it do not fail.
-- Guest live/off status is probed from Omada Cloud, not this flag.
ALTER TABLE "Location" ADD COLUMN "controllerLive" BOOLEAN NOT NULL DEFAULT true;
