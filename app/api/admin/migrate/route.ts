import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  if (secret !== 'gem-clear-2026') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const steps: string[] = [];
  const errors: string[] = [];

  // Helper: xatoni log qiladi lekin to'xtatmaydi
  async function run(label: string, sql: string) {
    try {
      await prisma.$executeRawUnsafe(sql);
      steps.push(`✅ ${label}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // "already exists" xatolari normal — o'tkazib yuboramiz
      if (
        msg.includes('already exists') ||
        msg.includes('duplicate') ||
        msg.includes('already')
      ) {
        steps.push(`⏭ ${label} (already exists)`);
      } else {
        errors.push(`❌ ${label}: ${msg}`);
        steps.push(`❌ ${label}: ${msg}`);
      }
    }
  }

  try {
    // ── 1. BRANCHES ──────────────────────────────────────────────
    await run('create branches', `
      CREATE TABLE IF NOT EXISTS "branches" (
        "id"        TEXT        NOT NULL,
        "name"      TEXT        NOT NULL,
        "address"   TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
      )
    `);

    // ── 2. USERS (role TEXT, branchId nullable) ──────────────────
    await run('create users', `
      CREATE TABLE IF NOT EXISTS "users" (
        "id"        TEXT        NOT NULL,
        "name"      TEXT        NOT NULL,
        "login"     TEXT        NOT NULL,
        "password"  TEXT        NOT NULL,
        "role"      TEXT        NOT NULL DEFAULT 'CASHIER',
        "branchId"  TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "users_pkey" PRIMARY KEY ("id")
      )
    `);
    await run('users login unique index', `
      CREATE UNIQUE INDEX IF NOT EXISTS "users_login_key" ON "users"("login")
    `);

    // Agar users jadvali avval enum Role bilan yaratilgan bo'lsa — TEXT ga o'tkazish
    await run('users role column to TEXT', `
      ALTER TABLE "users" ALTER COLUMN "role" TYPE TEXT USING "role"::TEXT
    `);

    // branchId ni nullable qilish (SUPER_ADMIN uchun)
    await run('users branchId nullable', `
      ALTER TABLE "users" ALTER COLUMN "branchId" DROP NOT NULL
    `);

    // ── 3. CATEGORIES ────────────────────────────────────────────
    await run('create categories', `
      CREATE TABLE IF NOT EXISTS "categories" (
        "id"        TEXT        NOT NULL,
        "name"      TEXT        NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
      )
    `);
    await run('categories name unique', `
      CREATE UNIQUE INDEX IF NOT EXISTS "categories_name_key" ON "categories"("name")
    `);

    // ── 4. SUPPLIERS ─────────────────────────────────────────────
    await run('create suppliers', `
      CREATE TABLE IF NOT EXISTS "suppliers" (
        "id"            TEXT NOT NULL,
        "name"          TEXT NOT NULL,
        "contactPerson" TEXT NOT NULL,
        "phone"         TEXT NOT NULL,
        "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
      )
    `);

    // ── 5. LEGAL ENTITIES ────────────────────────────────────────
    await run('create legal_entities', `
      CREATE TABLE IF NOT EXISTS "legal_entities" (
        "id"        TEXT NOT NULL,
        "name"      TEXT NOT NULL,
        "phone"     TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "legal_entities_pkey" PRIMARY KEY ("id")
      )
    `);

    // ── 6. PRODUCTS ──────────────────────────────────────────────
    await run('create products', `
      CREATE TABLE IF NOT EXISTS "products" (
        "id"            TEXT             NOT NULL,
        "name"          TEXT             NOT NULL,
        "barcode"       TEXT,
        "unit"          TEXT             NOT NULL DEFAULT 'dona',
        "quantity"      DOUBLE PRECISION NOT NULL DEFAULT 0,
        "minQuantity"   DOUBLE PRECISION NOT NULL DEFAULT 10,
        "purchasePrice" DOUBLE PRECISION NOT NULL,
        "salePrice"     DOUBLE PRECISION NOT NULL,
        "margin"        DOUBLE PRECISION NOT NULL,
        "vatType"       TEXT             NOT NULL DEFAULT 'NO_VAT',
        "expiryDate"    TIMESTAMP(3),
        "isPinned"      BOOLEAN          NOT NULL DEFAULT false,
        "categoryId"    TEXT             NOT NULL,
        "supplierId"    TEXT             NOT NULL,
        "branchId"      TEXT             NOT NULL,
        "createdAt"     TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt"     TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "products_pkey" PRIMARY KEY ("id")
      )
    `);
    await run('products barcode unique', `
      CREATE UNIQUE INDEX IF NOT EXISTS "products_barcode_key" ON "products"("barcode")
    `);
    await run('products isPinned column', `
      ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "isPinned" BOOLEAN NOT NULL DEFAULT false
    `);

    // ── 7. DISHES ────────────────────────────────────────────────
    await run('create dishes', `
      CREATE TABLE IF NOT EXISTS "dishes" (
        "id"        TEXT             NOT NULL,
        "name"      TEXT             NOT NULL,
        "price"     DOUBLE PRECISION NOT NULL,
        "costPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "barcode"   TEXT,
        "isActive"  BOOLEAN          NOT NULL DEFAULT true,
        "branchId"  TEXT             NOT NULL DEFAULT 'default-branch',
        "createdAt" TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "dishes_pkey" PRIMARY KEY ("id")
      )
    `);
    await run('dishes barcode unique', `
      CREATE UNIQUE INDEX IF NOT EXISTS "dishes_barcode_key" ON "dishes"("barcode")
    `);
    await run('dishes costPrice column', `
      ALTER TABLE "dishes" ADD COLUMN IF NOT EXISTS "costPrice" DOUBLE PRECISION NOT NULL DEFAULT 0
    `);

    // ── 8. SALES ─────────────────────────────────────────────────
    await run('create sales', `
      CREATE TABLE IF NOT EXISTS "sales" (
        "id"            TEXT             NOT NULL,
        "totalAmount"   DOUBLE PRECISION NOT NULL,
        "paymentType"   TEXT             NOT NULL,
        "cashAmount"    DOUBLE PRECISION,
        "cardAmount"    DOUBLE PRECISION,
        "saleType"      TEXT             NOT NULL DEFAULT 'RETAIL',
        "cashierId"     TEXT             NOT NULL,
        "branchId"      TEXT             NOT NULL,
        "legalEntityId" TEXT,
        "createdAt"     TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
      )
    `);

    // Eski sales jadvali enum ishlatgan bo'lsa — TEXT ga o'tkazish
    await run('sales paymentType to TEXT', `
      ALTER TABLE "sales" ALTER COLUMN "paymentType" TYPE TEXT USING "paymentType"::TEXT
    `);
    await run('sales saleType to TEXT', `
      ALTER TABLE "sales" ALTER COLUMN "saleType" TYPE TEXT USING "saleType"::TEXT
    `);

    // ── 9. SALE ITEMS ────────────────────────────────────────────
    await run('create sale_items', `
      CREATE TABLE IF NOT EXISTS "sale_items" (
        "id"          TEXT             NOT NULL,
        "saleId"      TEXT             NOT NULL,
        "productId"   TEXT,
        "itemName"    TEXT             NOT NULL DEFAULT '',
        "quantity"    DOUBLE PRECISION NOT NULL,
        "priceAtSale" DOUBLE PRECISION NOT NULL,
        CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id")
      )
    `);

    // ── 10. WAREHOUSE ITEMS ──────────────────────────────────────
    await run('create warehouse_items', `
      CREATE TABLE IF NOT EXISTS "warehouse_items" (
        "id"            TEXT             NOT NULL,
        "name"          TEXT             NOT NULL,
        "barcode"       TEXT,
        "unit"          TEXT             NOT NULL DEFAULT 'dona',
        "quantity"      DOUBLE PRECISION NOT NULL DEFAULT 0,
        "minQuantity"   DOUBLE PRECISION NOT NULL DEFAULT 10,
        "purchasePrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "salePrice"     DOUBLE PRECISION NOT NULL DEFAULT 0,
        "vatType"       TEXT             NOT NULL DEFAULT 'NO_VAT',
        "expiryDate"    TIMESTAMP(3),
        "description"   TEXT,
        "categoryId"    TEXT,
        "supplierId"    TEXT,
        "branchId"      TEXT             NOT NULL DEFAULT 'default-branch',
        "transferredAt" TIMESTAMP(3),
        "isTransferred" BOOLEAN          NOT NULL DEFAULT false,
        "createdAt"     TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt"     TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "warehouse_items_pkey" PRIMARY KEY ("id")
      )
    `);
    await run('warehouse barcode unique', `
      CREATE UNIQUE INDEX IF NOT EXISTS "warehouse_items_barcode_key" ON "warehouse_items"("barcode")
    `);

    // ── 11. FOREIGN KEYS ─────────────────────────────────────────
    const fks: [string, string][] = [
      ['fk users_branch', `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_branchId_fkey') THEN ALTER TABLE "users" ADD CONSTRAINT "users_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$`],
      ['fk products_category', `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_categoryId_fkey') THEN ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$`],
      ['fk products_supplier', `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_supplierId_fkey') THEN ALTER TABLE "products" ADD CONSTRAINT "products_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$`],
      ['fk products_branch', `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_branchId_fkey') THEN ALTER TABLE "products" ADD CONSTRAINT "products_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$`],
      ['fk sales_cashier', `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sales_cashierId_fkey') THEN ALTER TABLE "sales" ADD CONSTRAINT "sales_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$`],
      ['fk sales_branch', `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sales_branchId_fkey') THEN ALTER TABLE "sales" ADD CONSTRAINT "sales_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$`],
      ['fk sales_legalEntity', `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sales_legalEntityId_fkey') THEN ALTER TABLE "sales" ADD CONSTRAINT "sales_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "legal_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$`],
      ['fk sale_items_sale', `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sale_items_saleId_fkey') THEN ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$`],
      ['fk sale_items_product', `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sale_items_productId_fkey') THEN ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$`],
    ];
    for (const [label, sql] of fks) await run(label, sql);

    // ── 12. SEED: default branch + admin + super admin ───────────
    const bcrypt = await import('bcryptjs');

    await run('seed default branch', `
      INSERT INTO "branches" ("id","name","address","updatedAt")
      VALUES ('default-branch','Asosiy filial','Toshkent shahri',NOW())
      ON CONFLICT ("id") DO NOTHING
    `);

    const adminHash = await bcrypt.hash('admin123', 10);
    await run('seed admin user', `
      INSERT INTO "users" ("id","name","login","password","role","branchId","updatedAt")
      VALUES ('default-cashier','Administrator','admin','${adminHash}','ADMIN','default-branch',NOW())
      ON CONFLICT ("login") DO UPDATE
        SET "role"='ADMIN', "branchId"='default-branch', "updatedAt"=NOW()
    `);

    const superHash = await bcrypt.hash('gem*94*', 10);
    await run('seed super admin', `
      INSERT INTO "users" ("id","name","login","password","role","branchId","updatedAt")
      VALUES ('super-admin-gem','Super Admin','gem','${superHash}','SUPER_ADMIN',NULL,NOW())
      ON CONFLICT ("login") DO UPDATE
        SET "role"='SUPER_ADMIN', "branchId"=NULL, "updatedAt"=NOW()
    `);

    // ── 13. CATEGORIES / SUPPLIERS / LEGAL_ENTITIES — branchId ──
    await run('categories branchId column', `
      ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "branchId" TEXT NOT NULL DEFAULT 'default-branch'
    `);
    await run('suppliers branchId column', `
      ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "branchId" TEXT NOT NULL DEFAULT 'default-branch'
    `);
    await run('legal_entities branchId column', `
      ALTER TABLE "legal_entities" ADD COLUMN IF NOT EXISTS "branchId" TEXT NOT NULL DEFAULT 'default-branch'
    `);

    // Mavjud ma'lumotlarni 'default-branch' ga tayinlash (NULL bo'lsa)
    await run('categories backfill branchId', `
      UPDATE "categories" SET "branchId" = 'default-branch' WHERE "branchId" IS NULL OR "branchId" = ''
    `);
    await run('suppliers backfill branchId', `
      UPDATE "suppliers" SET "branchId" = 'default-branch' WHERE "branchId" IS NULL OR "branchId" = ''
    `);
    await run('legal_entities backfill branchId', `
      UPDATE "legal_entities" SET "branchId" = 'default-branch' WHERE "branchId" IS NULL OR "branchId" = ''
    `);
    await run('dishes backfill branchId', `
      UPDATE "dishes" SET "branchId" = 'default-branch' WHERE "branchId" IS NULL OR "branchId" = ''
    `);

    // Eski unique constraint olib tashlanadi, yangi (name, branchId) unique qo'shiladi
    await run('categories drop old unique', `
      ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "categories_name_key"
    `);
    await run('categories new unique (name, branchId)', `
      CREATE UNIQUE INDEX IF NOT EXISTS "categories_name_branchId_key" ON "categories"("name", "branchId")
    `);

    // ── 14. PRISMA MIGRATIONS TABLE ──────────────────────────────
    await run('prisma migrations table', `
      CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        "id"                  VARCHAR(36)  NOT NULL,
        "checksum"            VARCHAR(64)  NOT NULL,
        "finished_at"         TIMESTAMPTZ,
        "migration_name"      VARCHAR(255) NOT NULL,
        "logs"                TEXT,
        "rolled_back_at"      TIMESTAMPTZ,
        "started_at"          TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "applied_steps_count" INTEGER      NOT NULL DEFAULT 0,
        CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id")
      )
    `);

    const hasErrors = errors.length > 0;
    return NextResponse.json({
      success: !hasErrors,
      totalSteps: steps.length,
      errors: errors.length,
      steps,
    }, { status: hasErrors ? 207 : 200 });

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Server xatosi';
    return NextResponse.json({ error: msg, steps }, { status: 500 });
  }
}
