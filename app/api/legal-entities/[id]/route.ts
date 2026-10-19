import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const rows = await prisma.$queryRaw<{
      id: string; name: string; phone: string; branchId: string; createdAt: Date;
    }[]>`
      SELECT id, name, phone, "branchId", "createdAt" FROM "legal_entities" WHERE id = ${id} LIMIT 1
    `;
    if (rows.length === 0) return NextResponse.json({ error: 'Topilmadi' }, { status: 404 });

    const sales = await prisma.$queryRaw<{
      id: string; totalAmount: number; paymentType: string;
      createdAt: Date; cashierName: string | null;
    }[]>`
      SELECT s.id, s."totalAmount", s."paymentType"::TEXT AS "paymentType",
             s."createdAt", u.name AS "cashierName"
      FROM "sales" s
      LEFT JOIN "users" u ON u.id = s."cashierId"
      WHERE s."legalEntityId" = ${id}
      ORDER BY s."createdAt" DESC
      LIMIT 20
    `;

    return NextResponse.json({ ...rows[0], sales: sales.map(s => ({ ...s, totalAmount: Number(s.totalAmount) })) });
  } catch (error) {
    console.error('Legal entity GET error:', error);
    const msg = error instanceof Error ? error.message : 'Server xatosi';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { name, phone } = await request.json();

    if (!name?.trim())  return NextResponse.json({ error: 'Ism kiritilmagan' },   { status: 400 });
    if (!phone?.trim()) return NextResponse.json({ error: 'Telefon kiritilmagan' }, { status: 400 });

    await prisma.$executeRaw`
      UPDATE "legal_entities"
      SET name = ${name.trim()}, phone = ${phone.trim()}, "updatedAt" = NOW()
      WHERE id = ${id}
    `;

    return NextResponse.json({ id, name: name.trim(), phone: phone.trim() });
  } catch (error) {
    console.error('Legal entity PUT error:', error);
    const msg = error instanceof Error ? error.message : 'Server xatosi';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    await prisma.$executeRaw`DELETE FROM "legal_entities" WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Legal entity DELETE error:', error);
    const msg = error instanceof Error ? error.message : 'Server xatosi';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
