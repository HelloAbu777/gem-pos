import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PUT - Mahsulotni tahrirlash
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const data    = await request.json();

    if (!data.name?.trim())  return NextResponse.json({ error: 'Nom kiritilmagan' }, { status: 400 });
    if (!data.salePrice)     return NextResponse.json({ error: 'Sotish narxi kiritilmagan' }, { status: 400 });
    if (!data.purchasePrice) return NextResponse.json({ error: 'Kelish narxi kiritilmagan' }, { status: 400 });

    if (data.barcode?.trim()) {
      const ex = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM "products" WHERE barcode = ${data.barcode.trim()} AND id != ${id} LIMIT 1
      `;
      if (ex.length > 0) return NextResponse.json({ error: 'Bu barcode allaqachon mavjud' }, { status: 400 });
    }

    const margin = Number(data.salePrice) - Number(data.purchasePrice);

    let expiryDate: Date | null = null;
    if (data.expiryDate) {
      const d = new Date(data.expiryDate);
      if (!isNaN(d.getTime()) && d.getFullYear() >= 1900 && d.getFullYear() <= 2100) {
        expiryDate = d;
      }
    }

    await prisma.$executeRaw`
      UPDATE "products" SET
        name          = ${data.name.trim()},
        barcode       = ${data.barcode?.trim() || null},
        unit          = ${data.unit || 'dona'},
        quantity      = ${Number(data.quantity) || 0},
        "minQuantity" = ${Number(data.minQuantity) || 10},
        "purchasePrice" = ${Number(data.purchasePrice)},
        "salePrice"   = ${Number(data.salePrice)},
        margin        = ${margin},
        "vatType"     = ${data.vatType || 'NO_VAT'},
        "expiryDate"  = ${expiryDate},
        "isPinned"    = ${data.isPinned === true},
        "categoryId"  = ${data.categoryId},
        "supplierId"  = ${data.supplierId},
        "updatedAt"   = NOW()
      WHERE id = ${id}
    `;

    const updated = await prisma.$queryRaw<object[]>`
      SELECT p.*, p."vatType"::TEXT AS "vatType",
             c.name AS "categoryName", s.name AS "supplierName", s.phone AS "supplierPhone"
      FROM "products" p
      LEFT JOIN "categories" c ON c.id = p."categoryId"
      LEFT JOIN "suppliers"  s ON s.id = p."supplierId"
      WHERE p.id = ${id}
    `;

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('Product PUT error:', error);
    const msg = error instanceof Error ? error.message : 'Server xatosi';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PATCH - Pin/Unpin
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id }      = await context.params;
    const { isPinned } = await request.json();
    await prisma.$executeRaw`
      UPDATE "products" SET "isPinned" = ${Boolean(isPinned)}, "updatedAt" = NOW() WHERE id = ${id}
    `;
    return NextResponse.json({ id, isPinned: Boolean(isPinned) });
  } catch (error) {
    console.error('Product PATCH error:', error);
    const msg = error instanceof Error ? error.message : 'Server xatosi';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE - Mahsulotni o'chirish
export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const count = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) AS count FROM "sale_items" WHERE "productId" = ${id}
    `;
    const saleCount = Number(count[0]?.count ?? 0);
    if (saleCount > 0) {
      return NextResponse.json(
        { error: `Bu mahsulot ${saleCount} ta sotuvda ishlatilgan. O'chirib bo'lmaydi.` },
        { status: 400 }
      );
    }

    await prisma.$executeRaw`DELETE FROM "products" WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Product DELETE error:', error);
    const msg = error instanceof Error ? error.message : 'Server xatosi';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
