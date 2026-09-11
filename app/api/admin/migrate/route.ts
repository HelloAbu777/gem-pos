import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  if (secret !== 'gem-clear-2026') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const steps: string[] = [];

  try {
    // Enums
    await prisma.$executeRawUnsafe(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role') THEN CREATE TYPE "Role" AS ENUM ('ADMIN', 'CASHIER'); END IF; END $$;`);
    await prisma.$executeRawUnsafe(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'VATType') THEN CREATE TYPE "VATType" AS ENUM ('STANDARD', 'NO_VAT', 'ZERO_VAT'); END IF; END $$;`);
    await prisma.$executeRawUnsafe(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentType') THEN CREATE TYPE "PaymentType" AS ENUM ('CASH', 'CARD', 'MIXED'); END IF; END $$;`);
    await prisma.$executeRawUnsafe(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SaleType') THEN CREATE TYPE "SaleType" AS ENUM ('RETAIL', 'LEGAL_ENTITY'); END IF; END $$;`);
    steps.push('enums');

    // Tables
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "branches" ("id" TEXT NOT NULL, "name" TEXT NOT NULL, "address" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "branches_pkey" PRIMARY KEY ("id"));`);
    steps.push('branches');

    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "users" ("id" TEXT NOT NULL, "name" TEXT NOT NULL, "login" TEXT NOT NULL, "password" TEXT NOT NULL, "role" "Role" NOT NULL DEFAULT 'CASHIER', "branchId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "users_pkey" PRIMARY KEY ("id"));`);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "users_login_key" ON "users"("login");`);
    steps.push('users');

    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "categories" ("id" TEXT NOT NULL, "name" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "categories_pkey" PRIMARY KEY ("id"));`);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "categories_name_key" ON "categories"("name");`);
    steps.push('categories');

    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "suppliers" ("id" TEXT NOT NULL, "name" TEXT NOT NULL, "contactPerson" TEXT NOT NULL, "phone" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id"));`);
    steps.push('suppliers');

    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "legal_entities" ("id" TEXT NOT NULL, "name" TEXT NOT NULL, "phone" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "legal_entities_pkey" PRIMARY KEY ("id"));`);
    steps.push('legal_entities');

    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "products" ("id" TEXT NOT NULL, "name" TEXT NOT NULL, "barcode" TEXT, "unit" TEXT NOT NULL DEFAULT 'dona', "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0, "minQuantity" DOUBLE PRECISION NOT NULL DEFAULT 10, "purchasePrice" DOUBLE PRECISION NOT NULL, "salePrice" DOUBLE PRECISION NOT NULL, "margin" DOUBLE PRECISION NOT NULL, "vatType" "VATType" NOT NULL DEFAULT 'NO_VAT', "expiryDate" TIMESTAMP(3), "categoryId" TEXT NOT NULL, "supplierId" TEXT NOT NULL, "branchId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "products_pkey" PRIMARY KEY ("id"));`);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "products_barcode_key" ON "products"("barcode");`);
    steps.push('products');

    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "dishes" ("id" TEXT NOT NULL, "name" TEXT NOT NULL, "price" DOUBLE PRECISION NOT NULL, "barcode" TEXT, "isActive" BOOLEAN NOT NULL DEFAULT true, "branchId" TEXT NOT NULL DEFAULT 'default-branch', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "dishes_pkey" PRIMARY KEY ("id"));`);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "dishes_barcode_key" ON "dishes"("barcode");`);
    steps.push('dishes');

    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "sales" ("id" TEXT NOT NULL, "totalAmount" DOUBLE PRECISION NOT NULL, "paymentType" "PaymentType" NOT NULL, "cashAmount" DOUBLE PRECISION, "cardAmount" DOUBLE PRECISION, "saleType" "SaleType" NOT NULL DEFAULT 'RETAIL', "cashierId" TEXT NOT NULL, "branchId" TEXT NOT NULL, "legalEntityId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "sales_pkey" PRIMARY KEY ("id"));`);
    steps.push('sales');

    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "sale_items" ("id" TEXT NOT NULL, "saleId" TEXT NOT NULL, "productId" TEXT, "itemName" TEXT NOT NULL DEFAULT '', "quantity" DOUBLE PRECISION NOT NULL, "priceAtSale" DOUBLE PRECISION NOT NULL, CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id"));`);
    steps.push('sale_items');

    // Foreign keys (IF NOT EXISTS workaround)
    const fks = [
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_branchId_fkey') THEN ALTER TABLE "users" ADD CONSTRAINT "users_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_categoryId_fkey') THEN ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_supplierId_fkey') THEN ALTER TABLE "products" ADD CONSTRAINT "products_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_branchId_fkey') THEN ALTER TABLE "products" ADD CONSTRAINT "products_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sales_cashierId_fkey') THEN ALTER TABLE "sales" ADD CONSTRAINT "sales_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sales_branchId_fkey') THEN ALTER TABLE "sales" ADD CONSTRAINT "sales_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sales_legalEntityId_fkey') THEN ALTER TABLE "sales" ADD CONSTRAINT "sales_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "legal_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sale_items_saleId_fkey') THEN ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sale_items_productId_fkey') THEN ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;`,
    ];
    for (const fk of fks) await prisma.$executeRawUnsafe(fk);
    steps.push('foreign_keys');

    // Seed admin user
    const bcrypt = await import('bcryptjs');
    const hash = await bcrypt.hash('admin123', 10);
    await prisma.$executeRawUnsafe(`INSERT INTO "branches" ("id","name","updatedAt") VALUES ('default-branch','Asosiy filial',NOW()) ON CONFLICT ("id") DO NOTHING;`);
    await prisma.$executeRawUnsafe(`INSERT INTO "users" ("id","name","login","password","role","branchId","updatedAt") VALUES ('default-cashier','Admin','admin','${hash}','ADMIN','default-branch',NOW()) ON CONFLICT ("login") DO NOTHING;`);
    steps.push('seed_admin');

    // Prisma migrations table
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "_prisma_migrations" ("id" VARCHAR(36) NOT NULL, "checksum" VARCHAR(64) NOT NULL, "finished_at" TIMESTAMPTZ, "migration_name" VARCHAR(255) NOT NULL, "logs" TEXT, "rolled_back_at" TIMESTAMPTZ, "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "applied_steps_count" INTEGER NOT NULL DEFAULT 0, CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id"));`);
    steps.push('prisma_migrations_table');

    return NextResponse.json({ success: true, steps });

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Server xatosi';
    return NextResponse.json({ error: msg, steps }, { status: 500 });
  }
}
