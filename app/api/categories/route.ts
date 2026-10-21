import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth/session';

const DEFAULT_BRANCH_ID = 'default-branch';

export async function GET() {
  try {
    const session  = await getSession();
    const branchId = session?.branchId ?? DEFAULT_BRANCH_ID;

    // FIX: COUNT(products) olib tashlandi — POS faqat id/name kerak, JOIN+GROUP BY sekin
    const categories = await prisma.$queryRaw<{
      id: string; name: string; branchId: string;
      createdAt: Date; updatedAt: Date;
    }[]>`
      SELECT id, name, "branchId", "createdAt", "updatedAt"
      FROM "categories"
      WHERE "branchId" = ${branchId}
      ORDER BY name ASC
    `;

    return NextResponse.json(
      categories.map(c => ({
        id:        c.id,
        name:      c.name,
        branchId:  c.branchId,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        _count:    { products: 0 },
      }))
    );
  } catch (error) {
    console.error('Categories GET error:', error);
    const msg = error instanceof Error ? error.message : 'Server xatosi';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session  = await getSession();
    const branchId = session?.branchId ?? DEFAULT_BRANCH_ID;
    const { name } = await request.json();

    if (!name?.trim()) return NextResponse.json({ error: 'Kategoriya nomi kiritilmagan' }, { status: 400 });

    // Faqat shu filialdagi kategoriyalar ichida tekshirish
    const existing = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "categories"
      WHERE name = ${name.trim()} AND "branchId" = ${branchId}
      LIMIT 1
    `;
    if (existing.length > 0) return NextResponse.json({ error: 'Bu kategoriya allaqachon mavjud' }, { status: 400 });

    const id = `cat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await prisma.$executeRaw`
      INSERT INTO "categories" ("id","name","branchId","createdAt","updatedAt")
      VALUES (${id}, ${name.trim()}, ${branchId}, NOW(), NOW())
    `;

    return NextResponse.json({ id, name: name.trim(), branchId, _count: { products: 0 } }, { status: 201 });
  } catch (error) {
    console.error('Categories POST error:', error);
    const msg = error instanceof Error ? error.message : 'Server xatosi';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
