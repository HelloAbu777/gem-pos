import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - barcha taomlar (POS uchun faqat aktiv, admin uchun hammasi)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const all = searchParams.get('all') === '1';

    const dishes = await prisma.dish.findMany({
      where: all ? undefined : { isActive: true },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(dishes);
  } catch (error) {
    console.error('Dishes GET error:', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

// POST - yangi taom qo'shish
export async function POST(request: NextRequest) {
  try {
    const { name, price, barcode } = await request.json();

    if (!name?.trim())        return NextResponse.json({ error: 'Nom kiritilmagan' }, { status: 400 });
    if (!price || price <= 0) return NextResponse.json({ error: 'Narx noto\'g\'ri' }, { status: 400 });

    // Barcode unique tekshirish
    if (barcode?.trim()) {
      const existing = await prisma.dish.findUnique({ where: { barcode: barcode.trim() } });
      if (existing) return NextResponse.json({ error: 'Bu barcode allaqachon mavjud' }, { status: 400 });
    }

    const dish = await prisma.dish.create({
      data: {
        name:     name.trim(),
        price:    Number(price),
        barcode:  barcode?.trim() || null,
        isActive: true,
      },
    });
    return NextResponse.json(dish, { status: 201 });
  } catch (error) {
    console.error('Dish POST error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Server xatosi', details: msg }, { status: 500 });
  }
}
