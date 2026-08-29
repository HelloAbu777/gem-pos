import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth/session';

interface SaleItemInput {
  productId?: string | null;
  itemName: string;
  quantity: number;
  priceAtSale: number;
}

interface SaleRequest {
  paymentType: 'CASH' | 'CARD' | 'MIXED';
  cashAmount?: number;
  cardAmount?: number;
  legalEntityId?: string | null;
  items: SaleItemInput[];
}

// POST - Yangi sotuv
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const data: SaleRequest = await request.json();

    if (!data.items || data.items.length === 0)
      return NextResponse.json({ error: 'Savat bo\'sh' }, { status: 400 });

    const totalAmount = data.items.reduce((s, i) => s + i.priceAtSale * i.quantity, 0);

    let cashAmount = data.cashAmount ?? 0;
    let cardAmount = data.cardAmount ?? 0;

    if (data.paymentType === 'CARD') { cashAmount = 0; cardAmount = totalAmount; }
    if (data.paymentType === 'CASH') {
      if (cashAmount < totalAmount)
        return NextResponse.json({ error: 'Naqd summa yetarli emas' }, { status: 400 });
    }
    if (data.paymentType === 'MIXED') {
      if (Math.abs(cashAmount + cardAmount - totalAmount) > 1)
        return NextResponse.json({ error: 'Naqd+Karta summasi jami bilan teng emas' }, { status: 400 });
    }

    // Y/Sh tekshiruv
    const saleType = data.legalEntityId ? 'LEGAL_ENTITY' : 'RETAIL';
    if (data.legalEntityId) {
      const le = await prisma.legalEntity.findUnique({ where: { id: data.legalEntityId } });
      if (!le) return NextResponse.json({ error: 'Yuridik shaxs topilmadi' }, { status: 400 });
    }

    const sale = await prisma.$transaction(async (tx) => {
      // Mahsulot zaxirasini tekshirish
      for (const item of data.items) {
        if (!item.productId) continue;
        const product = await tx.product.findFirst({
          where: { id: item.productId, branchId: session.branchId },
        });
        if (!product) throw new Error(`Mahsulot topilmadi: ${item.itemName}`);
        if (product.quantity < item.quantity)
          throw new Error(`"${product.name}" zaxirada yetarli emas. Mavjud: ${product.quantity}`);
      }

      // Sotuv yaratish
      const newSale = await tx.sale.create({
        data: {
          totalAmount,
          paymentType: data.paymentType,
          cashAmount,
          cardAmount,
          saleType,
          cashierId:     session.userId,
          branchId:      session.branchId,
          legalEntityId: data.legalEntityId ?? null,
          saleItems: {
            create: data.items.map(item => ({
              productId:   item.productId ?? null,
              itemName:    item.itemName,
              quantity:    item.quantity,
              priceAtSale: item.priceAtSale,
            })),
          },
        },
        include: {
          saleItems: true,
          legalEntity: { select: { id: true, name: true, phone: true } },
          cashier:     { select: { id: true, name: true } },
        },
      });

      // Mahsulot zaxirasini kamaytirish
      for (const item of data.items) {
        if (!item.productId) continue;
        await tx.product.update({
          where: { id: item.productId },
          data:  { quantity: { decrement: item.quantity } },
        });
      }

      return newSale;
    });

    return NextResponse.json({ success: true, sale }, { status: 201 });

  } catch (error) {
    console.error('Sale POST error:', error);
    if (error instanceof Error)
      return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

// GET - Sotuvlar tarixi
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
    console.error('Sale GET error:', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
