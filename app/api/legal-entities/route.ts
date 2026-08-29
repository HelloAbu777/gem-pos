import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth/session';

// GET - Barcha yuridik shaxslar
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const entities = await prisma.legalEntity.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { sales: true } },
        sales: {
          select: { totalAmount: true },
        },
      },
    });

    const result = entities.map(e => ({
      id: e.id,
      name: e.name,
      phone: e.phone,
      salesCount: e._count.sales,
      totalAmount: e.sales.reduce((s, sale) => s + sale.totalAmount, 0),
      createdAt: e.createdAt,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Legal entities GET error:', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

// POST - Yangi yuridik shaxs qo'shish
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { name, phone } = await request.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Ism kiritilmagan' }, { status: 400 });
    }
    if (!phone?.trim()) {
      return NextResponse.json({ error: 'Telefon raqam kiritilmagan' }, { status: 400 });
    }

    const entity = await prisma.legalEntity.create({
      data: { name: name.trim(), phone: phone.trim() },
    });

    return NextResponse.json(entity, { status: 201 });
  } catch (error) {
    console.error('Legal entity POST error:', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
