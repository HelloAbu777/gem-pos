import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/admin/fix-indexes?secret=gem-clear-2026
// Barcha global unique indexlarni filial-based unique ga o'tkazadi
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  if (secret !== 'gem-clear-2026') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const steps: string[] = [];

  const run = async (label: string, sql: string) => {
    try {
      await prisma.$executeRawUnsafe(sql);
      steps.push(`✅ ${label}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      steps.push(`⏭ ${label}: ${msg.slice(0, 80)}`);
    }
  };

  // ── PRODUCTS: barcode global → (barcode, branchId) ──
  await run('DROP products_barcode_key index',      `DROP INDEX IF EXISTS "products_barcode_key"`);
  await run('DROP products_barcode_key constraint', `ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_barcode_key"`);
  await run('CREATE products (barcode, branchId) unique',
    `CREATE UNIQUE INDEX IF NOT EXISTS "products_barcode_branchId_key"
     ON "products"("barcode","branchId") WHERE barcode IS NOT NULL`);

  // ── CATEGORIES: name global → (name, branchId) ──
  await run('DROP categories_name_key index',      `DROP INDEX IF EXISTS "categories_name_key"`);
  await run('DROP categories_name_key constraint', `ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "categories_name_key"`);
  await run('CREATE categories (name, branchId) unique',
    `CREATE UNIQUE INDEX IF NOT EXISTS "categories_name_branchId_key"
     ON "categories"("name","branchId")`);

  // ── DISHES: barcode global → (barcode, branchId) ──
  await run('DROP dishes_barcode_key index',      `DROP INDEX IF EXISTS "dishes_barcode_key"`);
  await run('DROP dishes_barcode_key constraint', `ALTER TABLE "dishes" DROP CONSTRAINT IF EXISTS "dishes_barcode_key"`);
  await run('CREATE dishes (barcode, branchId) unique',
    `CREATE UNIQUE INDEX IF NOT EXISTS "dishes_barcode_branchId_key"
     ON "dishes"("barcode","branchId") WHERE barcode IS NOT NULL`);

  // ── WAREHOUSE: barcode global → (barcode, branchId) ──
  await run('DROP warehouse_items_barcode_key index',      `DROP INDEX IF EXISTS "warehouse_items_barcode_key"`);
  await run('DROP warehouse_items_barcode_key constraint', `ALTER TABLE "warehouse_items" DROP CONSTRAINT IF EXISTS "warehouse_items_barcode_key"`);
  await run('CREATE warehouse (barcode, branchId) unique',
    `CREATE UNIQUE INDEX IF NOT EXISTS "warehouse_items_barcode_branchId_key"
     ON "warehouse_items"("barcode","branchId") WHERE barcode IS NOT NULL`);

  return NextResponse.json({ success: true, steps });
}
