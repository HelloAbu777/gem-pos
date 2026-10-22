import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth/session';

// GET /api/super-admin/stats?startDate=...&endDate=...&branchId=all|<id>
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });
    }

    const { searchParams } = request.nextUrl;
    const startDate = searchParams.get('startDate');
    const endDate   = searchParams.get('endDate');
    const branchId  = searchParams.get('branchId') || 'all';

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'startDate va endDate kerak' }, { status: 400 });
    }

    const start = new Date(startDate + 'T00:00:00Z');
    start.setUTCHours(3, 0, 0, 0); // UTC+5 08:00 = UTC 03:00
    const end = new Date(endDate + 'T00:00:00Z');
    end.setUTCDate(end.getUTCDate() + 1);
    end.setUTCHours(2, 59, 59, 999); // UTC+5 07:59 = UTC 02:59

    // Branch filter
    const branchFilter = branchId !== 'all' ? { branchId } : {};

    const whereBase = { createdAt: { gte: start, lte: end }, ...branchFilter };

    // Oldingi davr uchun solishtirish
    const daysDiff  = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
    const prevStart = new Date(start); prevStart.setDate(prevStart.getDate() - daysDiff);
    const prevEnd   = new Date(end);   prevEnd.setDate(prevEnd.getDate() - daysDiff);
    const wherePrev = { createdAt: { gte: prevStart, lte: prevEnd }, ...branchFilter };

    const [allSales, prevSales, branches] = await Promise.all([
      prisma.sale.findMany({
        where: whereBase,
        select: {
          id: true,
          totalAmount: true,
          paymentType: true,
          cashAmount: true,
          cardAmount: true,
          saleType: true,
          legalEntityId: true,
          branchId: true,
          createdAt: true,
          branch: { select: { id: true, name: true } },
          saleItems: {
            select: {
              productId: true,
              itemName: true,
              quantity: true,
              priceAtSale: true,
              product: { select: { name: true, purchasePrice: true } },
            },
          },
        },
      }),
      prisma.sale.findMany({
        where: wherePrev,
        select: { totalAmount: true, saleType: true, branchId: true },
      }),
      prisma.branch.findMany({
        select: { id: true, name: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // Guruhlar
    const retailSales = allSales.filter(s => s.saleType !== 'LEGAL_ENTITY' && !s.legalEntityId);
    const leSales     = allSales.filter(s => s.saleType === 'LEGAL_ENTITY' || s.legalEntityId);

    const totalRevenue = retailSales.reduce((s, x) => s + x.totalAmount, 0);
    const totalCash    = retailSales.reduce((s, x) => {
      if (x.paymentType === 'CASH')  return s + (x.cashAmount ?? x.totalAmount);
      if (x.paymentType === 'MIXED') return s + (x.cashAmount ?? 0);
      return s;
    }, 0);
    const totalCard = retailSales.reduce((s, x) => {
      if (x.paymentType === 'CARD')  return s + (x.cardAmount ?? x.totalAmount);
      if (x.paymentType === 'MIXED') return s + (x.cardAmount ?? 0);
      return s;
    }, 0);

    // Sof foyda
    let totalCost = 0;
    for (const sale of retailSales) {
      for (const item of sale.saleItems) {
        if (item.product?.purchasePrice) {
          totalCost += item.product.purchasePrice * item.quantity;
        }
      }
    }
    const netProfit = totalRevenue - totalCost;

    // O'sish foizi
    const prevRetail    = prevSales.filter(s => s.saleType !== 'LEGAL_ENTITY');
    const prevRevenue   = prevRetail.reduce((s, x) => s + x.totalAmount, 0);
    const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;

    // Y/Sh
    const leRevenue = leSales.reduce((s, x) => s + x.totalAmount, 0);

    // Top mahsulotlar
    const prodMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
    for (const sale of allSales) {
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

    // Filiallar bo'yicha taqsimot (branchId === 'all' bo'lganda foydali)
    const branchStats = branches.map(br => {
      const bSales   = allSales.filter(s => s.branchId === br.id);
      const bRetail  = bSales.filter(s => s.saleType !== 'LEGAL_ENTITY' && !s.legalEntityId);
      const bRevenue = bRetail.reduce((s, x) => s + x.totalAmount, 0);
      const bLE      = bSales.filter(s => s.saleType === 'LEGAL_ENTITY' || s.legalEntityId).reduce((s, x) => s + x.totalAmount, 0);
      let bCost = 0;
      for (const sale of bRetail) {
        for (const item of sale.saleItems) {
          if (item.product?.purchasePrice) bCost += item.product.purchasePrice * item.quantity;
        }
      }
      return {
        branchId: br.id,
        branchName: br.name,
        salesCount: bRetail.length,
        totalRevenue: bRevenue,
        netProfit: bRevenue - bCost,
        leRevenue: bLE,
      };
    });

    // Kunlik grafik
    const dailyMap: Record<string, number> = {};
    for (const sale of retailSales) {
      const day = sale.createdAt.toISOString().split('T')[0];
      dailyMap[day] = (dailyMap[day] ?? 0) + sale.totalAmount;
    }
    const dailySales = Object.entries(dailyMap)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      totalRevenue,
      totalCash,
      totalCard,
      netProfit,
      revenueChange,
      salesCount: retailSales.length,
      leRevenue,
      leCount: leSales.length,
      topProducts,
      branchStats,
      dailySales,
    });

  } catch (error) {
    console.error('Super admin stats error:', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
