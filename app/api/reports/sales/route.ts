import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/reports/sales
 *
 * Query params:
 *   from        — boshlanish sanasi (YYYY-MM-DD), default: bugun
 *   to          — tugash sanasi    (YYYY-MM-DD), default: bugun
 *   paymentType — "CASH" | "CARD" | "MIXED" | "all" (default: "all")
 *   saleType    — "RETAIL" | "LEGAL_ENTITY" | "all" (default: "all")
 *   limit       — nechta (default: 500)
 *
 * Response:
 *   { total, totalAmount, totalCash, totalCard, salesCount, sales: [...] }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const from        = searchParams.get('from');
    const to          = searchParams.get('to');
    const paymentType = searchParams.get('paymentType') || 'all';
    const saleType    = searchParams.get('saleType')    || 'all';
    const limit       = parseInt(searchParams.get('limit') || '500');

    const today = new Date().toISOString().split('T')[0];
    const start = new Date(from || today);
    const end   = new Date(to   || today);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    // Filter qurish
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {
      createdAt: { gte: start, lte: end },
    };
    if (paymentType !== 'all') where.paymentType = paymentType;
    if (saleType    !== 'all') where.saleType    = saleType;

    const sales = await prisma.sale.findMany({
      where,
      include: {
        cashier:     { select: { id: true, name: true } },
        legalEntity: { select: { id: true, name: true, phone: true } },
        saleItems: {
          select: {
            id:          true,
            itemName:    true,
            quantity:    true,
            priceAtSale: true,
            productId:   true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Umumiy statistika
    const totalAmount = sales.reduce((s, x) => s + x.totalAmount, 0);
    const totalCash   = sales.reduce((s, x) => {
      if (x.paymentType === 'CASH')  return s + (x.cashAmount ?? x.totalAmount);
      if (x.paymentType === 'MIXED') return s + (x.cashAmount ?? 0);
      return s;
    }, 0);
    const totalCard = sales.reduce((s, x) => {
      if (x.paymentType === 'CARD')  return s + (x.cardAmount ?? x.totalAmount);
      if (x.paymentType === 'MIXED') return s + (x.cardAmount ?? 0);
      return s;
    }, 0);
    const legalEntityAmount = sales
      .filter(x => x.saleType === 'LEGAL_ENTITY')
      .reduce((s, x) => s + x.totalAmount, 0);

    // Har bir sotuv uchun to'liq ma'lumot
    const result = sales.map(sale => ({
      id:            sale.id,
      totalAmount:   sale.totalAmount,
      paymentType:   sale.paymentType,
      cashAmount:    sale.cashAmount,
      cardAmount:    sale.cardAmount,
      saleType:      sale.saleType,
      cashier:       sale.cashier.name,
      cashierId:     sale.cashier.id,
      legalEntity:   sale.legalEntity?.name  || null,
      legalEntityId: sale.legalEntity?.id    || null,
      legalPhone:    sale.legalEntity?.phone || null,
      itemsCount:    sale.saleItems.reduce((s, i) => s + i.quantity, 0),
      items: sale.saleItems.map(item => ({
        id:          item.id,
        name:        item.itemName,
        quantity:    item.quantity,
        price:       item.priceAtSale,
        total:       item.priceAtSale * item.quantity,
        productId:   item.productId,
      })),
      createdAt:     sale.createdAt,
    }));

    return NextResponse.json({
      from:               start.toISOString(),
      to:                 end.toISOString(),
      salesCount:         sales.length,
      totalAmount,
      totalCash,
      totalCard,
      legalEntityAmount,
      retailAmount:       totalAmount - legalEntityAmount,
      sales:              result,
    });

  } catch (error) {
    console.error('Sales report error:', error);
    const msg = error instanceof Error ? error.message : 'Server xatosi';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
