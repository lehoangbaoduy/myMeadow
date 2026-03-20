-- AlterTable: Tenant
ALTER TABLE "Tenant" ADD COLUMN "nickname" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "avatarUrl" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable: UtilityBill
ALTER TABLE "UtilityBill" ADD COLUMN "electricUsage" REAL;
ALTER TABLE "UtilityBill" ADD COLUMN "electricPrice" REAL;
ALTER TABLE "UtilityBill" ADD COLUMN "gasUsage" REAL;
ALTER TABLE "UtilityBill" ADD COLUMN "gasPrice" REAL;
ALTER TABLE "UtilityBill" ADD COLUMN "waterUsage" REAL;
ALTER TABLE "UtilityBill" ADD COLUMN "waterPrice" REAL;
ALTER TABLE "UtilityBill" ADD COLUMN "wifiPrice" REAL;

-- CreateTable: UtilityDocument
CREATE TABLE "UtilityDocument" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "utilityType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "UtilityDocument_month_year_utilityType_key" ON "UtilityDocument"("month", "year", "utilityType");

-- CreateTable: MaintenanceRequest
CREATE TABLE "MaintenanceRequest" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tenantId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "requestType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MaintenanceRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
