import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PUT - Kategoriyani yangilash
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { name } = await request.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Kategoriya nomi kiritilmagan' }, { status: 400 });
    }

    const category = await prisma.category.update({
      where: { id },
      data:  { name: name.trim() },
      include: { _count: { select: { products: true } } },
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error('Category PUT error:', error);
    const msg = error instanceof Error ? error.message : 'Server xatosi';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE - Kategoriyani o'chirish
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const count = await prisma.product.count({ where: { categoryId: id } });
    if (count > 0) {
      return NextResponse.json(
        { error: `Bu kategoriyada ${count} ta mahsulot bor. Avval mahsulotlarni o'chiring.` },
        { status: 400 }
      );
    }

    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Category DELETE error:', error);
    const msg = error instanceof Error ? error.message : 'Server xatosi';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
