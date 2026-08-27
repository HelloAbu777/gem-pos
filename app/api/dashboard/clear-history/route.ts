import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth/session';

export async function DELETE() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Faqat adminlar tarixni o'chira oladi
    if (session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can clear history' }, { status: 403 });
    }

    // Barcha sotuvlarni o'chirish (SaleItem'lar avtomatik o'chiriladi cascade orqali)
    await prisma.sale.deleteMany({
      where: {
        branchId: session.branchId,
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Tarix muvaffaqiyatli o\'chirildi' 
    });
  } catch (error) {
    console.error('Clear history error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
