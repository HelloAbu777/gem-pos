import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST - Ombordan Mahsulotlarga o'tkazish
export async function POST(request: NextRequest) {
  try {
    const { id, categoryId, supplierId, salePrice, vatType, minQuantity } = await request.json();

    if (!id) return NextResponse.json({ error: 'ID kerak' }, { status: 400 });
    if (!categoryId) return NextResponse.json({ error: 'Kategoriya tanlanmagan' }, { status: 400 });
    if (!supplierId) return NextResponse.json({ error: "Ta'minotchi tanlanmagan" }, { status: 400 });
    if (!salePrice) return NextResponse.json({ error: 'Sotish narxi kiritilmagan' }, { status: 400 });

    const warehouseItem = await prisma.warehouseItem.findUnique({ where: { id } });
    if (!warehouseItem) return NextResponse.json({ error: 'Ombor mahsuloti topilmadi' }, { status: 404 });
    if (warehouseItem.isTransferred) return NextResponse.json({ error: 'Bu mahsulot allaqachon o\'tkazilgan' }, { status: 400 });

    // Branch mavjudligini ta'minlash
    await prisma.branch.upsert({
      where:  { id: 'default-branch' },
      update: {},
      create: { id: 'default-branch', name: 'Asosiy filial' },
    });

    const margin = Number(salePrice) - warehouseItem.purchasePrice;

    // Mahsulot yaratish
    const product = await prisma.product.create({
      data: {
        name:          warehouseItem.name,
        barcode:       warehouseItem.barcode || null,
        unit:          warehouseItem.unit,
        quantity:      warehouseItem.quantity,
        minQuantity:   Number(minQuantity) || 10,
        purchasePrice: warehouseItem.purchasePrice,
        salePrice:     Number(salePrice),
        margin,
        vatType:       vatType || 'NO_VAT',
        categoryId,
        supplierId,
        branchId:      'default-branch',
      },
      include: { category: true, supplier: true },
    });

    // Ombor mahsulotini transferred deb belgilash
    await prisma.warehouseItem.update({
      where: { id },
      data:  { isTransferred: true, transferredAt: new Date() },
    });

    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error('Warehouse transfer error:', error);
    const msg = error instanceof Error ? error.message : 'Server xatosi';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
