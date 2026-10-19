import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth/session';

const DEFAULT_BRANCH_ID = 'default-branch';

// GET - taomlar (faqat o'z filiali)
export async function GET(request: NextRequest) {
  try {
    const session  = await getSession();
    const branchId = session?.branchId ?? DEFAULT_BRANCH_ID;
    const all      = request.nextUrl.searchParams.get('all') === '1';

    const dishes = all
      ? await prisma.$queryRaw<{
          id: string; name: string; price: number; costPrice: number;
          barcode: string | null; isActive: boolean; branchId: string;
          createdAt: Date; updatedAt: Date;
        }[]>`
          SELECT id, name, price, "costPrice", barcode, "isActive", "branchId", "createdAt", "updatedAt"
          FROM "dishes"
          WHERE "branchId" = ${branchId}
          ORDER BY name ASC
        `
      : await prisma.$queryRaw<{
          id: string; name: string; price: number; costPrice: number;
          barcode: string | null; isActive: boolean; branchId: string;
          createdAt: Date; updatedAt: Date;
        }[]>`
          SELECT id, name, price, "costPrice", barcode, "isActive", "branchId", "createdAt", "updatedAt"
          FROM "dishes"
          WHERE "branchId" = ${branchId} AND "isActive" = true
          ORDER BY name ASC
        `;

    return NextResponse.json(dishes.map(d => ({ ...d, price: Number(d.price), costPrice: Number(d.costPrice) })));
  } catch (error) {
    console.error('Dishes GET error:', error);
    const msg = error instanceof Error ? error.message : 'Server xatosi';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST - yangi taom qo'shish (session branchId bilan)
export async function POST(request: NextRequest) {
  try {
    const session  = await getSession();
    const branchId = session?.branchId ?? DEFAULT_BRANCH_ID;
    const { name, price, costPrice, barcode } = await request.json();

    if (!name?.trim())        return NextResponse.json({ error: 'Nom kiritilmagan' }, { status: 400 });
    if (!price || price <= 0) return NextResponse.json({ error: "Narx noto'g'ri" }, { status: 400 });

    if (barcode?.trim()) {
      const existing = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM "dishes" WHERE barcode = ${barcode.trim()} LIMIT 1
      `;
      if (existing.length > 0) return NextResponse.json({ error: 'Bu barcode allaqachon mavjud' }, { status: 400 });
    }

    const id = `dish_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    await prisma.$executeRaw`
      INSERT INTO "dishes" ("id","name","price","costPrice","barcode","isActive","branchId","createdAt","updatedAt")
      VALUES (
        ${id}, ${name.trim()}, ${Number(price)}, ${Number(costPrice) || 0},
        ${barcode?.trim() || null}, true, ${branchId}, NOW(), NOW()
      )
    `;

    const created = await prisma.$queryRaw<object[]>`
      SELECT * FROM "dishes" WHERE id = ${id}
    `;

    return NextResponse.json(created[0], { status: 201 });
  } catch (error) {
    console.error('Dish POST error:', error);
    const msg = error instanceof Error ? error.message : 'Server xatosi';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
