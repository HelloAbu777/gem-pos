import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth/session';

export async function DELETE() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can clear history' }, { status: 403 });
    }

    // branchId null bo'lsa (SUPER_ADMIN) — barcha filiallar, aks holda faqat o'z filiali
    const where = session.branchId ? { branchId: session.branchId } : {};

    await prisma.sale.deleteMany({ where });

    return NextResponse.json({
      success: true,
      message: 'Tarix muvaffaqiyatli o\'chirildi',
    });
  } catch (error) {
    console.error('Clear history error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
