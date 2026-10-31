-- AlterTable
-- How often an event meets (ONCE | DAILY | WEEKLY | MONTHLY): its sessions are the roll-call days of the
-- attendance tab. ADD COLUMN only: Prisma's diff would rebuild "Event" (CREATE new_Event / DROP TABLE / RENAME),
-- and inside the migrator's transaction the DROP would cascade and delete the registrations, teams… (see 0003).
ALTER TABLE "Event" ADD COLUMN "frequency" TEXT NOT NULL DEFAULT 'ONCE';

-- Existing editions: a club meets every week, a festival every day.
UPDATE "Event" SET "frequency" = 'WEEKLY' WHERE "seriesId" IN (SELECT "id" FROM "EventSeries" WHERE "kind" = 'CLUB');
UPDATE "Event" SET "frequency" = 'DAILY' WHERE "seriesId" IN (SELECT "id" FROM "EventSeries" WHERE "kind" = 'FESTIVAL');
