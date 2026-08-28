import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const dishes = await prisma.dish.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(dishes);
  } catch (error) {
    console.error('Dishes fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch dishes' }, { status: 500 });
  }
}
