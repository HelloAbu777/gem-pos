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

    // FIX: To'g'ri validatsiya — bo'sh string yoki null tekshirish
    if (!data.name?.trim())
      return NextResponse.json({ error: 'Nom kiritilmagan' }, { status: 400 });
    if (data.salePrice === '' || data.salePrice == null)
      return NextResponse.json({ error: 'Sotish narxi kiritilmagan' }, { status: 400 });
    if (data.purchasePrice === '' || data.purchasePrice == null)
      return NextResponse.json({ error: 'Kelish narxi kiritilmagan' }, { status: 400 });
    if (!data.categoryId)
      return NextResponse.json({ error: 'Kategoriya tanlanmagan' }, { status: 400 });
    if (!data.supplierId)
      return NextResponse.json({ error: "Ta'minotchi tanlanmagan" }, { status: 400 });

    // Barcode unique tekshirish
    if (data.barcode?.trim()) {
      const ex = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM "products"
        WHERE barcode = ${data.barcode.trim()} AND id != ${id}
        LIMIT 1
      `;
      if (ex.length > 0)
        return NextResponse.json({ error: 'Bu barcode allaqachon mavjud' }, { status: 400 });
    }

    const margin = Number(data.salePrice) - Number(data.purchasePrice);

    // ExpiryDate — UTC offset muammosidan himoya: sana + T12:00:00 qo'shamiz
    let expiryDate: Date | null = null;
    if (data.expiryDate) {
      const d = new Date(`${data.expiryDate}T12:00:00`);
      if (!isNaN(d.getTime()) && d.getFullYear() >= 1900 && d.getFullYear() <= 2100) {
        expiryDate = d;
      }
    }

    // FIX: isPinned frontend dan keladi, yo'q bo'lsa mavjud qiymat saqlanadi
    const isPinnedValue = data.isPinned === true || data.isPinned === 'true';
    const vatTypeVal    = data.vatType || 'NO_VAT';

    await prisma.$executeRawUnsafe(`
      UPDATE "products" SET
        name            = $1,
        barcode         = $2,
        unit            = $3,
        quantity        = $4,
        "minQuantity"   = $5,
        "purchasePrice" = $6,
        "salePrice"     = $7,
        margin          = $8,
        "vatType"       = $9::"VATType",
        "expiryDate"    = $10,
        "isPinned"      = $11,
        "categoryId"    = $12,
        "supplierId"    = $13,
        "updatedAt"     = NOW()
      WHERE id = $14
    `,
      data.name.trim(),
      data.barcode?.trim() || null,
      data.unit || 'dona',
      Number(data.quantity) || 0,
      Number(data.minQuantity) || 10,
      Number(data.purchasePrice),
      Number(data.salePrice),
      margin,
      vatTypeVal,
      expiryDate,
      isPinnedValue,
      data.categoryId,
      data.supplierId,
      id
    );

    const updated = await prisma.$queryRaw<{
      id: string; name: string; barcode: string | null;
      unit: string; quantity: number; minQuantity: number;
      purchasePrice: number; salePrice: number; margin: number;
      vatType: string; expiryDate: Date | null; isPinned: boolean;
      branchId: string; categoryId: string; supplierId: string;
      categoryName: string; supplierName: string; supplierPhone: string;
    }[]>`
      SELECT p.id, p.name, p.barcode, p.unit, p.quantity, p."minQuantity",
             p."purchasePrice", p."salePrice", p.margin,
             p."vatType"::TEXT AS "vatType",
             p."expiryDate", p."isPinned", p."branchId",
             p."categoryId", c.name AS "categoryName",
             p."supplierId", s.name AS "supplierName", s.phone AS "supplierPhone"
      FROM "products" p
      LEFT JOIN "categories" c ON c.id = p."categoryId"
      LEFT JOIN "suppliers"  s ON s.id = p."supplierId"
      WHERE p.id = ${id}
    `;

    if (updated.length === 0)
      return NextResponse.json({ error: 'Mahsulot topilmadi' }, { status: 404 });

    const p = updated[0];
    return NextResponse.json({
      id: p.id, name: p.name, barcode: p.barcode,
      unit: p.unit, quantity: Number(p.quantity), minQuantity: Number(p.minQuantity),
      purchasePrice: Number(p.purchasePrice), salePrice: Number(p.salePrice),
      margin: Number(p.margin), vatType: p.vatType,
      expiryDate: p.expiryDate, isPinned: p.isPinned, branchId: p.branchId,
      category: { id: p.categoryId, name: p.categoryName },
      supplier: { id: p.supplierId, name: p.supplierName, phone: p.supplierPhone },
    });
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
    const { id }       = await context.params;
    const { isPinned } = await request.json();
    await prisma.$executeRaw`
      UPDATE "products"
      SET "isPinned" = ${Boolean(isPinned)}, "updatedAt" = NOW()
      WHERE id = ${id}
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
