import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth/session';

const DEFAULT_BRANCH_ID = 'default-branch';

export async function GET() {
  try {
    const session  = await getSession();
    const branchId = session?.branchId ?? DEFAULT_BRANCH_ID;

    // Faqat o'z filialining mahsulotlari
    const allProducts = await prisma.$queryRaw<{
      id: string; name: string; quantity: number; minQuantity: number;
      unit: string; purchasePrice: number; salePrice: number;
      expiryDate: Date | null; categoryId: string; categoryName: string;
    }[]>`
      SELECT p.id, p.name, p.quantity, p."minQuantity", p.unit,
             p."purchasePrice", p."salePrice", p."expiryDate",
             p."categoryId", c.name AS "categoryName"
      FROM "products" p
      LEFT JOIN "categories" c ON c.id = p."categoryId"
      WHERE p."branchId" = ${branchId}
    `;

    const totalSkus             = allProducts.length;
    const totalUnits            = allProducts.reduce((s, p) => s + Number(p.quantity), 0);
    const totalCostValue        = allProducts.reduce((s, p) => s + Number(p.purchasePrice) * Number(p.quantity), 0);
    const totalSaleValue        = allProducts.reduce((s, p) => s + Number(p.salePrice) * Number(p.quantity), 0);
    const totalPotentialProfit  = totalSaleValue - totalCostValue;

    // Kategoriya bo'yicha
    const catMap: Record<string, { name: string; skus: number; units: number; costValue: number; saleValue: number }> = {};
    for (const p of allProducts) {
      const cid = p.categoryId;
      if (!catMap[cid]) catMap[cid] = { name: p.categoryName, skus: 0, units: 0, costValue: 0, saleValue: 0 };
      catMap[cid].skus      += 1;
      catMap[cid].units     += Number(p.quantity);
      catMap[cid].costValue += Number(p.purchasePrice) * Number(p.quantity);
      catMap[cid].saleValue += Number(p.salePrice) * Number(p.quantity);
    }
    const byCategory = Object.values(catMap).sort((a, b) => b.saleValue - a.saleValue);

    // Top sotilgan (30 kun, faqat shu filial)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentSaleItems = await prisma.$queryRaw<{
      productId: string | null; itemName: string; quantity: number; priceAtSale: number;
    }[]>`
      SELECT si."productId", si."itemName", si.quantity, si."priceAtSale"
      FROM "sale_items" si
      JOIN "sales" s ON s.id = si."saleId"
      WHERE s."branchId" = ${branchId}
        AND s."createdAt" >= ${thirtyDaysAgo}
        AND si."productId" IS NOT NULL
    `;

    const soldMap: Record<string, { name: string; qty: number; revenue: number }> = {};
    for (const item of recentSaleItems) {
      const key = item.productId ?? item.itemName;
      if (!soldMap[key]) soldMap[key] = { name: item.itemName, qty: 0, revenue: 0 };
      soldMap[key].qty     += Number(item.quantity);
      soldMap[key].revenue += Number(item.priceAtSale) * Number(item.quantity);
    }
    const topSelling = Object.values(soldMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);

    // Kam qolgan
    const lowStock = allProducts
      .filter(p => Number(p.quantity) <= Number(p.minQuantity))
      .map(p => ({ id: p.id, name: p.name, quantity: Number(p.quantity), minQuantity: Number(p.minQuantity), unit: p.unit }))
      .sort((a, b) => a.quantity - b.quantity);

    // Muddati yaqin
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const expiringSoon = allProducts
      .filter(p => p.expiryDate && new Date(p.expiryDate) <= sevenDaysFromNow)
      .map(p => {
        const daysLeft = p.expiryDate
          ? Math.ceil((new Date(p.expiryDate).getTime() - Date.now()) / 86400000)
          : 0;
        return { id: p.id, name: p.name, expiryDate: p.expiryDate, quantity: Number(p.quantity), unit: p.unit, daysLeft };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft);

    return NextResponse.json({
      summary: { totalSkus, totalUnits, totalCostValue, totalSaleValue, totalPotentialProfit },
      byCategory,
      topSelling,
      lowStock,
      expiringSoon,
    });
  } catch (error) {
    console.error('Report fetch error:', error);
    const msg = error instanceof Error ? error.message : 'Server xatosi';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
