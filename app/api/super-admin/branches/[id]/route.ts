import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth/session';

async function checkSuperAdmin() {
  const session = await getSession();
  if (!session || session.role !== 'SUPER_ADMIN') return null;
  return session;
}

// GET — bitta filial ma'lumotlari
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await checkSuperAdmin();
    if (!session) return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });

    const { id } = await params;

    const branch = await prisma.branch.findUnique({
      where: { id },
      include: {
        users: { select: { id: true, name: true, login: true, role: true, createdAt: true } },
        _count: { select: { sales: true, products: true } },
      },
    });

    if (!branch) return NextResponse.json({ error: 'Filial topilmadi' }, { status: 404 });
    return NextResponse.json(branch);
  } catch (error) {
    console.error('Branch GET error:', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

// PUT — filial ma'lumotlarini yangilash
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await checkSuperAdmin();
    if (!session) return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });

    const { id } = await params;
    const { name, address } = await request.json();

    if (!name?.trim()) return NextResponse.json({ error: 'Filial nomi kiritilmagan' }, { status: 400 });

    const branch = await prisma.branch.update({
      where: { id },
      data: { name: name.trim(), address: address?.trim() || null },
    });

    return NextResponse.json({ success: true, branch });
  } catch (error) {
    console.error('Branch PUT error:', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
