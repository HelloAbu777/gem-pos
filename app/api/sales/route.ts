import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth/session';

interface SaleItem {
  productId: string;
  quantity: number;
  priceAtSale: number;
}

interface SaleRequest {
  totalAmount: number;
  paymentType: 'CASH' | 'CARD' | 'MIXED';
  cashAmount?: number;
  cardAmount?: number;
  items: SaleItem[];
}

// POST - Yangi sotuv yaratish (Real Database with Transaction)
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

    const data: SaleRequest = await request.json();

    // Validatsiya
    if (!data.totalAmount || data.totalAmount <= 0) {
      return NextResponse.json(
        { error: 'Noto\'g\'ri summa' },
        { status: 400 }
      );
    }

    if (!data.items || data.items.length === 0) {
      return NextResponse.json(
        { error: 'Mahsulotlar ro\'yxati bo\'sh' },
        { status: 400 }
      );
    }

    // To'lov validatsiyasi
    if (data.paymentType === 'CASH') {
      if (!data.cashAmount || data.cashAmount < data.totalAmount) {
        return NextResponse.json(
          { error: 'Naqd summa yetarli emas' },
          { status: 400 }
        );
      }
    }

    if (data.paymentType === 'CARD') {
      data.cashAmount = 0;
      data.cardAmount = data.totalAmount;
    }

    if (data.paymentType === 'MIXED') {
      const total = (data.cashAmount || 0) + (data.cardAmount || 0);
      if (Math.abs(total - data.totalAmount) > 0.01) {
        return NextResponse.json(
          { error: 'To\'lov summasi to\'g\'ri emas. Naqd va karta summasi jami bilan teng bo\'lishi kerak' },
          { status: 400 }
        );
      }
    }

    // Transaction ichida sotuv yaratish va zaxirani yangilash
    const sale = await prisma.$transaction(async (tx) => {
      // 1. Barcha mahsulotlarni tekshirish va zaxirani validatsiya qilish
      for (const item of data.items) {
        const product = await tx.product.findUnique({
          where: { 
            id: item.productId,
            branchId: session.branchId, // Faqat o'z filiali
          },
        });

        if (!product) {
          throw new Error(`Mahsulot topilmadi: ${item.productId}`);
        }

        if (product.quantity < item.quantity) {
          throw new Error(
            `"${product.name}" mahsuloti zaxirada yetarli emas. Mavjud: ${product.quantity}, talab: ${item.quantity}`
          );
        }
      }

      // 2. Sotuvni yaratish
      const newSale = await tx.sale.create({
        data: {
          totalAmount: data.totalAmount,
          paymentType: data.paymentType,
          cashAmount: data.cashAmount || 0,
          cardAmount: data.cardAmount || 0,
          cashierId: session.userId,
          branchId: session.branchId,
          saleItems: {
            create: data.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              priceAtSale: item.priceAtSale,
            })),
          },
        },
        include: {
          saleItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  barcode: true,
                },
              },
            },
          },
          cashier: {
            select: {
              id: true,
              name: true,
              login: true,
            },
          },
        },
      });

      // 3. Mahsulot zaxirasini kamaytirish
      for (const item of data.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            quantity: {
              decrement: item.quantity,
            },
          },
        });
      }

      return newSale;
    });

    return NextResponse.json(
      {
        success: true,
        sale,
        message: 'Sotuv muvaffaqiyatli amalga oshirildi',
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Sotuv yaratishda xatolik:', error);
    
    // Error tipini aniqlash
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Server xatosi' },
      { status: 500 }
    );
  }
}

// GET - Sotuvlar tarixi
export async function GET(request: NextRequest) {
  try {
    // Session tekshiruvi
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Avtorizatsiya talab qilinadi' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Filter parametrlari
    const whereClause: any = {
      branchId: session.branchId, // Faqat o'z filialining sotuvlari
    };

    // Sana filtri
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.createdAt.lte = new Date(endDate);
      }
    }

    // Sotuvlarni olish
    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where: whereClause,
        include: {
          cashier: {
            select: {
              id: true,
              name: true,
              login: true,
            },
          },
          saleItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  barcode: true,
                  unit: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      prisma.sale.count({
        where: whereClause,
      }),
    ]);

    return NextResponse.json({
      sales,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    });

  } catch (error) {
    console.error('Sotuvlarni olishda xatolik:', error);
    return NextResponse.json(
      { error: 'Server xatosi' },
      { status: 500 }
    );
  }
}
