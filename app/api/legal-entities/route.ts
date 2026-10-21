import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth/session';

const DEFAULT_BRANCH_ID = 'default-branch';

export async function GET() {
  try {
    const session  = await getSession();
    const branchId = session?.branchId ?? DEFAULT_BRANCH_ID;

    // FIX: Agregatsiya (SUM/COUNT over sales) faqat admin sahifasida kerak.
    // POS va asosiy ro'yxat uchun — oddiy SELECT, tez
    const entities = await prisma.$queryRaw<{
      id: string; name: string; phone: string;
      branchId: string; createdAt: Date;
    }[]>`
      SELECT id, name, phone, "branchId", "createdAt"
      FROM "legal_entities"
      WHERE "branchId" = ${branchId}
      ORDER BY name ASC
    `;

    return NextResponse.json(
      entities.map(e => ({
        id:          e.id,
        name:        e.name,
        phone:       e.phone,
        branchId:    e.branchId,
        createdAt:   e.createdAt,
        salesCount:  0,
        totalAmount: 0,
      }))
    );
  } catch (error) {
    console.error('Legal entities GET error:', error);
    const msg = error instanceof Error ? error.message : 'Server xatosi';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session  = await getSession();
    const branchId = session?.branchId ?? DEFAULT_BRANCH_ID;
    const { name, phone } = await request.json();

    if (!name?.trim())  return NextResponse.json({ error: 'Ism kiritilmagan' },          { status: 400 });
    if (!phone?.trim()) return NextResponse.json({ error: 'Telefon raqam kiritilmagan' }, { status: 400 });

    const id = `le_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await prisma.$executeRaw`
      INSERT INTO "legal_entities" ("id","name","phone","branchId","createdAt","updatedAt")
      VALUES (${id}, ${name.trim()}, ${phone.trim()}, ${branchId}, NOW(), NOW())
    `;

    return NextResponse.json({ id, name: name.trim(), phone: phone.trim(), branchId }, { status: 201 });
  } catch (error) {
    console.error('Legal entity POST error:', error);
    const msg = error instanceof Error ? error.message : 'Server xatosi';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
