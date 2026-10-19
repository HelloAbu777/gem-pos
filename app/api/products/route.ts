import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth/session';

const DEFAULT_BRANCH_ID = 'default-branch';

// GET - Barcha mahsulotlar (raw SQL — enum type muammosini bypass qiladi)
export async function GET() {
  try {
    const session  = await getSession();
    const branchId = session?.branchId ?? DEFAULT_BRANCH_ID;

    const products = await prisma.$queryRaw<{
      id: string; name: string; barcode: string | null;
      unit: string; quantity: number; minQuantity: number;
      purchasePrice: number; salePrice: number; margin: number;
      vatType: string; expiryDate: string | null; isPinned: boolean;
      categoryId: string; categoryName: string;
      supplierId: string; supplierName: string; supplierPhone: string;
      branchId: string; createdAt: string; updatedAt: string;
    }[]>`
      SELECT
        p.id, p.name, p.barcode, p.unit,
        p.quantity, p."minQuantity",
        p."purchasePrice", p."salePrice", p.margin,
        p."vatType"::TEXT AS "vatType",
        p."expiryDate", p."isPinned",
        p."categoryId", c.name AS "categoryName",
        p."supplierId", s.name AS "supplierName", s.phone AS "supplierPhone",
        p."branchId", p."createdAt", p."updatedAt"
      FROM "products" p
      LEFT JOIN "categories" c ON c.id = p."categoryId"
      LEFT JOIN "suppliers"  s ON s.id = p."supplierId"
      WHERE p."branchId" = ${branchId}
      ORDER BY p."isPinned" DESC, p.name ASC
    `;

    // Frontend kutgan formatga moslashtirish
    const result = products.map(p => ({
      id:            p.id,
      name:          p.name,
      barcode:       p.barcode,
      unit:          p.unit,
      quantity:      Number(p.quantity),
      minQuantity:   Number(p.minQuantity),
      purchasePrice: Number(p.purchasePrice),
      salePrice:     Number(p.salePrice),
      margin:        Number(p.margin),
      vatType:       p.vatType,
      expiryDate:    p.expiryDate,
      isPinned:      p.isPinned,
      branchId:      p.branchId,
      createdAt:     p.createdAt,
      updatedAt:     p.updatedAt,
      category:      { id: p.categoryId,  name: p.categoryName },
      supplier:      { id: p.supplierId,  name: p.supplierName, phone: p.supplierPhone },
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Products GET error:', error);
    const msg = error instanceof Error ? error.message : 'Server xatosi';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST - Yangi mahsulot yaratish
export async function POST(request: NextRequest) {
  try {
    const session  = await getSession();
    const branchId = session?.branchId ?? DEFAULT_BRANCH_ID;
    const data     = await request.json();

    if (!data.name?.trim())  return NextResponse.json({ error: 'Nom kiritilmagan' },          { status: 400 });
    if (!data.categoryId)    return NextResponse.json({ error: 'Kategoriya tanlanmagan' },     { status: 400 });
    if (!data.supplierId)    return NextResponse.json({ error: "Ta'minotchi tanlanmagan" },    { status: 400 });
    if (!data.salePrice)     return NextResponse.json({ error: 'Sotish narxi kiritilmagan' },  { status: 400 });
    if (!data.purchasePrice) return NextResponse.json({ error: 'Kelish narxi kiritilmagan' },  { status: 400 });

    // Barcode tekshirish
    if (data.barcode?.trim()) {
      const exists = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM "products" WHERE barcode = ${data.barcode.trim()} LIMIT 1
      `;
      if (exists.length > 0) return NextResponse.json({ error: 'Bu shtrix kod allaqachon mavjud' }, { status: 400 });
    }

    // Branch mavjudligini ta'minlash
    await prisma.$executeRaw`
      INSERT INTO "branches" ("id","name","updatedAt")
      VALUES (${branchId}, 'Asosiy filial', NOW())
      ON CONFLICT ("id") DO NOTHING
    `;

    let expiryDate: string | null = null;
    if (data.expiryDate) {
      const d = new Date(data.expiryDate);
      if (!isNaN(d.getTime()) && d.getFullYear() >= 1900 && d.getFullYear() <= 2100) {
        expiryDate = d.toISOString();
      }
    }

    const margin = Number(data.salePrice) - Number(data.purchasePrice);
    const id = `prod_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    await prisma.$executeRaw`
      INSERT INTO "products" (
        "id","name","barcode","unit","quantity","minQuantity",
        "purchasePrice","salePrice","margin","vatType",
        "expiryDate","isPinned","categoryId","supplierId","branchId",
        "createdAt","updatedAt"
      ) VALUES (
        ${id},
        ${data.name.trim()},
        ${data.barcode?.trim() || null},
        ${data.unit || 'dona'},
        ${Number(data.quantity) || 0},
        ${Number(data.minQuantity) || 10},
        ${Number(data.purchasePrice)},
        ${Number(data.salePrice)},
        ${margin},
        ${data.vatType || 'NO_VAT'},
        ${expiryDate ? new Date(expiryDate) : null},
        ${data.isPinned === true},
        ${data.categoryId},
        ${data.supplierId},
        ${branchId},
        NOW(), NOW()
      )
    `;

    const created = await prisma.$queryRaw<{ id: string; name: string }[]>`
      SELECT p.id, p.name, p.barcode, p.unit, p.quantity, p."minQuantity",
             p."purchasePrice", p."salePrice", p.margin, p."vatType"::TEXT AS "vatType",
             p."expiryDate", p."isPinned", p."branchId",
             p."categoryId", c.name AS "categoryName",
             p."supplierId", s.name AS "supplierName", s.phone AS "supplierPhone"
      FROM "products" p
      LEFT JOIN "categories" c ON c.id = p."categoryId"
      LEFT JOIN "suppliers"  s ON s.id = p."supplierId"
      WHERE p.id = ${id}
    `;

    return NextResponse.json(created[0], { status: 201 });
  } catch (error) {
    console.error('Products POST error:', error);
    const msg = error instanceof Error ? error.message : 'Server xatosi';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
