import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = request.nextUrl;
    const limit  = parseInt(searchParams.get('limit')  || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where = { branchId: session.branchId };

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: {
          cashier:     { select: { id: true, name: true } },
          legalEntity: { select: { id: true, name: true, phone: true } },
          saleItems:   { select: { itemName: true, quantity: true, priceAtSale: true } },
        },
        orderBy: { createdAt: 'desc' },
        take:    limit,
        skip:    offset,
      }),
      prisma.sale.count({ where }),
    ]);

    return NextResponse.json({ sales, total, limit, offset });
  } catch (error) {
    console.error('Sales history error:', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
