import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  if (secret !== 'gem-clear-2026') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // Jadvallar mavjudligini tekshirish va tozalash
    const tables = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `;

    const tableNames = tables.map(t => t.tablename);
    const cleared: string[] = [];
    const skipped: string[] = [];

    const order = ['sale_items', 'sales', 'products', 'dishes', 'categories', 'suppliers', 'legal_entities', 'branches'];

    for (const table of order) {
      if (tableNames.includes(table)) {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);
        cleared.push(table);
      } else {
        skipped.push(table);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Database tozalandi",
      cleared,
      skipped,
      allTables: tableNames,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Server xatosi';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
