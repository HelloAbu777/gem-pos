import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/fix-branchid?secret=gem-clear-2026
 *
 * Mavjud barcha ma'lumotlarga 'default-branch' tayinlaydi.
 * Asosiy filialning eski kategoriya, ta'minotchi, yuridik shaxs,
 * taom, mahsulot ma'lumotlari ko'rinib qoladi.
 */
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  if (secret !== 'gem-clear-2026') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const report: Record<string, number> = {};

  try {
    // 1. branchId columnlarini qo'shish (mavjud bo'lmasa)
    await prisma.$executeRawUnsafe(`ALTER TABLE "categories"     ADD COLUMN IF NOT EXISTS "branchId" TEXT DEFAULT 'default-branch'`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "suppliers"      ADD COLUMN IF NOT EXISTS "branchId" TEXT DEFAULT 'default-branch'`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "legal_entities" ADD COLUMN IF NOT EXISTS "branchId" TEXT DEFAULT 'default-branch'`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "dishes"         ADD COLUMN IF NOT EXISTS "branchId" TEXT DEFAULT 'default-branch'`);

    // 2. NULL yoki bo'sh qiymatlarni 'default-branch' ga to'g'rilash
    const catFix = await prisma.$executeRawUnsafe(
      `UPDATE "categories" SET "branchId" = 'default-branch' WHERE "branchId" IS NULL OR "branchId" = ''`
    );
    report.categories = Number(catFix);

    const supFix = await prisma.$executeRawUnsafe(
      `UPDATE "suppliers" SET "branchId" = 'default-branch' WHERE "branchId" IS NULL OR "branchId" = ''`
    );
    report.suppliers = Number(supFix);

    const leFix = await prisma.$executeRawUnsafe(
      `UPDATE "legal_entities" SET "branchId" = 'default-branch' WHERE "branchId" IS NULL OR "branchId" = ''`
    );
    report.legalEntities = Number(leFix);

    const dishFix = await prisma.$executeRawUnsafe(
      `UPDATE "dishes" SET "branchId" = 'default-branch' WHERE "branchId" IS NULL OR "branchId" = ''`
    );
    report.dishes = Number(dishFix);

    const prodFix = await prisma.$executeRawUnsafe(
      `UPDATE "products" SET "branchId" = 'default-branch' WHERE "branchId" IS NULL OR "branchId" = ''`
    );
    report.products = Number(prodFix);

    // 3. Unique constraint yangilash
    await prisma.$executeRawUnsafe(`ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "categories_name_key"`);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "categories_name_branchId_key" ON "categories"("name", "branchId")`);

    // 4. Hozirgi holat
    const counts = await prisma.$queryRaw<{
      cats: bigint; sups: bigint; les: bigint; dishes: bigint; products: bigint;
    }[]>`
      SELECT
        (SELECT COUNT(*) FROM "categories"     WHERE "branchId" = 'default-branch') AS cats,
        (SELECT COUNT(*) FROM "suppliers"      WHERE "branchId" = 'default-branch') AS sups,
        (SELECT COUNT(*) FROM "legal_entities" WHERE "branchId" = 'default-branch') AS les,
        (SELECT COUNT(*) FROM "dishes"         WHERE "branchId" = 'default-branch') AS dishes,
        (SELECT COUNT(*) FROM "products"       WHERE "branchId" = 'default-branch') AS products
    `;

    return NextResponse.json({
      success: true,
      message: "Asosiy filial ma'lumotlari tiklanди",
      updated: report,
      defaultBranchCounts: {
        categories:    Number(counts[0].cats),
        suppliers:     Number(counts[0].sups),
        legalEntities: Number(counts[0].les),
        dishes:        Number(counts[0].dishes),
        products:      Number(counts[0].products),
      },
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Xato';
    return NextResponse.json({ error: msg, report }, { status: 500 });
  }
}
