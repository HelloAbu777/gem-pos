import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as bcrypt from 'bcryptjs';
import { createSession } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  try {
    const { login, password } = await request.json();

    if (!login || !password) {
      return NextResponse.json(
        { error: 'Login va parol talab qilinadi' },
        { status: 400 }
      );
    }

    // Foydalanuvchini topish
    const user = await prisma.user.findUnique({
      where: { login },
      include: { branch: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Login yoki parol noto\'g\'ri' },
        { status: 401 }
      );
    }

    // Parolni tekshirish
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Login yoki parol noto\'g\'ri' },
        { status: 401 }
      );
    }

    // Session yaratish
    await createSession({
      userId: user.id,
      login: user.login,
      name: user.name,
      role: user.role,
      branchId: user.branchId,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        login: user.login,
        role: user.role,
        branch: user.branch.name,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Server xatosi' },
      { status: 500 }
    );
  }
}
