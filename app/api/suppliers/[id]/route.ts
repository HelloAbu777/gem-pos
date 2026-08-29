import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth/session';

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await context.params;
    const { name, contactPerson, phone } = await request.json();

    if (!name?.trim())          return NextResponse.json({ error: 'Ism kiritilmagan' }, { status: 400 });
    if (!contactPerson?.trim()) return NextResponse.json({ error: 'Mas\'ul shaxs kiritilmagan' }, { status: 400 });
    if (!phone?.trim())         return NextResponse.json({ error: 'Telefon kiritilmagan' }, { status: 400 });

    const supplier = await prisma.supplier.update({
      where: { id },
      data: { name: name.trim(), contactPerson: contactPerson.trim(), phone: phone.trim() },
    });

    return NextResponse.json(supplier);
  } catch (error) {
    console.error('Supplier PUT error:', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await context.params;

    // Bog'liq mahsulotlar borligini tekshirish
    const count = await prisma.product.count({ where: { supplierId: id } });
    if (count > 0) {
      return NextResponse.json(
        { error: `Bu ta'minotchi ${count} ta mahsulotga bog'liq. Avval mahsulotlarni o'zgartiring.` },
        { status: 400 }
      );
    }

    await prisma.supplier.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Supplier DELETE error:', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
