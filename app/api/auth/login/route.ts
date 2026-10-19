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

    // Foydalanuvchini topish — branch optional (SUPER_ADMIN uchun null bo'lishi mumkin)
    const user = await prisma.user.findUnique({
      where: { login: login.trim() },
      select: {
        id:       true,
        name:     true,
        login:    true,
        password: true,
        role:     true,
        branchId: true,
        branch: {
          select: { id: true, name: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Login yoki parol noto\'g\'ri' },
        { status: 401 }
      );
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Login yoki parol noto\'g\'ri' },
        { status: 401 }
      );
    }

    // Session yaratish
    await createSession({
      userId:   user.id,
      login:    user.login,
      name:     user.name,
      role:     user.role as 'SUPER_ADMIN' | 'ADMIN' | 'CASHIER',
      branchId: user.branchId ?? null,
    });

    return NextResponse.json({
      success: true,
      user: {
        id:     user.id,
        name:   user.name,
        login:  user.login,
        role:   user.role,
        branch: user.branch?.name ?? 'Super Admin Panel',
      },
    });

  } catch (error) {
    console.error('Login error:', error);
    // Xato xabarini aniq ko'rsatish (debug uchun)
    const msg = error instanceof Error ? error.message : 'Noma\'lum xato';
    return NextResponse.json(
      { error: `Server xatosi: ${msg}` },
      { status: 500 }
    );
  }
}
