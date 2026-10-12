-- AlterTable
ALTER TABLE "Member" ADD COLUMN "occupation" TEXT;
ALTER TABLE "Member" ADD COLUMN "occupationDetail" TEXT;

-- AlterTable
ALTER TABLE "Trip" ADD COLUMN "listClosedAt" DATETIME;
ALTER TABLE "Trip" ADD COLUMN "listClosedById" TEXT;

-- CreateTable
CREATE TABLE "EventSeries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'CLUB',
    "description" TEXT,
    "coverUrl" TEXT,
    "color" TEXT NOT NULL DEFAULT '#12924A',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "EventTeam" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#12924A',
    "leaderId" TEXT,
    "conversationId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EventTeam_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventTeam_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "Member" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EventTeam_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EventTeamMember" (
    "teamId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,

    PRIMARY KEY ("teamId", "memberId"),
    CONSTRAINT "EventTeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "EventTeam" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventTeamMember_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Dance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "steps" TEXT,
    "category" TEXT NOT NULL DEFAULT 'GROUP',
    "ageGroup" TEXT NOT NULL DEFAULT 'ALL',
    "durationMin" INTEGER,
    "imageUrl" TEXT,
    "audioUrl" TEXT,
    "videoUrl" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "BureauMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "position" TEXT NOT NULL,
    "positionAr" TEXT,
    "photoUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- AlterTable
-- Generated with `prisma migrate diff`, except that Prisma's "RedefineTables" blocks for Conversation,
-- ConversationParticipant, Event and EventRegistration (CREATE new_X / DROP TABLE X / RENAME) were
-- replaced with ADD COLUMN statements: PRAGMA foreign_keys=OFF is a no-op inside the migrator's
-- transaction, so DROP TABLE would cascade and delete messages, registrations, invoices links…
ALTER TABLE "Conversation" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'DIRECT';
ALTER TABLE "Conversation" ADD COLUMN "createdById" TEXT;
ALTER TABLE "ConversationParticipant" ADD COLUMN "isAdmin" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Event" ADD COLUMN "seriesId" TEXT REFERENCES "EventSeries" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Event" ADD COLUMN "editionNumber" INTEGER;
ALTER TABLE "Event" ADD COLUMN "seasonYear" INTEGER;
ALTER TABLE "EventRegistration" ADD COLUMN "teamId" TEXT REFERENCES "EventTeam" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Event_seriesId_seasonYear_idx" ON "Event"("seriesId", "seasonYear");

-- CreateIndex
CREATE INDEX "EventRegistration_teamId_idx" ON "EventRegistration"("teamId");


-- CreateIndex
CREATE UNIQUE INDEX "EventTeam_conversationId_key" ON "EventTeam"("conversationId");

-- CreateIndex
CREATE INDEX "EventTeam_eventId_idx" ON "EventTeam"("eventId");

-- CreateIndex
CREATE INDEX "EventTeamMember_memberId_idx" ON "EventTeamMember"("memberId");
