import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth/session';

// GET - Barcha mahsulotlar (Real Database)
export async function GET() {
  try {
    // Session tekshiruvi - OPTIONAL for POS
    const session = await getSession();
    
    // Agar session bo'lmasa — barcha mahsulotlarni qaytarish (POS uchun)
    const whereClause = session?.branchId
      ? { branchId: session.branchId }
      : {};

    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        supplier: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error('Mahsulotlarni olishda xatolik:', error);
    return NextResponse.json(
      { error: 'Server xatosi' },
      { status: 500 }
    );
  }
}

// POST - Yangi mahsulot yaratish
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const data    = await request.json();

    // branchId: sessiondan yoki default
    const branchId = session?.branchId || 'default-branch';

    // Validatsiya
    if (!data.name?.trim())  return NextResponse.json({ error: 'Nom kiritilmagan' }, { status: 400 });
    if (!data.categoryId)    return NextResponse.json({ error: 'Kategoriya tanlanmagan' }, { status: 400 });
    if (!data.supplierId)    return NextResponse.json({ error: "Ta'minotchi tanlanmagan" }, { status: 400 });
    if (!data.salePrice)     return NextResponse.json({ error: 'Sotish narxi kiritilmagan' }, { status: 400 });
    if (!data.purchasePrice) return NextResponse.json({ error: 'Kelish narxi kiritilmagan' }, { status: 400 });

    // Barcode unique tekshiruvi
    if (data.barcode?.trim()) {
      const existing = await prisma.product.findUnique({ where: { barcode: data.barcode.trim() } });
      if (existing) return NextResponse.json({ error: 'Bu shtrix kod allaqachon mavjud' }, { status: 400 });
    }

    const margin = Number(data.salePrice) - Number(data.purchasePrice);

    const newProduct = await prisma.product.create({
      data: {
        name:          data.name.trim(),
        barcode:       data.barcode?.trim() || null,
        unit:          data.unit          || 'dona',
        quantity:      Number(data.quantity)      || 0,
        minQuantity:   Number(data.minQuantity)   || 10,
        purchasePrice: Number(data.purchasePrice),
        salePrice:     Number(data.salePrice),
        margin,
        vatType:       data.vatType       || 'NO_VAT',
        expiryDate:    data.expiryDate ? new Date(data.expiryDate) : null,
        categoryId:    data.categoryId,
        supplierId:    data.supplierId,
        branchId,
      },
      include: { category: true, supplier: true },
    });

    return NextResponse.json(newProduct, { status: 201 });
  } catch (error) {
    console.error('Mahsulot yaratishda xatolik:', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
