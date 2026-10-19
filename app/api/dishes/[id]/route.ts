import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PUT - taomni tahrirlash
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { name, price, costPrice, barcode, isActive } = await request.json();

    if (!name?.trim())        return NextResponse.json({ error: 'Nom kiritilmagan' }, { status: 400 });
    if (!price || price <= 0) return NextResponse.json({ error: "Narx noto'g'ri" }, { status: 400 });

    if (barcode?.trim()) {
      const ex = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM "dishes" WHERE barcode = ${barcode.trim()} AND id != ${id} LIMIT 1
      `;
      if (ex.length > 0) return NextResponse.json({ error: 'Bu barcode allaqachon mavjud' }, { status: 400 });
    }

    await prisma.$executeRaw`
      UPDATE "dishes" SET
        name      = ${name.trim()},
        price     = ${Number(price)},
        "costPrice" = ${Number(costPrice) || 0},
        barcode   = ${barcode?.trim() || null},
        "isActive" = ${isActive ?? true},
        "updatedAt" = NOW()
      WHERE id = ${id}
    `;

    const updated = await prisma.$queryRaw<object[]>`SELECT * FROM "dishes" WHERE id = ${id}`;
    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('Dish PUT error:', error);
    const msg = error instanceof Error ? error.message : 'Server xatosi';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE - taomni o'chirish
export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    await prisma.$executeRaw`DELETE FROM "dishes" WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Dish DELETE error:', error);
    const msg = error instanceof Error ? error.message : 'Server xatosi';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
