import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // ── 1. Barcha mahsulotlar (to'liq ma'lumot bilan) ──────────────
    const allProducts = await prisma.product.findMany({
      select: {
        id:            true,
        name:          true,
        quantity:      true,
        minQuantity:   true,
        unit:          true,
        purchasePrice: true,
        salePrice:     true,
        expiryDate:    true,
        category: { select: { id: true, name: true } },
      },
    });

    // ── 2. Umumiy ko'rsatkichlar ───────────────────────────────────
    const totalSkus        = allProducts.length;                        // turlar soni
    const totalUnits       = allProducts.reduce((s, p) => s + p.quantity, 0); // jami dona
    const totalCostValue   = allProducts.reduce((s, p) => s + p.purchasePrice * p.quantity, 0); // sotib olish summasi
    const totalSaleValue   = allProducts.reduce((s, p) => s + p.salePrice * p.quantity, 0);     // sotish summasi
    const totalPotentialProfit = totalSaleValue - totalCostValue;

    // ── 3. Kategoriya bo'yicha tahlil ─────────────────────────────
    const catMap: Record<string, { name: string; skus: number; units: number; costValue: number; saleValue: number }> = {};
    for (const p of allProducts) {
      const cid = p.category.id;
      if (!catMap[cid]) catMap[cid] = { name: p.category.name, skus: 0, units: 0, costValue: 0, saleValue: 0 };
      catMap[cid].skus      += 1;
      catMap[cid].units     += p.quantity;
      catMap[cid].costValue += p.purchasePrice * p.quantity;
      catMap[cid].saleValue += p.salePrice * p.quantity;
    }
    const byCategory = Object.values(catMap).sort((a, b) => b.saleValue - a.saleValue);

    // ── 4. Eng ko'p sotilgan mahsulotlar (so'nggi 30 kun) ─────────
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentSaleItems = await prisma.saleItem.findMany({
      where: {
        sale: { createdAt: { gte: thirtyDaysAgo } },
        productId: { not: null },
      },
      select: {
        productId:   true,
        itemName:    true,
        quantity:    true,
        priceAtSale: true,
      },
    });

    const soldMap: Record<string, { name: string; qty: number; revenue: number }> = {};
    for (const item of recentSaleItems) {
      const key = item.productId ?? item.itemName;
      if (!soldMap[key]) soldMap[key] = { name: item.itemName, qty: 0, revenue: 0 };
      soldMap[key].qty     += item.quantity;
      soldMap[key].revenue += item.priceAtSale * item.quantity;
    }
    const topSelling = Object.values(soldMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);

    // ── 5. Kam qolgan mahsulotlar ──────────────────────────────────
    const lowStock = allProducts
      .filter(p => p.quantity <= p.minQuantity)
      .map(p => ({ id: p.id, name: p.name, quantity: p.quantity, minQuantity: p.minQuantity, unit: p.unit }))
      .sort((a, b) => a.quantity - b.quantity);

    // ── 6. Muddati yaqin / o'tgan mahsulotlar ─────────────────────
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const expiringSoon = allProducts
      .filter(p => p.expiryDate && new Date(p.expiryDate) <= sevenDaysFromNow)
      .map(p => {
        const daysLeft = p.expiryDate
          ? Math.ceil((new Date(p.expiryDate).getTime() - Date.now()) / 86400000)
          : 0;
        return { id: p.id, name: p.name, expiryDate: p.expiryDate, quantity: p.quantity, unit: p.unit, daysLeft };
      })
      .sort((a, b) => (a.daysLeft) - (b.daysLeft));

    return NextResponse.json({
      summary: { totalSkus, totalUnits, totalCostValue, totalSaleValue, totalPotentialProfit },
      byCategory,
      topSelling,
      lowStock,
      expiringSoon,
    });
  } catch (error) {
    console.error('Report fetch error:', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
