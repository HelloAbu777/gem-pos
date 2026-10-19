import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as bcrypt from 'bcryptjs';

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  if (secret !== 'gem-clear-2026') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const hash = await bcrypt.hash('gem*94*', 10);

    // Avval mavjudligini tekshiramiz
    const existing = await prisma.$queryRaw<{ id: string; login: string; role: string }[]>`
      SELECT id, login, role::TEXT AS role FROM "users" WHERE login = 'gem' LIMIT 1
    `;

    if (existing.length > 0) {
      // Parolni yangilash
      await prisma.$executeRaw`
        UPDATE "users"
        SET password = ${hash}, role = 'SUPER_ADMIN', "branchId" = NULL, "updatedAt" = NOW()
        WHERE login = 'gem'
      `;
      return NextResponse.json({
        success: true,
        action: 'updated',
        user: { id: existing[0].id, login: 'gem', role: 'SUPER_ADMIN' },
        message: 'gem useri yangilandi. Login: gem, Parol: gem*94*',
      });
    } else {
      // Yaratish
      const id = `super-admin-${Date.now()}`;
      await prisma.$executeRaw`
        INSERT INTO "users" ("id","name","login","password","role","branchId","createdAt","updatedAt")
        VALUES (${id}, 'Super Admin', 'gem', ${hash}, 'SUPER_ADMIN', NULL, NOW(), NOW())
      `;
      return NextResponse.json({
        success: true,
        action: 'created',
        user: { id, login: 'gem', role: 'SUPER_ADMIN' },
        message: 'gem useri yaratildi. Login: gem, Parol: gem*94*',
      });
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Xato';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
