-- Attribution + history log for kitchen/household InventoryItem restocks.
-- Only rows for level increases are ever written (see PATCH /api/inventory/[id]).
CREATE TABLE "InventoryLevelLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "itemId" INTEGER NOT NULL,
    "changedByUserId" INTEGER NOT NULL,
    "changedByName" TEXT NOT NULL,
    "previousLevel" REAL NOT NULL,
    "newLevel" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InventoryLevelLog_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "InventoryLevelLog_itemId_createdAt_idx" ON "InventoryLevelLog"("itemId", "createdAt");
