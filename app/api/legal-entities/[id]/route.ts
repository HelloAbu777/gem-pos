import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth/session';

// GET - Bitta yuridik shaxs (sotuvlar tarixi bilan)
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await context.params;

    const entity = await prisma.legalEntity.findUnique({
      where: { id },
      include: {
        sales: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            cashier: { select: { name: true } },
            saleItems: { select: { itemName: true, quantity: true, priceAtSale: true } },
          },
        },
      },
    });

    if (!entity) return NextResponse.json({ error: 'Topilmadi' }, { status: 404 });

    return NextResponse.json(entity);
  } catch (error) {
    console.error('Legal entity GET error:', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

// PUT - Tahrirlash
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await context.params;
    const { name, phone } = await request.json();

    if (!name?.trim()) return NextResponse.json({ error: 'Ism kiritilmagan' }, { status: 400 });
    if (!phone?.trim()) return NextResponse.json({ error: 'Telefon kiritilmagan' }, { status: 400 });

    const entity = await prisma.legalEntity.update({
      where: { id },
      data: { name: name.trim(), phone: phone.trim() },
    });

    return NextResponse.json(entity);
  } catch (error) {
    console.error('Legal entity PUT error:', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

// DELETE - O'chirish
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await context.params;

    await prisma.legalEntity.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Legal entity DELETE error:', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
