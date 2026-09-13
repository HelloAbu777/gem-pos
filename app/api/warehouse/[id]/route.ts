import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PUT - Tahrirlash
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const data    = await request.json();

    if (!data.name?.trim()) {
      return NextResponse.json({ error: 'Nom kiritilmagan' }, { status: 400 });
    }

    if (data.barcode?.trim()) {
      const ex = await prisma.warehouseItem.findFirst({
        where: { barcode: data.barcode.trim(), id: { not: id } },
      });
      if (ex) return NextResponse.json({ error: 'Bu barcode allaqachon mavjud' }, { status: 400 });
    }

    const item = await prisma.warehouseItem.update({
      where: { id },
      data: {
        name:          data.name.trim(),
        barcode:       data.barcode?.trim() || null,
        unit:          data.unit || 'dona',
        quantity:      Number(data.quantity) || 0,
        purchasePrice: Number(data.purchasePrice) || 0,
        description:   data.description?.trim() || null,
        categoryId:    data.categoryId || null,
        supplierId:    data.supplierId || null,
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error('Warehouse PUT error:', error);
    const msg = error instanceof Error ? error.message : 'Server xatosi';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE - O'chirish
export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    await prisma.warehouseItem.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Warehouse DELETE error:', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
