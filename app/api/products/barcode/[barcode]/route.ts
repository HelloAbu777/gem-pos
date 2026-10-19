import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth/session';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ barcode: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Avtorizatsiya talab qilinadi' }, { status: 401 });
    }

    const params  = await context.params;
    const barcode = params.barcode;

    if (!barcode || barcode.trim() === '') {
      return NextResponse.json({ error: 'Shtrix kod kiritilmagan' }, { status: 400 });
    }

    // branchId null bo'lsa (SUPER_ADMIN) — barcha filiallardan qidirish
    const branchFilter = session.branchId ? { branchId: session.branchId } : {};

    const product = await prisma.product.findFirst({
      where: {
        barcode: barcode.trim(),
        ...branchFilter,
      },
      include: {
        category: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Mahsulot topilmadi yoki bu filialda mavjud emas', barcode },
        { status: 404 }
      );
    }

    if (product.quantity <= 0) {
      return NextResponse.json(
        { error: 'Mahsulot zaxirada yo\'q', product: { ...product, quantity: 0 } },
        { status: 400 }
      );
    }

    return NextResponse.json({
      id:            product.id,
      name:          product.name,
      barcode:       product.barcode,
      salePrice:     product.salePrice,
      purchasePrice: product.purchasePrice,
      quantity:      product.quantity,
      minQuantity:   product.minQuantity,
      unit:          product.unit,
      category:      product.category,
      supplier:      product.supplier,
      expiryDate:    product.expiryDate,
    });

  } catch (error) {
    console.error('Barcode qidirishda xatolik:', error);
    return NextResponse.json(
      { error: 'Server xatosi', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
