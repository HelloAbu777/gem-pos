-- branchId qo'shish: categories, suppliers, legal_entities
-- Mavjud ma'lumotlar 'default-branch' ga tayinlanadi

ALTER TABLE "categories"     ADD COLUMN IF NOT EXISTS "branchId" TEXT NOT NULL DEFAULT 'default-branch';
ALTER TABLE "suppliers"      ADD COLUMN IF NOT EXISTS "branchId" TEXT NOT NULL DEFAULT 'default-branch';
ALTER TABLE "legal_entities" ADD COLUMN IF NOT EXISTS "branchId" TEXT NOT NULL DEFAULT 'default-branch';

-- categories unique constraint: endi (name, branchId) juftligi unique bo'ladi
-- (turli filiallar bir xil nomli kategoriya yaratishi mumkin)
ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "categories_name_key";
CREATE UNIQUE INDEX IF NOT EXISTS "categories_name_branchId_key" ON "categories"("name", "branchId");
