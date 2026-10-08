-- AlterTable: Dish modeliga costPrice (tan narxi) field qo'shish
ALTER TABLE "dishes" ADD COLUMN "costPrice" DOUBLE PRECISION NOT NULL DEFAULT 0;
