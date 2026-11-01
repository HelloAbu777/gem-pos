import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/admin/fix-categories-index?secret=gem-clear-2026
// Eski categories_name_key unique index ni o'chirib, (name, branchId) unique qo'yadi
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  if (secret !== 'gem-clear-2026') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const steps: string[] = [];

  try {
    // 1. Eski faqat name bo'yicha unique index/constraint o'chirish
    try {
      await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "categories_name_key"`);
      steps.push('✅ DROP INDEX categories_name_key');
    } catch (e) {
      steps.push(`⏭ categories_name_key index yo'q (${e instanceof Error ? e.message : ''})`);
    }

    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "categories_name_key"`);
      steps.push('✅ DROP CONSTRAINT categories_name_key');
    } catch (e) {
      steps.push(`⏭ categories_name_key constraint yo'q (${e instanceof Error ? e.message : ''})`);
    }

    // 2. Yangi (name, branchId) unique index qo'yish
    await prisma.$executeRawUnsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS "categories_name_branchId_key" ON "categories"("name","branchId")`
    );
    steps.push('✅ CREATE UNIQUE INDEX categories_name_branchId_key');

    // 3. branchId ustuni mavjudligini ta'minlash
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "branchId" TEXT NOT NULL DEFAULT 'default-branch'`
    );
    steps.push('✅ branchId column ta\'minlandi');

    // 4. Mavjud NULL branchId larni to'ldirish
    await prisma.$executeRawUnsafe(
      `UPDATE "categories" SET "branchId" = 'default-branch' WHERE "branchId" IS NULL OR "branchId" = ''`
    );
    steps.push('✅ branchId backfill');

    return NextResponse.json({ success: true, steps });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Xato';
    return NextResponse.json({ error: msg, steps }, { status: 500 });
  }
}
