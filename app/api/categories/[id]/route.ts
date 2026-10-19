import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { name } = await request.json();

    if (!name?.trim()) return NextResponse.json({ error: 'Kategoriya nomi kiritilmagan' }, { status: 400 });

    await prisma.$executeRaw`
      UPDATE "categories" SET name = ${name.trim()}, "updatedAt" = NOW() WHERE id = ${id}
    `;

    const updated = await prisma.$queryRaw<{ id: string; name: string; branchId: string }[]>`
      SELECT id, name, "branchId" FROM "categories" WHERE id = ${id}
    `;
    return NextResponse.json({ ...updated[0], _count: { products: 0 } });
  } catch (error) {
    console.error('Category PUT error:', error);
    const msg = error instanceof Error ? error.message : 'Server xatosi';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const count = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) AS count FROM "products" WHERE "categoryId" = ${id}
    `;
    const n = Number(count[0]?.count ?? 0);
    if (n > 0) {
      return NextResponse.json(
        { error: `Bu kategoriyada ${n} ta mahsulot bor. Avval mahsulotlarni o'chiring.` },
        { status: 400 }
      );
    }

    await prisma.$executeRaw`DELETE FROM "categories" WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Category DELETE error:', error);
    const msg = error instanceof Error ? error.message : 'Server xatosi';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
