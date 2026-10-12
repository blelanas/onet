-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "label" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "maxUses" INTEGER NOT NULL DEFAULT 50,
    "uses" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "revokedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Invitation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PreapprovedPerson" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "role" TEXT NOT NULL,
    "createdById" TEXT,
    "usedById" TEXT,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PreapprovedPerson_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PreapprovedPerson_usedById_fkey" FOREIGN KEY ("usedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- AlterTable
-- Generated with `prisma migrate diff`, except that Prisma's "RedefineTables" block for "User"
-- (CREATE new_User / DROP TABLE "User" / RENAME) was replaced with ADD COLUMN statements:
-- PRAGMA foreign_keys=OFF is a no-op inside the migrator's transaction, so DROP TABLE "User"
-- would cascade and delete every Session, UserRole, Notification… row.
ALTER TABLE "User" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "User" ADD COLUMN "requestedRole" TEXT;
ALTER TABLE "User" ADD COLUMN "invitationId" TEXT;
ALTER TABLE "User" ADD COLUMN "approvedById" TEXT;
ALTER TABLE "User" ADD COLUMN "approvedAt" DATETIME;

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_tokenHash_key" ON "Invitation"("tokenHash");

-- CreateIndex
CREATE INDEX "PreapprovedPerson_email_idx" ON "PreapprovedPerson"("email");

-- CreateIndex
CREATE INDEX "PreapprovedPerson_phone_idx" ON "PreapprovedPerson"("phone");

-- Data: the new "users.approve" permission, granted to the admin roles. Existing databases are only
-- migrated (never re-seeded), so without this nobody could open the Approvals page. Idempotent; on a
-- fresh database (no roles yet) only the Permission row is created, and the seed recreates it anyway.
INSERT OR IGNORE INTO "Permission" ("id", "key", "module") VALUES (lower(hex(randomblob(12))), 'users.approve', 'users');
INSERT OR IGNORE INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id" FROM "Role" r JOIN "Permission" p ON p."key" = 'users.approve'
WHERE r."key" IN ('super_admin', 'admin');
