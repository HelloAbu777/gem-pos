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

    // Agar productId kelsa — mahsulotdan omborga ko'chirish
    if (data.productId) {
      return await transferProductToWarehouse(data);
    }

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

    // expiryDate validatsiya
    let expiryDate: Date | null = null;
    if (data.expiryDate) {
      const d = new Date(data.expiryDate);
      if (!isNaN(d.getTime()) && d.getFullYear() >= 1900 && d.getFullYear() <= 2100) {
        expiryDate = d;
      }
    }

    const item = await prisma.warehouseItem.create({
      data: {
        name:          data.name.trim(),
        barcode:       data.barcode?.trim() || null,
        unit:          data.unit          || 'dona',
        quantity:      Number(data.quantity)    || 0,
        minQuantity:   Number(data.minQuantity) || 10,
        purchasePrice: Number(data.purchasePrice) || 0,
        salePrice:     Number(data.salePrice)     || 0,
        vatType:       data.vatType    || 'NO_VAT',
        expiryDate,
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

// Mahsulotdan omborga ko'chirish
async function transferProductToWarehouse(data: {
  productId: string;
  quantity: number;
  description?: string;
}) {
  const { productId, quantity, description } = data;

  if (!quantity || quantity <= 0) {
    return NextResponse.json({ error: "Miqdor 0 dan katta bo'lishi kerak" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { category: true, supplier: true },
  });

  if (!product) {
    return NextResponse.json({ error: 'Mahsulot topilmadi' }, { status: 404 });
  }

  if (product.quantity < quantity) {
    return NextResponse.json({
      error: `Yetarli zaxira yo'q. Mavjud: ${product.quantity} ${product.unit}`,
    }, { status: 400 });
  }

  // Barcode conflict tekshiruvi
  let barcodeToUse = product.barcode || null;
  if (barcodeToUse) {
    const existsInWarehouse = await prisma.warehouseItem.findUnique({
      where: { barcode: barcodeToUse },
    });
    if (existsInWarehouse) barcodeToUse = null;
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedProduct = await tx.product.update({
      where: { id: productId },
      data:  { quantity: { decrement: quantity } },
    });

    const warehouseItem = await tx.warehouseItem.create({
      data: {
        name:          product.name,
        barcode:       barcodeToUse,
        unit:          product.unit,
        quantity:      quantity,
        minQuantity:   product.minQuantity,
        purchasePrice: product.purchasePrice,
        salePrice:     product.salePrice,
        vatType:       product.vatType,
        expiryDate:    product.expiryDate,
        description:   description?.trim() || `Mahsulotdan ko'chirildi (${new Date().toLocaleDateString('uz-UZ')})`,
        categoryId:    product.categoryId,
        supplierId:    product.supplierId,
        branchId:      'default-branch',
      },
    });

    return { updatedProduct, warehouseItem };
  });

  return NextResponse.json({
    success: true,
    warehouseItem: result.warehouseItem,
    remainingQuantity: result.updatedProduct.quantity,
  }, { status: 201 });
}
