import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth/session';

const SHIFT_HOUR = 8; // Smena boshlanish soati

// GET /api/dashboard/daily-sales?year=2026&month=10
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const { searchParams } = request.nextUrl;

    const now   = new Date();
    const year  = parseInt(searchParams.get('year')  ?? String(now.getFullYear()));
    const month = parseInt(searchParams.get('month') ?? String(now.getMonth() + 1));

    const branchId = session?.branchId ?? null;

    // Smena logikasi: har kun 08:00 dan keyingi kun 07:59 gacha
    // Oy birinchi kuni: 1-kuni 08:00 → oxirgi kuni+1 07:59
    const start = new Date(year, month - 1, 1, SHIFT_HOUR, 0, 0, 0);
    const end   = new Date(year, month,     0, SHIFT_HOUR - 1, 59, 59, 999);
    // end: keyingi oy 0-kuni = bu oyning oxirgi kuni + 08:00 gacha
    // Ya'ni: oxirgi kuni 23:59 + ertangi kuni 07:59
    // To'g'risi: keyingi oy 1-kuni 07:59
    const endFixed = new Date(year, month, 1, SHIFT_HOUR - 1, 59, 59, 999);

    // Raw SQL — Prisma enum type crash dan himoya
    const salesRaw = branchId
      ? await prisma.$queryRaw<{
          id: string; totalAmount: number;
          paymentType: string; cashAmount: number | null; cardAmount: number | null;
          saleType: string; legalEntityId: string | null; createdAt: Date;
          cashierName: string | null; legalEntityName: string | null; legalEntityPhone: string | null;
        }[]>`
          SELECT s.id, s."totalAmount",
                 s."paymentType"::TEXT AS "paymentType",
                 s."cashAmount", s."cardAmount",
                 s."saleType"::TEXT AS "saleType",
                 s."legalEntityId", s."createdAt",
                 u.name AS "cashierName",
                 le.name AS "legalEntityName", le.phone AS "legalEntityPhone"
          FROM "sales" s
          LEFT JOIN "users" u ON u.id = s."cashierId"
          LEFT JOIN "legal_entities" le ON le.id = s."legalEntityId"
          WHERE s."branchId" = ${branchId}
            AND s."createdAt" >= ${start}
            AND s."createdAt" <= ${endFixed}
          ORDER BY s."createdAt" ASC
        `
      : await prisma.$queryRaw<{
          id: string; totalAmount: number;
          paymentType: string; cashAmount: number | null; cardAmount: number | null;
          saleType: string; legalEntityId: string | null; createdAt: Date;
          cashierName: string | null; legalEntityName: string | null; legalEntityPhone: string | null;
        }[]>`
          SELECT s.id, s."totalAmount",
                 s."paymentType"::TEXT AS "paymentType",
                 s."cashAmount", s."cardAmount",
                 s."saleType"::TEXT AS "saleType",
                 s."legalEntityId", s."createdAt",
                 u.name AS "cashierName",
                 le.name AS "legalEntityName", le.phone AS "legalEntityPhone"
          FROM "sales" s
          LEFT JOIN "users" u ON u.id = s."cashierId"
          LEFT JOIN "legal_entities" le ON le.id = s."legalEntityId"
          WHERE s."createdAt" >= ${start}
            AND s."createdAt" <= ${endFixed}
          ORDER BY s."createdAt" ASC
        `;

    // SaleItems alohida so'rov
    const saleIds = salesRaw.map(s => s.id);
    const saleItemsRaw = saleIds.length > 0
      ? await prisma.$queryRaw<{
          saleId: string; id: string; itemName: string;
          quantity: number; priceAtSale: number; productName: string | null;
        }[]>`
          SELECT si."saleId", si.id, si."itemName",
                 si.quantity, si."priceAtSale",
                 p.name AS "productName"
          FROM "sale_items" si
          LEFT JOIN "products" p ON p.id = si."productId"
          WHERE si."saleId" = ANY(${saleIds}::TEXT[])
        `
      : [];

    // Kunlar bo'yicha agregatsiya
    // Smena logikasi: soat 00:00–07:59 → bu kunni OLDINGI kunga qo'shamiz
    // Smena logikasi: soat 08:00–23:59 → bu kunning o'ziga qo'shamiz
    const daysInMonth = new Date(year, month, 0).getDate();

    type DayEntry = {
      date: string; day: number;
      total: number; cash: number; card: number;
      salesCount: number; retail: number; legalEntity: number;
      sales: {
        id: string; totalAmount: number; paymentType: string;
        cashAmount: number | null; cardAmount: number | null;
        saleType: string; createdAt: string;
        cashier: { id: string; name: string };
        legalEntity: { id: string; name: string; phone: string } | null;
        saleItems: { id: string; itemName: string; quantity: number; priceAtSale: number; product: { name: string } | null }[];
      }[];
    };

    const dailyMap: Record<number, DayEntry> = {};
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      dailyMap[d] = {
        date: dateStr, day: d,
        total: 0, cash: 0, card: 0,
        salesCount: 0, retail: 0, legalEntity: 0,
        sales: [],
      };
    }

    for (const sale of salesRaw) {
      const createdAt = new Date(sale.createdAt);
      const hour = createdAt.getHours();

      // Smena: 00:00–07:59 → bu sotuvni oldingi kunga qo'shamiz
      let day = createdAt.getDate();
      if (hour < SHIFT_HOUR) {
        day = day - 1;
        if (day < 1) {
          // Oldingi oyning oxirgi kuni — bu oydagi kun 1 dan oldin
          // Biz faqat bu oy uchun hisoblaymiz, shuning uchun skip
          continue;
        }
      }

      const entry = dailyMap[day];
      if (!entry) continue;

      const total = Number(sale.totalAmount);
      entry.total      += total;
      entry.salesCount += 1;

      // FIX: to'g'ri cash/card hisob (statistika bilan bir xil)
      if (sale.paymentType === 'CASH')  entry.cash += total;
      if (sale.paymentType === 'CARD')  entry.card += total;
      if (sale.paymentType === 'MIXED') {
        entry.cash += Number(sale.cashAmount ?? 0);
        entry.card += Number(sale.cardAmount ?? 0);
      }

      const isLE = sale.saleType === 'LEGAL_ENTITY' || sale.legalEntityId != null;
      if (isLE) entry.legalEntity += total;
      else      entry.retail      += total;

      // Shu sotuv uchun itemlar
      const items = saleItemsRaw
        .filter(i => i.saleId === sale.id)
        .map(i => ({
          id:          i.id,
          itemName:    i.itemName,
          quantity:    Number(i.quantity),
          priceAtSale: Number(i.priceAtSale),
          product:     i.productName ? { name: i.productName } : null,
        }));

      entry.sales.push({
        id:          sale.id,
        totalAmount: total,
        paymentType: sale.paymentType,
        cashAmount:  sale.cashAmount != null ? Number(sale.cashAmount) : null,
        cardAmount:  sale.cardAmount != null ? Number(sale.cardAmount) : null,
        saleType:    sale.saleType,
        createdAt:   sale.createdAt.toISOString(),
        cashier:     { id: '', name: sale.cashierName ?? 'Admin' },
        legalEntity: sale.legalEntityName
          ? { id: sale.legalEntityId ?? '', name: sale.legalEntityName, phone: sale.legalEntityPhone ?? '' }
          : null,
        saleItems: items,
      });
    }

    const days = Object.values(dailyMap);

    const monthTotal      = days.reduce((s, d) => s + d.total,      0);
    const monthCash       = days.reduce((s, d) => s + d.cash,       0);
    const monthCard       = days.reduce((s, d) => s + d.card,       0);
    const monthSalesCount = days.reduce((s, d) => s + d.salesCount, 0);
    const monthRetail     = days.reduce((s, d) => s + d.retail,     0);
    const monthLegal      = days.reduce((s, d) => s + d.legalEntity, 0);
    const activeDays      = days.filter(d => d.salesCount > 0).length;

    return NextResponse.json({
      year, month, daysInMonth,
      summary: {
        total:       monthTotal,
        cash:        monthCash,
        card:        monthCard,
        salesCount:  monthSalesCount,
        retail:      monthRetail,
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
