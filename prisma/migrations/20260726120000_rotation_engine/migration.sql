-- Rotation engine: team-based chore rotations, a real bathroom schedule,
-- trash/dishes sync, and rotation shifting with an audit trail.
--
-- IMPORTANT — read before applying to production:
-- 1. This migration assumes each of TrashAssignment/DishesAssignment has at
--    most one row per `date` (true under the current app logic, which only
--    ever persists override rows keyed by date). If that has ever been
--    violated, the UNIQUE(date) constraint on the rebuilt tables will make
--    this migration fail loudly instead of silently corrupting data — check
--    `SELECT date, COUNT(*) FROM TrashAssignment GROUP BY date HAVING COUNT(*) > 1`
--    (and same for DishesAssignment) before applying, just in case.
-- 2. `DROP COLUMN` is used against Tenant, which requires SQLite 3.35+ /
--    a libSQL build with the same support. If your Turso instance rejects
--    it, swap those two ALTER statements for the same create-copy-drop-rename
--    pattern used below for TrashAssignment/DishesAssignment.
-- 3. Apply statement-by-statement (e.g. via scripts/turso-migrate.js) and
--    verify counts after each step given the size of this change.

-- ============================================================
-- Step 1: New rotation tables
-- ============================================================

CREATE TABLE "RotationTeam" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "rotationType" TEXT NOT NULL,
  "name" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "RotationTeamMember" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "teamId" INTEGER NOT NULL,
  "rotationType" TEXT NOT NULL,
  "tenantId" INTEGER NOT NULL,
  "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("teamId") REFERENCES "RotationTeam" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT,
  UNIQUE ("rotationType", "tenantId")
);
CREATE INDEX "RotationTeamMember_teamId_idx" ON "RotationTeamMember" ("teamId");

-- The authoritative, ordered roster. Each row is EITHER a solo tenant OR a
-- team (never both, never neither) — enforced by the CHECK below.
CREATE TABLE "RotationUnit" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "rotationType" TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  "tenantId" INTEGER,
  "teamId" INTEGER,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("teamId") REFERENCES "RotationTeam" ("id") ON DELETE CASCADE,
  UNIQUE ("rotationType", "order"),
  UNIQUE ("rotationType", "tenantId"),
  UNIQUE ("teamId"),
  CHECK (
    (("tenantId" IS NOT NULL) AND ("teamId" IS NULL))
    OR (("tenantId" IS NULL) AND ("teamId" IS NOT NULL))
  )
);

CREATE TABLE "RotationShift" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "rotationType" TEXT NOT NULL,
  "effectiveDate" DATETIME NOT NULL,
  "offsetPositions" INTEGER NOT NULL,
  "actorUserId" INTEGER NOT NULL,
  "reason" TEXT,
  "previousUnitLabel" TEXT NOT NULL,
  "newUnitLabel" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "RotationShift_rotationType_effectiveDate_idx" ON "RotationShift" ("rotationType", "effectiveDate");

CREATE TABLE "BathroomAssignment" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "date" DATETIME NOT NULL,
  "unitId" INTEGER,
  "deletedUnitLabel" TEXT,
  "isOverride" BOOLEAN NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
  "completedAt" DATETIME,
  "completedByUserId" INTEGER,
  "notes" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("unitId") REFERENCES "RotationUnit" ("id") ON DELETE SET NULL,
  UNIQUE ("date")
);
CREATE INDEX "BathroomAssignment_unitId_idx" ON "BathroomAssignment" ("unitId");

-- ============================================================
-- Step 2: Seed the BATHROOM roster from today's bathroomDuty flags,
-- excluding placeholder residents (decision: placeholders never enter
-- rotations going forward). Read bathroomDuty BEFORE it's dropped in step 4.
-- The TRASH_DISHES roster deliberately starts EMPTY — admin configures it
-- manually post-migration (today's trashDuty/dishesDuty sets disagree on
-- membership, so no auto-selection is made).
-- ============================================================

INSERT INTO "RotationUnit" ("rotationType", "order", "tenantId")
SELECT
  'BATHROOM',
  ROW_NUMBER() OVER (ORDER BY t."id") - 1,
  t."id"
FROM "Tenant" t
JOIN "User" u ON u."id" = t."userId"
WHERE t."isActive" = 1
  AND t."bathroomDuty" = 1
  AND u."clerkId" NOT LIKE 'manual_%';

-- ============================================================
-- Step 3: Rebuild TrashAssignment / DishesAssignment on the new shape.
-- Historical rows are preserved with a snapshotted tenant-name label
-- (unitId left NULL) rather than force-enrolled into the new roster —
-- keeps the roster genuinely empty while keeping history readable.
-- LEFT JOIN + COALESCE so an already-orphaned tenantId (if any) still
-- migrates instead of being silently dropped (bug #10 hardening).
-- ============================================================

CREATE TABLE "TrashAssignment_new" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "date" DATETIME NOT NULL,
  "unitId" INTEGER,
  "deletedUnitLabel" TEXT,
  "isRecycle" BOOLEAN NOT NULL DEFAULT 0,
  "isOverride" BOOLEAN NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
  "completedAt" DATETIME,
  "completedByUserId" INTEGER,
  "notes" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("unitId") REFERENCES "RotationUnit" ("id") ON DELETE SET NULL,
  UNIQUE ("date")
);

INSERT INTO "TrashAssignment_new"
  ("id", "date", "unitId", "deletedUnitLabel", "isRecycle", "isOverride", "status", "createdAt", "updatedAt")
SELECT
  ta."id", ta."date", NULL, COALESCE(t."name", 'Deleted User'), ta."isRecycle", ta."isOverride",
  'SCHEDULED', ta."createdAt", ta."updatedAt"
FROM "TrashAssignment" ta
LEFT JOIN "Tenant" t ON t."id" = ta."tenantId";

DROP TABLE "TrashAssignment";
ALTER TABLE "TrashAssignment_new" RENAME TO "TrashAssignment";
CREATE INDEX "TrashAssignment_unitId_idx" ON "TrashAssignment" ("unitId");

CREATE TABLE "DishesAssignment_new" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "date" DATETIME NOT NULL,
  "unitId" INTEGER,
  "deletedUnitLabel" TEXT,
  "isOverride" BOOLEAN NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
  "completedAt" DATETIME,
  "completedByUserId" INTEGER,
  "notes" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("unitId") REFERENCES "RotationUnit" ("id") ON DELETE SET NULL,
  UNIQUE ("date")
);

INSERT INTO "DishesAssignment_new"
  ("id", "date", "unitId", "deletedUnitLabel", "isOverride", "status", "createdAt", "updatedAt")
SELECT
  da."id", da."date", NULL, COALESCE(t."name", 'Deleted User'), da."isOverride",
  'SCHEDULED', da."createdAt", da."updatedAt"
FROM "DishesAssignment" da
LEFT JOIN "Tenant" t ON t."id" = da."tenantId";

DROP TABLE "DishesAssignment";
ALTER TABLE "DishesAssignment_new" RENAME TO "DishesAssignment";
CREATE INDEX "DishesAssignment_unitId_idx" ON "DishesAssignment" ("unitId");

-- ============================================================
-- Step 4: Drop the now-superseded duty flags from Tenant. Rotation
-- membership lives entirely in RotationUnit/RotationTeamMember now.
-- (See migration header note if your SQLite/libSQL build predates
-- DROP COLUMN support — use the create-copy-drop-rename pattern instead.)
-- ============================================================

ALTER TABLE "Tenant" DROP COLUMN "trashDuty";
ALTER TABLE "Tenant" DROP COLUMN "dishesDuty";
ALTER TABLE "Tenant" DROP COLUMN "bathroomDuty";
