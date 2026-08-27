import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth/session';

// GET - Barcha mahsulotlar (Real Database)
export async function GET() {
  try {
    // Session tekshiruvi
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Avtorizatsiya talab qilinadi' },
        { status: 401 }
      );
    }

    // Faqat o'z filialining mahsulotlarini olish
    const products = await prisma.product.findMany({
      where: {
        branchId: session.branchId,
      },
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

// POST - Yangi mahsulot yaratish (Real Database)
export async function POST(request: NextRequest) {
  try {
    // Session tekshiruvi
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Avtorizatsiya talab qilinadi' },
        { status: 401 }
      );
    }

    // Faqat ADMIN mahsulot qo'sha oladi
    if (session.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Ruxsat yo\'q. Faqat admin mahsulot qo\'sha oladi' },
        { status: 403 }
      );
    }

    const data = await request.json();

    // Validatsiya
    if (!data.name || !data.categoryId || !data.supplierId) {
      return NextResponse.json(
        { error: 'Majburiy maydonlar: name, categoryId, supplierId' },
        { status: 400 }
      );
    }

    if (!data.salePrice || !data.purchasePrice) {
      return NextResponse.json(
        { error: 'Narxlar kiritilishi shart' },
        { status: 400 }
      );
    }

    // Barcode unique tekshiruvi (agar kiritilgan bo'lsa)
    if (data.barcode) {
      const existingProduct = await prisma.product.findUnique({
        where: { barcode: data.barcode },
      });

      if (existingProduct) {
        return NextResponse.json(
          { error: 'Ushbu shtrix kod allaqachon mavjud' },
          { status: 400 }
        );
      }
    }

    // Marja hisoblash
    const margin = data.salePrice - data.purchasePrice;

    // Yangi mahsulot yaratish
    const newProduct = await prisma.product.create({
      data: {
        name: data.name,
        barcode: data.barcode || null,
        unit: data.unit || 'dona',
        quantity: data.quantity || 0,
        minQuantity: data.minQuantity || 10,
        purchasePrice: data.purchasePrice,
        salePrice: data.salePrice,
        margin,
        vatType: data.vatType || 'NO_VAT',
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        categoryId: data.categoryId,
        supplierId: data.supplierId,
        branchId: session.branchId, // O'z filialiga bog'lash
      },
      include: {
        category: true,
        supplier: true,
      },
    });

    return NextResponse.json(newProduct, { status: 201 });
  } catch (error) {
    console.error('Mahsulot yaratishda xatolik:', error);
    return NextResponse.json(
      { error: 'Server xatosi' },
      { status: 500 }
    );
  }
}
