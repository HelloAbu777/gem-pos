import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth/session';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const suppliers = await prisma.supplier.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { products: true } },
      },
    });

    return NextResponse.json(suppliers);
  } catch (error) {
    console.error('Suppliers GET error:', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { name, contactPerson, phone } = await request.json();

    if (!name?.trim())          return NextResponse.json({ error: 'Ism kiritilmagan' }, { status: 400 });
    if (!contactPerson?.trim()) return NextResponse.json({ error: 'Mas\'ul shaxs kiritilmagan' }, { status: 400 });
    if (!phone?.trim())         return NextResponse.json({ error: 'Telefon kiritilmagan' }, { status: 400 });

    const supplier = await prisma.supplier.create({
      data: { name: name.trim(), contactPerson: contactPerson.trim(), phone: phone.trim() },
    });

    return NextResponse.json(supplier, { status: 201 });
  } catch (error) {
    console.error('Supplier POST error:', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
