import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { name, contactPerson, phone } = await request.json();

    if (!name?.trim())          return NextResponse.json({ error: 'Ism kiritilmagan' }, { status: 400 });
    if (!contactPerson?.trim()) return NextResponse.json({ error: "Mas'ul shaxs kiritilmagan" }, { status: 400 });
    if (!phone?.trim())         return NextResponse.json({ error: 'Telefon kiritilmagan' }, { status: 400 });

    await prisma.$executeRaw`
      UPDATE "suppliers"
      SET name = ${name.trim()}, "contactPerson" = ${contactPerson.trim()},
          phone = ${phone.trim()}, "updatedAt" = NOW()
      WHERE id = ${id}
    `;

    return NextResponse.json({ id, name: name.trim(), contactPerson: contactPerson.trim(), phone: phone.trim() });
  } catch (error) {
    console.error('Supplier PUT error:', error);
    const msg = error instanceof Error ? error.message : 'Server xatosi';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const count = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) AS count FROM "products" WHERE "supplierId" = ${id}
    `;
    const n = Number(count[0]?.count ?? 0);
    if (n > 0) {
      return NextResponse.json(
        { error: `Bu ta'minotchi ${n} ta mahsulotga bog'liq. Avval mahsulotlarni o'zgartiring.` },
        { status: 400 }
      );
    }

    await prisma.$executeRaw`DELETE FROM "suppliers" WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Supplier DELETE error:', error);
    const msg = error instanceof Error ? error.message : 'Server xatosi';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
