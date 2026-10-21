import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth/session';

const SHIFT_HOUR = 8; // Smena boshlanish soati

function parseShiftRange(startDate: string, endDate: string) {
  // startDate kuni 08:00 dan endDate + 1 kun 07:59 gacha
  // Lekin agar startDate === endDate (bir kun), shift logikasi qo'llanadi
  const start = new Date(startDate);
  start.setHours(SHIFT_HOUR, 0, 0, 0);

  const end = new Date(endDate);
  // Agar bir kunlik so'rov — smena: bugun 08:00 → ertaga 07:59
  end.setDate(end.getDate() + 1);
  end.setHours(SHIFT_HOUR - 1, 59, 59, 999);

  return { start, end };
}

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

    // Smena: 08:00 → ertangi kun 07:59
    const { start, end } = parseShiftRange(startDate, endDate);

    const daysDiff  = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
    const prevStart = new Date(start); prevStart.setDate(prevStart.getDate() - daysDiff);
    const prevEnd   = new Date(end);   prevEnd.setDate(prevEnd.getDate() - daysDiff);

    // Raw SQL — enum type muammosini bypass qiladi
    const allSales = branchId
      ? await prisma.$queryRaw<{
          id: string; totalAmount: number; paymentType: string;
          cashAmount: number | null; cardAmount: number | null;
          saleType: string; legalEntityId: string | null; createdAt: Date;
        }[]>`
          SELECT id, "totalAmount", "paymentType"::TEXT AS "paymentType",
                 "cashAmount", "cardAmount", "saleType"::TEXT AS "saleType",
                 "legalEntityId", "createdAt"
          FROM "sales"
          WHERE "branchId" = ${branchId}
            AND "createdAt" >= ${start} AND "createdAt" <= ${end}
        `
      : await prisma.$queryRaw<{
          id: string; totalAmount: number; paymentType: string;
          cashAmount: number | null; cardAmount: number | null;
          saleType: string; legalEntityId: string | null; createdAt: Date;
        }[]>`
          SELECT id, "totalAmount", "paymentType"::TEXT AS "paymentType",
                 "cashAmount", "cardAmount", "saleType"::TEXT AS "saleType",
                 "legalEntityId", "createdAt"
          FROM "sales"
          WHERE "createdAt" >= ${start} AND "createdAt" <= ${end}
        `;

    // Sale items + product purchase price
    const saleIds = allSales.map(s => s.id);
    const saleItems = saleIds.length > 0
      ? await prisma.$queryRaw<{
          saleId: string; productId: string | null; itemName: string;
          quantity: number; priceAtSale: number; purchasePrice: number | null;
          productName: string | null;
        }[]>`
          SELECT si."saleId", si."productId", si."itemName",
                 si.quantity, si."priceAtSale",
                 p."purchasePrice", p.name AS "productName"
          FROM "sale_items" si
          LEFT JOIN "products" p ON p.id = si."productId"
          WHERE si."saleId" = ANY(${saleIds}::TEXT[])
        `
      : [];

    // Oldingi davr
    const prevSales = branchId
      ? await prisma.$queryRaw<{ totalAmount: number; saleType: string; legalEntityId: string | null }[]>`
          SELECT "totalAmount", "saleType"::TEXT AS "saleType", "legalEntityId"
          FROM "sales"
          WHERE "branchId" = ${branchId}
            AND "createdAt" >= ${prevStart} AND "createdAt" <= ${prevEnd}
        `
      : await prisma.$queryRaw<{ totalAmount: number; saleType: string; legalEntityId: string | null }[]>`
          SELECT "totalAmount", "saleType"::TEXT AS "saleType", "legalEntityId"
          FROM "sales"
          WHERE "createdAt" >= ${prevStart} AND "createdAt" <= ${prevEnd}
        `;

    // Guruhlar
    const retailSales = allSales.filter(s => s.saleType !== 'LEGAL_ENTITY' && !s.legalEntityId);
    const leSales     = allSales.filter(s => s.saleType === 'LEGAL_ENTITY' || s.legalEntityId);

    const totalRevenue = retailSales.reduce((s, x) => s + Number(x.totalAmount), 0);

    // FIX: MIXED to'lovlarda cashAmount/cardAmount null bo'lishi mumkin
    // Agar null bo'lsa totalAmount dan hisoblash o'rniga 0 ishlatamiz
    const totalCash = retailSales.reduce((s, x) => {
      if (x.paymentType === 'CASH')  return s + Number(x.totalAmount);
      if (x.paymentType === 'MIXED') return s + Number(x.cashAmount ?? 0);
      return s;
    }, 0);
    const totalCard = retailSales.reduce((s, x) => {
      if (x.paymentType === 'CARD')  return s + Number(x.totalAmount);
      if (x.paymentType === 'MIXED') return s + Number(x.cardAmount ?? 0);
      return s;
    }, 0);

    // Sof foyda
    let totalCost = 0;
    for (const item of saleItems) {
      const sale = retailSales.find(s => s.id === item.saleId);
      if (!sale) continue;
      if (item.purchasePrice != null) {
        totalCost += Number(item.purchasePrice) * Number(item.quantity);
      }
    }
    const netProfit = totalRevenue - totalCost;

    const prevRetail  = prevSales.filter(s => s.saleType !== 'LEGAL_ENTITY' && !s.legalEntityId);
    const prevRevenue = prevRetail.reduce((s, x) => s + Number(x.totalAmount), 0);
    const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;

    const leRevenue = leSales.reduce((s, x) => s + Number(x.totalAmount), 0);

    // Top mahsulotlar
    const prodMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
    for (const item of saleItems) {
      if (!item.productId) continue;
      const nm = item.productName ?? item.itemName;
      if (!prodMap[item.productId]) prodMap[item.productId] = { name: nm, quantity: 0, revenue: 0 };
      prodMap[item.productId].quantity += Number(item.quantity);
      prodMap[item.productId].revenue  += Number(item.priceAtSale) * Number(item.quantity);
    }
    const topProducts = Object.values(prodMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Kunlik dinamika
    const dailyMap: Record<string, number> = {};
    for (const s of retailSales) {
      const day = new Date(s.createdAt).toISOString().split('T')[0];
      dailyMap[day] = (dailyMap[day] ?? 0) + Number(s.totalAmount);
    }
    const dailySales = Object.entries(dailyMap)
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Ogohlantirishlar
    const lowStockQuery = branchId
      ? await prisma.$queryRaw<{ id: string; name: string; quantity: number; minQuantity: number; unit: string }[]>`
          SELECT id, name, quantity, "minQuantity", unit FROM "products"
          WHERE "branchId" = ${branchId} AND quantity <= "minQuantity" ORDER BY quantity ASC LIMIT 10
        `
      : await prisma.$queryRaw<{ id: string; name: string; quantity: number; minQuantity: number; unit: string }[]>`
          SELECT id, name, quantity, "minQuantity", unit FROM "products"
          WHERE quantity <= "minQuantity" ORDER BY quantity ASC LIMIT 10
        `;

    const now7 = new Date(); now7.setDate(now7.getDate() + 7);
    const expiringSoonQuery = branchId
      ? await prisma.$queryRaw<{ id: string; name: string; expiryDate: Date; quantity: number }[]>`
          SELECT id, name, "expiryDate", quantity FROM "products"
          WHERE "branchId" = ${branchId}
            AND "expiryDate" IS NOT NULL
            AND "expiryDate" <= ${now7}
            AND "expiryDate" >= NOW()
          ORDER BY "expiryDate" ASC LIMIT 10
        `
      : await prisma.$queryRaw<{ id: string; name: string; expiryDate: Date; quantity: number }[]>`
          SELECT id, name, "expiryDate", quantity FROM "products"
          WHERE "expiryDate" IS NOT NULL
            AND "expiryDate" <= ${now7}
            AND "expiryDate" >= NOW()
          ORDER BY "expiryDate" ASC LIMIT 10
        `;

    return NextResponse.json({
      stats: {
        totalRevenue,
        totalCash,
        totalCard,
        netProfit,
        revenueChange,
        salesCount:          retailSales.length,
        legalEntityRevenue:  leRevenue,
        legalEntityCount:    leSales.length,
        retailRevenue:       totalRevenue,
        retailCount:         retailSales.length,
      },
      topProducts,
      dailySales,
      lowStock:      lowStockQuery.map(p => ({ ...p, quantity: Number(p.quantity), minQuantity: Number(p.minQuantity) })),
      expiringSoon:  expiringSoonQuery,
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Server xatosi', details: msg }, { status: 500 });
  }
}
