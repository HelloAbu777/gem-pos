import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Barcha ombor mahsulotlari
export async function GET() {
  try {
    const items = await prisma.warehouseItem.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(items);
  } catch (error) {
    console.error('Warehouse GET error:', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

// POST - Yangi ombor mahsuloti qo'shish
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    if (!data.name?.trim()) {
      return NextResponse.json({ error: 'Nom kiritilmagan' }, { status: 400 });
    }

    if (data.barcode?.trim()) {
      const exists = await prisma.warehouseItem.findUnique({
        where: { barcode: data.barcode.trim() },
      });
      if (exists) {
        return NextResponse.json({ error: 'Bu shtrix kod allaqachon mavjud' }, { status: 400 });
      }
    }

    const item = await prisma.warehouseItem.create({
      data: {
        name:          data.name.trim(),
        barcode:       data.barcode?.trim() || null,
        unit:          data.unit || 'dona',
        quantity:      Number(data.quantity) || 0,
        purchasePrice: Number(data.purchasePrice) || 0,
        description:   data.description?.trim() || null,
        categoryId:    data.categoryId || null,
        supplierId:    data.supplierId || null,
        branchId:      'default-branch',
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('Warehouse POST error:', error);
    const msg = error instanceof Error ? error.message : 'Server xatosi';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
