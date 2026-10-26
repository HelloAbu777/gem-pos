import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth/session';

// POST /api/sales/[id]/refund — Sotuvni bekor qilish va stock'ni qaytarish
export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await context.params;

    // Sotuvni topish
    const sales = await prisma.$queryRaw<{
      id: string; totalAmount: number; branchId: string; createdAt: Date;
    }[]>`
      SELECT id, "totalAmount", "branchId", "createdAt"
      FROM "sales" WHERE id = ${id} LIMIT 1
    `;

    if (sales.length === 0)
      return NextResponse.json({ error: 'Sotuv topilmadi' }, { status: 404 });

    const sale = sales[0];

    // Faqat o'z filiali sotuvini bekor qilish mumkin
    if (session.role !== 'SUPER_ADMIN' && sale.branchId !== session.branchId) {
      return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });
    }

    // Sotuv itemlarini olish
    const items = await prisma.$queryRaw<{
      productId: string | null; quantity: number; itemName: string;
    }[]>`
      SELECT "productId", quantity, "itemName"
      FROM "sale_items" WHERE "saleId" = ${id}
    `;

    // Stock'ni qaytarish (faqat product itemlar uchun)
    for (const item of items) {
      if (!item.productId) continue;
      await prisma.$executeRaw`
        UPDATE "products"
        SET quantity = quantity + ${Number(item.quantity)}
        WHERE id = ${item.productId}
      `;
    }

    // Sotuvni o'chirish (sale_items CASCADE bilan o'chadi)
    await prisma.$executeRaw`DELETE FROM "sales" WHERE id = ${id}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Refund error:', error);
    const msg = error instanceof Error ? error.message : 'Server xatosi';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
