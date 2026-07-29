-- Adds Tenant.deactivatedAt (for reconstructing "who was active during
-- past bill period X") and a Room/RoomImage pair for the admin room-layout
-- page. Room assignment is read off Tenant.roomNumber (existing free-text
-- field) rather than a new foreign key -- see schema.prisma comment.

ALTER TABLE "Tenant" ADD COLUMN "deactivatedAt" DATETIME;

CREATE TABLE "Room" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "roomNumber" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "Room_roomNumber_key" ON "Room"("roomNumber");

CREATE TABLE "RoomImage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "roomId" INTEGER NOT NULL,
    "imageData" BLOB NOT NULL,
    "imageMimeType" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RoomImage_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "RoomImage_roomId_idx" ON "RoomImage"("roomId");
