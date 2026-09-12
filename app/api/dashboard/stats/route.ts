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

    const daysDiff  = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
    const prevStart = new Date(start); prevStart.setDate(prevStart.getDate() - daysDiff);
    const prevEnd   = new Date(end);   prevEnd.setDate(prevEnd.getDate() - daysDiff);

    const whereBase = { createdAt: { gte: start, lte: end }, ...(branchId ? { branchId } : {}) };
    const wherePrev = { createdAt: { gte: prevStart, lte: prevEnd }, ...(branchId ? { branchId } : {}) };

    const selectFields = {
      id:            true,
      totalAmount:   true,
      paymentType:   true,
      cashAmount:    true,
      cardAmount:    true,
      saleType:      true,
      legalEntityId: true,
      createdAt:     true,
      saleItems: {
        select: {
          productId:   true,
          itemName:    true,
          quantity:    true,
          priceAtSale: true,
          product: { select: { name: true, purchasePrice: true } },
        },
      },
    } as const;

    const [allSales, previousSales] = await Promise.all([
      prisma.sale.findMany({ where: whereBase, select: selectFields }),
      prisma.sale.findMany({ where: wherePrev, select: { totalAmount: true, saleType: true, legalEntityId: true } }),
    ]);

    // ── Ikki guruhga ajratish ──────────────────────────────────────
    const leSales     = allSales.filter(s => s.saleType === 'LEGAL_ENTITY' || s.legalEntityId != null);
    const retailSales = allSales.filter(s => s.saleType !== 'LEGAL_ENTITY' && s.legalEntityId == null);

    // ── Oddiy savdo ko'rsatkichlari ───────────────────────────────
    const totalRevenue = retailSales.reduce((s, x) => s + x.totalAmount, 0);

    const totalCash = retailSales.reduce((s, x) => {
      if (x.paymentType === 'CASH')  return s + (x.cashAmount ?? x.totalAmount);
      if (x.paymentType === 'MIXED') return s + (x.cashAmount ?? 0);
      return s;
    }, 0);

    const totalCard = retailSales.reduce((s, x) => {
      if (x.paymentType === 'CARD')  return s + (x.cardAmount ?? x.totalAmount);
      if (x.paymentType === 'MIXED') return s + (x.cardAmount ?? 0);
      return s;
    }, 0);

    // ── Sof foyda (faqat retail) ──────────────────────────────────
    let totalCost = 0;
    for (const sale of retailSales) {
      for (const item of sale.saleItems) {
        if (item.product?.purchasePrice) {
          totalCost += item.product.purchasePrice * item.quantity;
        }
      }
    }
    const netProfit = totalRevenue - totalCost;

    // ── O'tgan davr bilan solishtirish (faqat retail) ─────────────
    const prevRetailSales = previousSales.filter(s => s.saleType !== 'LEGAL_ENTITY' && s.legalEntityId == null);
    const prevRevenue     = prevRetailSales.reduce((s, x) => s + x.totalAmount, 0);
    const revenueChange   = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;

    // ── Y/Sh ko'rsatkichlari ──────────────────────────────────────
    const leRevenue = leSales.reduce((s, x) => s + x.totalAmount, 0);
    const leCount   = leSales.length;

    // ── Eng ko'p sotilgan mahsulotlar (barcha savdolardan) ────────
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

    // ── Savdo dinamikasi (faqat retail) ──────────────────────────
    const dailySales: { date: string; revenue: number }[] = [];
    const cur = new Date(start);
    while (cur <= end) {
      const ds = new Date(cur); ds.setHours(0, 0, 0, 0);
      const de = new Date(cur); de.setHours(23, 59, 59, 999);
      const rev = retailSales
        .filter(s => s.createdAt >= ds && s.createdAt <= de)
        .reduce((s, x) => s + x.totalAmount, 0);
      dailySales.push({ date: cur.toISOString().split('T')[0], revenue: rev });
      cur.setDate(cur.getDate() + 1);
    }

    return NextResponse.json({
      stats: {
        // Oddiy savdo (retail) ko'rsatkichlari
        totalRevenue,
        totalCash,
        totalCard,
        netProfit,
        revenueChange,
        salesCount:   retailSales.length,
        // Y/Sh alohida
        legalEntityRevenue: leRevenue,
        legalEntityCount:   leCount,
        // Retail vs Y/Sh
        retailRevenue: totalRevenue,
        retailCount:   retailSales.length,
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
