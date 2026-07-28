-- Personal inventory items move from flat-per-tenant to grouped-by-list.
-- Sharing moves from per-item (PersonalInventoryShare) to per-list
-- (PersonalInventoryListShare): the owner shares a whole list in one action
-- instead of toggling sharing on each item.

-- 1. New list table.
CREATE TABLE "PersonalInventoryList" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tenantId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PersonalInventoryList_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PersonalInventoryList_tenantId_name_key" ON "PersonalInventoryList"("tenantId", "name");

-- 2. Backfill exactly one default list per tenant that already owns items,
-- so existing items have somewhere to land.
INSERT INTO "PersonalInventoryList" ("tenantId", "name", "updatedAt")
SELECT DISTINCT "tenantId", 'My Items', CURRENT_TIMESTAMP FROM "PersonalInventoryItem";

-- 3. Recreate PersonalInventoryItem keyed by listId instead of tenantId.
CREATE TABLE "new_PersonalInventoryItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "listId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" REAL,
    "unit" TEXT,
    "category" TEXT,
    "description" TEXT,
    "expirationDate" DATETIME,
    "lowStockThreshold" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PersonalInventoryItem_listId_fkey" FOREIGN KEY ("listId") REFERENCES "PersonalInventoryList" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_PersonalInventoryItem" ("id", "listId", "name", "quantity", "unit", "category", "description", "expirationDate", "lowStockThreshold", "createdAt", "updatedAt")
SELECT i."id", l."id", i."name", i."quantity", i."unit", i."category", i."description", i."expirationDate", i."lowStockThreshold", i."createdAt", i."updatedAt"
FROM "PersonalInventoryItem" i
JOIN "PersonalInventoryList" l ON l."tenantId" = i."tenantId";

DROP TABLE "PersonalInventoryItem";
ALTER TABLE "new_PersonalInventoryItem" RENAME TO "PersonalInventoryItem";
CREATE UNIQUE INDEX "PersonalInventoryItem_listId_name_key" ON "PersonalInventoryItem"("listId", "name");

-- 4. Sharing moves from item-level to list-level.
DROP TABLE "PersonalInventoryShare";

CREATE TABLE "PersonalInventoryListShare" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "listId" INTEGER NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PersonalInventoryListShare_listId_fkey" FOREIGN KEY ("listId") REFERENCES "PersonalInventoryList" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PersonalInventoryListShare_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PersonalInventoryListShare_listId_tenantId_key" ON "PersonalInventoryListShare"("listId", "tenantId");
CREATE INDEX "PersonalInventoryListShare_tenantId_idx" ON "PersonalInventoryListShare"("tenantId");
