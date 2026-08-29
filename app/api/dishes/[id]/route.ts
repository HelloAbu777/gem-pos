import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PUT - taomni tahrirlash
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { name, price, barcode, isActive } = await request.json();

    if (!name?.trim())        return NextResponse.json({ error: 'Nom kiritilmagan' }, { status: 400 });
    if (!price || price <= 0) return NextResponse.json({ error: 'Narx noto\'g\'ri' }, { status: 400 });

    // Barcode unique tekshirish (o'zidan tashqari)
    if (barcode?.trim()) {
      const existing = await prisma.dish.findFirst({
        where: { barcode: barcode.trim(), id: { not: id } },
      });
      if (existing) return NextResponse.json({ error: 'Bu barcode allaqachon mavjud' }, { status: 400 });
    }

    const dish = await prisma.dish.update({
      where: { id },
      data: {
        name:     name.trim(),
        price:    Number(price),
        barcode:  barcode?.trim() || null,
        isActive: isActive ?? true,
      },
    });
    return NextResponse.json(dish);
  } catch (error) {
    console.error('Dish PUT error:', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

// DELETE - taomni o'chirish
export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    await prisma.dish.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Dish DELETE error:', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
