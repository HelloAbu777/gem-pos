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

    // Session ixtiyoriy — bo'lmasa barcha branchlar
    const session  = await getSession();
    const branchId = session?.branchId;

    const start = new Date(startDate);
    const end   = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const whereBase = {
      createdAt: { gte: start, lte: end },
      ...(branchId ? { branchId } : {}),
    };

    const [sales, previousSales] = await Promise.all([
      prisma.sale.findMany({
        where: whereBase,
        include: {
          saleItems: { include: { product: true } },
        },
      }),
      prisma.sale.findMany({
        where: (() => {
          const daysDiff = Math.ceil((end.getTime() - start.getTime()) / 86400000);
          const ps = new Date(start); ps.setDate(ps.getDate() - daysDiff);
          const pe = new Date(end);   pe.setDate(pe.getDate() - daysDiff);
          return { createdAt: { gte: ps, lte: pe }, ...(branchId ? { branchId } : {}) };
        })(),
      }),
    ]);

    // Hisob-kitoblar
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const cashRevenue = sales
      .filter((s) => s.paymentType === 'CASH')
      .reduce((sum, sale) => sum + (sale.cashAmount || sale.totalAmount), 0);
    
    const cardRevenue = sales
      .filter((s) => s.paymentType === 'CARD')
      .reduce((sum, sale) => sum + (sale.cardAmount || sale.totalAmount), 0);

    const mixedCash = sales
      .filter((s) => s.paymentType === 'MIXED')
      .reduce((sum, sale) => sum + (sale.cashAmount || 0), 0);
    
    const mixedCard = sales
      .filter((s) => s.paymentType === 'MIXED')
      .reduce((sum, sale) => sum + (sale.cardAmount || 0), 0);

    const totalCash = cashRevenue + mixedCash;
    const totalCard = cardRevenue + mixedCard;

    // Sof foyda hisoblash (faqat mahsulotlar, taomlar uchun purchasePrice 0)
    let totalCost = 0;
    sales.forEach((sale) => {
      sale.saleItems.forEach((item) => {
        if (item.product) {
          totalCost += item.product.purchasePrice * item.quantity;
        }
      });
    });
    const netProfit = totalRevenue - totalCost;

    // Oldingi davr bilan taqqoslash
    const previousRevenue = previousSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const revenueChange = previousRevenue > 0 
      ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 
      : 0;

    // Y/Sh (Yuridik shaxs) statistika
    const leSales   = sales.filter(s => s.saleType === 'LEGAL_ENTITY');
    const leRevenue = leSales.reduce((sum, s) => sum + s.totalAmount, 0);
    const leCount   = leSales.length;

    // Eng ko'p sotilgan mahsulotlar (faqat productId bo'lganlar)
    const productSales: { [key: string]: { name: string; quantity: number; revenue: number } } = {};
    
    sales.forEach((sale) => {
      sale.saleItems.forEach((item) => {
        if (!item.productId || !item.product) return;
        if (!productSales[item.productId]) {
          productSales[item.productId] = {
            name: item.product.name,
            quantity: 0,
            revenue: 0,
          };
        }
        productSales[item.productId].quantity += item.quantity;
        productSales[item.productId].revenue += item.priceAtSale * item.quantity;
      });
    });

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Kunlik sotuvlar (grafik uchun)
    const dailySales: { date: string; revenue: number }[] = [];
    const currentDate = new Date(start);
    
    while (currentDate <= end) {
      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      const daySales = sales.filter(
        (sale) => sale.createdAt >= dayStart && sale.createdAt <= dayEnd
      );
      
      const dayRevenue = daySales.reduce((sum, sale) => sum + sale.totalAmount, 0);
      
      dailySales.push({
        date: currentDate.toISOString().split('T')[0],
        revenue: dayRevenue,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return NextResponse.json({
      stats: {
        totalRevenue,
        totalCash,
        totalCard,
        netProfit,
        revenueChange,
        salesCount: sales.length,
        // Y/Sh statistika
        legalEntityRevenue: leRevenue,
        legalEntityCount:   leCount,
        retailRevenue:      totalRevenue - leRevenue,
        retailCount:        sales.length - leCount,
      },
      topProducts,
      dailySales,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
