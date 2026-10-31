-- Login accounts now have only 4 roles: super admin, admin, accountant and member (= animator).
-- "monitor" is merged into "member"; parents and kids are records (kid cards with their guardian's
-- contact), not accounts. Data only: no table changes. The retired roles stay in "Role" for old rows.

-- 1. Monitors become members (keeps every other role they have).
INSERT OR IGNORE INTO "UserRole" ("userId", "roleId")
SELECT ur."userId", m."id"
FROM "UserRole" ur
JOIN "Role" r ON r."id" = ur."roleId" AND r."key" = 'monitor'
JOIN "Role" m ON m."key" = 'member';

DELETE FROM "UserRole"
WHERE "roleId" IN (SELECT "id" FROM "Role" WHERE "key" = 'monitor')
  AND EXISTS (SELECT 1 FROM "Role" WHERE "key" = 'member');

UPDATE "Invitation" SET "role" = 'member' WHERE "role" = 'monitor';
UPDATE "PreapprovedPerson" SET "role" = 'member' WHERE "role" = 'monitor';
UPDATE "User" SET "requestedRole" = 'member' WHERE "requestedRole" = 'monitor';

-- 2. Accounts that only had the parent and/or kid role can no longer sign in (their records stay).
UPDATE "User" SET "isActive" = false
WHERE "isActive" = true
  AND EXISTS (
    SELECT 1 FROM "UserRole" ur JOIN "Role" r ON r."id" = ur."roleId"
    WHERE ur."userId" = "User"."id" AND r."key" IN ('parent', 'kid')
  )
  AND NOT EXISTS (
    SELECT 1 FROM "UserRole" ur JOIN "Role" r ON r."id" = ur."roleId"
    WHERE ur."userId" = "User"."id" AND r."key" NOT IN ('parent', 'kid')
  );

DELETE FROM "Session"
WHERE "userId" IN (SELECT "id" FROM "User" WHERE "isActive" = false);
