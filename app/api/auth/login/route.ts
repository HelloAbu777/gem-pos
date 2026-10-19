import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as bcrypt from 'bcryptjs';
import { createSession } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  try {
    const { login, password } = await request.json();

    if (!login?.trim() || !password?.trim()) {
      return NextResponse.json(
        { error: 'Login va parol talab qilinadi' },
        { status: 400 }
      );
    }

    // Raw SQL — Prisma enum/type muammosini bypass qiladi
    // DB da role TEXT yoki ENUM bo'lishidan qat'iy nazar ishlaydi
    const rows = await prisma.$queryRaw<{
      id: string;
      name: string;
      login: string;
      password: string;
      role: string;
      branchId: string | null;
    }[]>`
      SELECT u.id, u.name, u.login, u.password, u.role::TEXT AS role,
             u."branchId",
             b.name AS "branchName"
      FROM   "users" u
      LEFT JOIN "branches" b ON b.id = u."branchId"
      WHERE  u.login = ${login.trim()}
      LIMIT  1
    `;

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: 'Login yoki parol noto\'g\'ri' },
        { status: 401 }
      );
    }

    const user = rows[0] as typeof rows[0] & { branchName?: string | null };

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Login yoki parol noto\'g\'ri' },
        { status: 401 }
      );
    }

    const role = (user.role ?? 'CASHIER') as 'SUPER_ADMIN' | 'ADMIN' | 'CASHIER';

    await createSession({
      userId:   user.id,
      login:    user.login,
      name:     user.name,
      role,
      branchId: user.branchId ?? null,
    });

    return NextResponse.json({
      success: true,
      user: {
        id:     user.id,
        name:   user.name,
        login:  user.login,
        role,
        branch: user.branchName ?? 'Super Admin Panel',
      },
    });

  } catch (error) {
    console.error('Login error:', error);
    const msg = error instanceof Error ? error.message : 'Noma\'lum xato';
    return NextResponse.json(
      { error: `Server xatosi: ${msg}` },
      { status: 500 }
    );
  }
}
