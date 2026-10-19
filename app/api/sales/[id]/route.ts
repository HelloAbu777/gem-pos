import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth/session';

// DELETE /api/sales/:id — Sotuvni qaytarish (refund)
// Sotuv o'chiriladi va mahsulot miqdorlari qayta tiklanadi
export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await context.params;

    // Sotuvni topish
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        saleItems: {
          select: { productId: true, quantity: true, itemName: true },
        },
      },
    });

    if (!sale) return NextResponse.json({ error: 'Sotuv topilmadi' }, { status: 404 });

    // Faqat o'z branchini qaytarishi mumkin
    if (session.branchId && sale.branchId !== session.branchId) {
      return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });
    }

    // Transaction: sotuv o'chirish + mahsulot miqdorlarini tiklash
    await prisma.$transaction(async (tx) => {
      // Mahsulot miqdorlarini tiklash
      for (const item of sale.saleItems) {
        if (!item.productId) continue;
        // Mahsulot hali bazada borligini tekshirish
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (product) {
          await tx.product.update({
            where: { id: item.productId },
            data:  { quantity: { increment: item.quantity } },
          });
        }
      }
      // Sotuvni o'chirish (SaleItem lar cascade bilan o'chiriladi)
      await tx.sale.delete({ where: { id } });
    });

    return NextResponse.json({ success: true, message: 'Sotuv qaytarildi va mahsulotlar tiklandi' });

  } catch (error) {
    console.error('Sale DELETE error:', error);
    const msg = error instanceof Error ? error.message : 'Server xatosi';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// GET /api/sales/:id — Sotuv detallari
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        cashier:     { select: { id: true, name: true } },
        legalEntity: { select: { id: true, name: true, phone: true } },
        saleItems:   { select: { id: true, itemName: true, quantity: true, priceAtSale: true, product: { select: { name: true } } } },
      },
    });

    if (!sale) return NextResponse.json({ error: 'Topilmadi' }, { status: 404 });
    return NextResponse.json(sale);

  } catch (error) {
    console.error('Sale GET error:', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
