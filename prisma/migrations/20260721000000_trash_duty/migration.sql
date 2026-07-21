-- AlterTable: Tenant
ALTER TABLE "Tenant" ADD COLUMN "trashDuty" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: preserve the current gender-based trash rotation (active male tenants)
-- as the initial trashDuty membership, so nobody's assignment silently changes
-- the moment this ships. Admins can adjust per-tenant from here via the new checkbox.
UPDATE "Tenant" SET "trashDuty" = true WHERE "gender" = 'MALE' AND "isActive" = true;
