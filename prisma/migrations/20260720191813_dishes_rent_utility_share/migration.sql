-- AlterTable: Tenant
ALTER TABLE "Tenant" ADD COLUMN "utilityShare" REAL NOT NULL DEFAULT 1;
ALTER TABLE "Tenant" ADD COLUMN "rentAmount" REAL;

-- CreateTable: DishesAssignment
CREATE TABLE "DishesAssignment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "isOverride" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DishesAssignment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable: RentReminderLog
CREATE TABLE "RentReminderLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tenantId" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RentReminderLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "RentReminderLog_tenantId_month_year_key" ON "RentReminderLog"("tenantId", "month", "year");
