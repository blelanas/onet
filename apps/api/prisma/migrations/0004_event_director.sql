-- AlterTable
-- An event's director (a member). ADD COLUMN only: Prisma's diff would rebuild "Event" (CREATE new_Event /
-- DROP TABLE / RENAME), and inside the migrator's transaction the DROP would cascade and delete the
-- registrations, teams, invoices links… (see 0003).
ALTER TABLE "Event" ADD COLUMN "directorId" TEXT REFERENCES "Member" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Event_directorId_idx" ON "Event"("directorId");
