import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth/session';

const DEFAULT_BRANCH_ID = 'default-branch';

export async function GET() {
  try {
    const session  = await getSession();
    const branchId = session?.branchId ?? DEFAULT_BRANCH_ID;

    const suppliers = await prisma.$queryRaw<{
      id: string; name: string; contactPerson: string; phone: string;
      branchId: string; createdAt: Date; productCount: bigint;
    }[]>`
      SELECT s.id, s.name, s."contactPerson", s.phone, s."branchId", s."createdAt",
             COUNT(p.id) AS "productCount"
      FROM "suppliers" s
      LEFT JOIN "products" p ON p."supplierId" = s.id
      WHERE s."branchId" = ${branchId}
      GROUP BY s.id
      ORDER BY s.name ASC
    `;

    return NextResponse.json(
      suppliers.map(s => ({
        id:            s.id,
        name:          s.name,
        contactPerson: s.contactPerson,
        phone:         s.phone,
        branchId:      s.branchId,
        createdAt:     s.createdAt,
        _count:        { products: Number(s.productCount) },
      }))
    );
  } catch (error) {
    console.error('Suppliers GET error:', error);
    const msg = error instanceof Error ? error.message : 'Server xatosi';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session  = await getSession();
    const branchId = session?.branchId ?? DEFAULT_BRANCH_ID;
    const { name, contactPerson, phone } = await request.json();

    if (!name?.trim())          return NextResponse.json({ error: 'Ism kiritilmagan' }, { status: 400 });
    if (!contactPerson?.trim()) return NextResponse.json({ error: "Mas'ul shaxs kiritilmagan" }, { status: 400 });
    if (!phone?.trim())         return NextResponse.json({ error: 'Telefon kiritilmagan' }, { status: 400 });

    const id = `sup_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await prisma.$executeRaw`
      INSERT INTO "suppliers" ("id","name","contactPerson","phone","branchId","createdAt","updatedAt")
      VALUES (${id}, ${name.trim()}, ${contactPerson.trim()}, ${phone.trim()}, ${branchId}, NOW(), NOW())
    `;

    return NextResponse.json({ id, name: name.trim(), contactPerson: contactPerson.trim(), phone: phone.trim(), branchId }, { status: 201 });
  } catch (error) {
    console.error('Supplier POST error:', error);
    const msg = error instanceof Error ? error.message : 'Server xatosi';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
