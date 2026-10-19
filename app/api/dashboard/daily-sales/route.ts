import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth/session';

// GET /api/dashboard/daily-sales?year=2026&month=10
// Berilgan oy uchun har kunlik sotuv statistikasi + kun detallari
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const { searchParams } = request.nextUrl;

    const now   = new Date();
    const year  = parseInt(searchParams.get('year')  ?? String(now.getFullYear()));
    const month = parseInt(searchParams.get('month') ?? String(now.getMonth() + 1));

    // Oy boshlanish va tugash sanalari
    const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const end   = new Date(year, month, 0, 23, 59, 59, 999); // oxirgi kun

    const branchId = session?.branchId ?? null;
    const where = {
      createdAt: { gte: start, lte: end },
      ...(branchId ? { branchId } : {}),
    };

    // O'sha oydagi barcha sotuvlar (batafsil)
    const sales = await prisma.sale.findMany({
      where,
      select: {
        id:           true,
        totalAmount:  true,
        paymentType:  true,
        cashAmount:   true,
        cardAmount:   true,
        saleType:     true,
        createdAt:    true,
        cashier:      { select: { id: true, name: true } },
        legalEntity:  { select: { id: true, name: true, phone: true } },
        saleItems: {
          select: {
            id:          true,
            itemName:    true,
            quantity:    true,
            priceAtSale: true,
            product:     { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Har kun uchun agregatsiya
    const daysInMonth = end.getDate();
    const dailyMap: Record<number, {
      date:       string;
      day:        number;
      total:      number;
      cash:       number;
      card:       number;
      salesCount: number;
      retail:     number;
      legalEntity: number;
      sales:      typeof sales;
    }> = {};

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      dailyMap[d] = {
        date: dateStr, day: d,
        total: 0, cash: 0, card: 0,
        salesCount: 0, retail: 0, legalEntity: 0,
        sales: [],
      };
    }

    for (const sale of sales) {
      const d = sale.createdAt.getDate();
      const entry = dailyMap[d];
      if (!entry) continue;

      entry.total      += sale.totalAmount;
      entry.salesCount += 1;
      entry.sales.push(sale);

      if (sale.paymentType === 'CASH')  entry.cash += sale.cashAmount ?? sale.totalAmount;
      if (sale.paymentType === 'CARD')  entry.card += sale.cardAmount ?? sale.totalAmount;
      if (sale.paymentType === 'MIXED') {
        entry.cash += sale.cashAmount ?? 0;
        entry.card += sale.cardAmount ?? 0;
      }

      if (sale.saleType === 'LEGAL_ENTITY' || sale.legalEntity) {
        entry.legalEntity += sale.totalAmount;
      } else {
        entry.retail += sale.totalAmount;
      }
    }

    const days = Object.values(dailyMap);

    // Oy umumiy statistikasi
    const monthTotal      = days.reduce((s, d) => s + d.total, 0);
    const monthCash       = days.reduce((s, d) => s + d.cash, 0);
    const monthCard       = days.reduce((s, d) => s + d.card, 0);
    const monthSalesCount = days.reduce((s, d) => s + d.salesCount, 0);
    const monthRetail     = days.reduce((s, d) => s + d.retail, 0);
    const monthLegal      = days.reduce((s, d) => s + d.legalEntity, 0);
    const activeDays      = days.filter(d => d.salesCount > 0).length;

    return NextResponse.json({
      year, month,
      daysInMonth,
      summary: {
        total:      monthTotal,
        cash:       monthCash,
        card:       monthCard,
        salesCount: monthSalesCount,
        retail:     monthRetail,
        legalEntity: monthLegal,
        activeDays,
        avgPerDay: activeDays > 0 ? monthTotal / activeDays : 0,
      },
      days,
    });

  } catch (error) {
    console.error('Daily sales error:', error);
    const msg = error instanceof Error ? error.message : 'Server xatosi';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
