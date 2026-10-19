-- AlterTable: SaleItem ga costPrice (tan narxi snapshot) qo'shish
ALTER TABLE "sale_items" ADD COLUMN "costPrice" DOUBLE PRECISION NOT NULL DEFAULT 0;
