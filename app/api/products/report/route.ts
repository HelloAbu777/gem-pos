import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Get all products, then filter in JavaScript
    const allProducts = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        quantity: true,
        minQuantity: true,
        unit: true,
      },
    });

    // Low stock: quantity <= minQuantity
    const lowStock = allProducts.filter(p => p.quantity <= p.minQuantity);

    // Expiring soon products (within 7 days)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const expiringSoon = await prisma.product.findMany({
      where: {
        expiryDate: {
          not: null,
          lte: sevenDaysFromNow,
        },
      },
      select: {
        id: true,
        name: true,
        expiryDate: true,
        quantity: true,
        unit: true,
      },
      orderBy: { expiryDate: 'asc' },
    });

    // Calculate days left
    const expiringSoonWithDays = expiringSoon.map((item) => {
      const now = new Date();
      const expiry = item.expiryDate ? new Date(item.expiryDate) : now;
      const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return {
        ...item,
        daysLeft,
      };
    });

    return NextResponse.json({
      lowStock,
      expiringSoon: expiringSoonWithDays,
    });
  } catch (error) {
    console.error('Report fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 });
  }
}
