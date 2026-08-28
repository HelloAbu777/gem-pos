import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth/session';

// GET - Barcode orqali mahsulot qidirish (Real Database)
export async function GET(
  request: NextRequest,
  { params }: { params: { barcode: string } }
) {
  try {
    // Session tekshiruvi
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Avtorizatsiya talab qilinadi' },
        { status: 401 }
      );
    }

    const barcode = params.barcode;

    console.log('🔍 Barcode qidiruv boshlandi:', barcode); // DEBUG
    console.log('👤 Session branchId:', session.branchId); // DEBUG

    if (!barcode || barcode.trim() === '') {
      return NextResponse.json(
        { error: 'Shtrix kod kiritilmagan' },
        { status: 400 }
      );
    }

    // Database dan qidirish - BARCHA KATEGORIYALARDAN
    const product = await prisma.product.findFirst({
      where: { 
        barcode: barcode.trim(),
        branchId: session.branchId, // Faqat o'z filialining mahsulotlari
        // Hech qanday category filter yo'q - BARCHA kategoriyalar qidiriladi
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
          },
        },
      },
    });

    console.log('📦 Database natija:', product ? `Topildi: ${product.name}` : 'Topilmadi'); // DEBUG
    if (product) {
      console.log('📊 Mahsulot tafsiloti:', {
        id: product.id,
        name: product.name,
        barcode: product.barcode,
        category: product.category.name,
        quantity: product.quantity,
        salePrice: product.salePrice
      }); // DEBUG
    }

    if (!product) {
      return NextResponse.json(
        { error: 'Mahsulot topilmadi yoki bu filialda mavjud emas', barcode },
        { status: 404 }
      );
    }

    // Zaxira tekshiruvi
    if (product.quantity <= 0) {
      return NextResponse.json(
        { 
          error: 'Mahsulot zaxirada yo\'q',
          product: {
            ...product,
            quantity: 0,
          },
        },
        { status: 400 }
      );
    }

    // Success - mahsulot topildi va zaxirada bor
    return NextResponse.json({
      id: product.id,
      name: product.name,
      barcode: product.barcode,
      salePrice: product.salePrice,
      purchasePrice: product.purchasePrice,
      quantity: product.quantity,
      minQuantity: product.minQuantity,
      unit: product.unit,
      category: product.category,
      supplier: product.supplier,
      expiryDate: product.expiryDate,
    });

  } catch (error) {
    console.error('Barcode qidirishda xatolik:', error);
    return NextResponse.json(
      { error: 'Server xatosi', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
