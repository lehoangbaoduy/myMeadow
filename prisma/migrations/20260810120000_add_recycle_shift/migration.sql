-- Effective-dated override of which Thursdays are recycle weeks (see
-- rotation-core.ts resolveHasRecycle). No backfill needed: with zero rows,
-- every week falls back to the existing base parity rule (isRecycleWeek).
CREATE TABLE "RecycleShift" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "effectiveDate" DATETIME NOT NULL,
  "hasRecycle" BOOLEAN NOT NULL,
  "actorUserId" INTEGER NOT NULL,
  "reason" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "RecycleShift_effectiveDate_idx" ON "RecycleShift" ("effectiveDate");
