import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate   = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'startDate va endDate kerak' }, { status: 400 });
    }

    const session  = await getSession();
    const branchId = session?.branchId ?? null;

    const start = new Date(startDate);
    const end   = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Previous period dates
    const daysDiff = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
    const prevStart = new Date(start);
    prevStart.setDate(prevStart.getDate() - daysDiff);
    const prevEnd = new Date(end);
    prevEnd.setDate(prevEnd.getDate() - daysDiff);

    const whereBase  = { createdAt: { gte: start, lte: end },  ...(branchId ? { branchId } : {}) };
    const wherePrev  = { createdAt: { gte: prevStart, lte: prevEnd }, ...(branchId ? { branchId } : {}) };

    // Fetch sales — select only safe fields (saleType may not exist in prod DB)
    const [sales, previousSales] = await Promise.all([
      prisma.sale.findMany({
        where: whereBase,
        select: {
          id:          true,
          totalAmount: true,
          paymentType: true,
          cashAmount:  true,
          cardAmount:  true,
          createdAt:   true,
          saleItems: {
            select: {
              productId:   true,
              itemName:    true,
              quantity:    true,
              priceAtSale: true,
              product: {
                select: { name: true, purchasePrice: true },
              },
            },
          },
        },
      }),
      prisma.sale.findMany({ where: wherePrev, select: { totalAmount: true } }),
    ]);

    // Revenue
    const totalRevenue = sales.reduce((s, x) => s + x.totalAmount, 0);

    const totalCash = sales.reduce((s, x) => {
      if (x.paymentType === 'CASH')  return s + (x.cashAmount ?? x.totalAmount);
      if (x.paymentType === 'MIXED') return s + (x.cashAmount ?? 0);
      return s;
    }, 0);

    const totalCard = sales.reduce((s, x) => {
      if (x.paymentType === 'CARD')  return s + (x.cardAmount ?? x.totalAmount);
      if (x.paymentType === 'MIXED') return s + (x.cardAmount ?? 0);
      return s;
    }, 0);

    // Net profit (only product items have purchasePrice)
    let totalCost = 0;
    for (const sale of sales) {
      for (const item of sale.saleItems) {
        if (item.product?.purchasePrice) {
          totalCost += item.product.purchasePrice * item.quantity;
        }
      }
    }
    const netProfit = totalRevenue - totalCost;

    // Change vs previous
    const prevRevenue   = previousSales.reduce((s, x) => s + x.totalAmount, 0);
    const revenueChange = prevRevenue > 0
      ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;

    // Y/Sh — safe access with optional chaining
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const leSales   = sales.filter(s => (s as any).saleType === 'LEGAL_ENTITY');
    const leRevenue = leSales.reduce((s, x) => s + x.totalAmount, 0);
    const leCount   = leSales.length;

    // Top selling products
    const prodMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
    for (const sale of sales) {
      for (const item of sale.saleItems) {
        if (!item.productId) continue;
        const nm = item.product?.name ?? item.itemName;
        if (!prodMap[item.productId]) prodMap[item.productId] = { name: nm, quantity: 0, revenue: 0 };
        prodMap[item.productId].quantity += item.quantity;
        prodMap[item.productId].revenue  += item.priceAtSale * item.quantity;
      }
    }
    const topProducts = Object.values(prodMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Daily sales chart
    const dailySales: { date: string; revenue: number }[] = [];
    const cur = new Date(start);
    while (cur <= end) {
      const ds = new Date(cur); ds.setHours(0, 0, 0, 0);
      const de = new Date(cur); de.setHours(23, 59, 59, 999);
      const rev = sales
        .filter(s => s.createdAt >= ds && s.createdAt <= de)
        .reduce((s, x) => s + x.totalAmount, 0);
      dailySales.push({ date: cur.toISOString().split('T')[0], revenue: rev });
      cur.setDate(cur.getDate() + 1);
    }

    return NextResponse.json({
      stats: {
        totalRevenue, totalCash, totalCard,
        netProfit, revenueChange,
        salesCount:          sales.length,
        legalEntityRevenue:  leRevenue,
        legalEntityCount:    leCount,
        retailRevenue:       totalRevenue - leRevenue,
        retailCount:         sales.length - leCount,
      },
      topProducts,
      dailySales,
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Server xatosi', details: msg }, { status: 500 });
  }
}
