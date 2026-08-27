import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Start and end dates are required' }, { status: 400 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Oxirgi kunning tugashiga qadar

    // Tanlangan davr uchun sotuvlar
    const sales = await prisma.sale.findMany({
      where: {
        branchId: session.branchId,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        saleItems: {
          include: {
            product: true,
          },
        },
      },
    });

    // Oldingi davr uchun sotuvlar (taqqoslash uchun)
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const previousStart = new Date(start);
    previousStart.setDate(previousStart.getDate() - daysDiff);
    const previousEnd = new Date(end);
    previousEnd.setDate(previousEnd.getDate() - daysDiff);

    const previousSales = await prisma.sale.findMany({
      where: {
        branchId: session.branchId,
        createdAt: {
          gte: previousStart,
          lte: previousEnd,
        },
      },
    });

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

    // Sof foyda hisoblash
    let totalCost = 0;
    sales.forEach((sale) => {
      sale.saleItems.forEach((item) => {
        totalCost += item.product.purchasePrice * item.quantity;
      });
    });
    const netProfit = totalRevenue - totalCost;

    // Oldingi davr bilan taqqoslash
    const previousRevenue = previousSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const revenueChange = previousRevenue > 0 
      ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 
      : 0;

    // Eng ko'p sotilgan mahsulotlar
    const productSales: { [key: string]: { name: string; quantity: number; revenue: number } } = {};
    
    sales.forEach((sale) => {
      sale.saleItems.forEach((item) => {
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
      },
      topProducts,
      dailySales,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
