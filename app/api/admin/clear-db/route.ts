import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  if (secret !== 'gem-clear-2026') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // Tartib muhim — foreign key constraint
    await prisma.saleItem.deleteMany({});
    await prisma.sale.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.supplier.deleteMany({});
    await prisma.dish.deleteMany({});
    await prisma.legalEntity.deleteMany({});
    await prisma.branch.deleteMany({});

    return NextResponse.json({
      success: true,
      message: "Barcha ma'lumotlar tozalandi",
      cleared: ['saleItems', 'sales', 'products', 'categories', 'suppliers', 'dishes', 'legalEntities', 'branches'],
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Server xatosi';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
