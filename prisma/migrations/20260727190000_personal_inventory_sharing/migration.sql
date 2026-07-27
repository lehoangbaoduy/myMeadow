-- Personal inventory sharing: a resident can grant another resident
-- read-only visibility into one of their personal inventory items.
--
-- Entirely additive: one new table, no changes to existing tables. Safe to
-- apply against a live database ahead of a code deploy.

CREATE TABLE "PersonalInventoryShare" (
  "id"        INTEGER PRIMARY KEY AUTOINCREMENT,
  "itemId"    INTEGER NOT NULL,
  "tenantId"  INTEGER NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("itemId") REFERENCES "PersonalInventoryItem" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE,
  UNIQUE ("itemId", "tenantId")
);

CREATE INDEX "PersonalInventoryShare_tenantId_idx" ON "PersonalInventoryShare" ("tenantId");
