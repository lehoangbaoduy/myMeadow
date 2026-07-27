-- Phase 2: personal inventory, announcement history + per-user clearing,
-- maintenance request resolution.
--
-- Entirely additive: new tables, and new nullable/defaulted columns on
-- existing tables. Safe to apply against a live database ahead of a code
-- deploy — no column is dropped or renamed, so currently-running (old)
-- code is unaffected. Apply directly via scripts/turso-migrate.js.

-- ============================================================
-- PersonalInventoryItem (feature #5)
-- ============================================================

CREATE TABLE "PersonalInventoryItem" (
  "id"                INTEGER PRIMARY KEY AUTOINCREMENT,
  "tenantId"          INTEGER NOT NULL,
  "name"              TEXT NOT NULL,
  "quantity"          REAL,
  "unit"              TEXT,
  "category"          TEXT,
  "description"       TEXT,
  "expirationDate"    DATETIME,
  "lowStockThreshold" REAL,
  "createdAt"         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE,
  UNIQUE ("tenantId", "name")
);

-- ============================================================
-- Announcement history + targeting (features #6/#7)
-- ============================================================

ALTER TABLE "Announcement" ADD COLUMN "createdByUserId" INTEGER;
ALTER TABLE "Announcement" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "Announcement" ADD COLUMN "expiresAt" DATETIME;
ALTER TABLE "Announcement" ADD COLUMN "targetAll" BOOLEAN NOT NULL DEFAULT 1;

CREATE TABLE "AnnouncementRecipient" (
  "id"              INTEGER PRIMARY KEY AUTOINCREMENT,
  "announcementId"  INTEGER NOT NULL,
  "userId"          INTEGER NOT NULL,
  "clearedAt"       DATETIME,
  "clearedByUserId" INTEGER,
  "createdAt"       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("announcementId") REFERENCES "Announcement" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE,
  UNIQUE ("announcementId", "userId")
);

-- ============================================================
-- Maintenance request resolution (feature #8)
-- ============================================================

ALTER TABLE "MaintenanceRequest" ADD COLUMN "resolvedByUserId" INTEGER;
ALTER TABLE "MaintenanceRequest" ADD COLUMN "resolvedAt" DATETIME;
ALTER TABLE "MaintenanceRequest" ADD COLUMN "resolutionNote" TEXT;
