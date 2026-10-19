import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth/session';
import * as bcrypt from 'bcryptjs';

// Super Admin tekshiruvi
async function checkSuperAdmin() {
  const session = await getSession();
  if (!session || session.role !== 'SUPER_ADMIN') {
    return null;
  }
  return session;
}

// GET — barcha filiallar (foydalanuvchilar soni va savdo statistikasi bilan)
export async function GET() {
  try {
    const session = await checkSuperAdmin();
    if (!session) return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });

    const branches = await prisma.branch.findMany({
      include: {
        users: {
          select: { id: true, name: true, login: true, role: true },
        },
        _count: {
          select: { sales: true, products: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Har bir filial uchun bugungi savdo summasi
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todaySales = await prisma.sale.groupBy({
      by: ['branchId'],
      where: { createdAt: { gte: today, lte: todayEnd } },
      _sum: { totalAmount: true },
      _count: { id: true },
    });

    const salesMap = Object.fromEntries(
      todaySales.map(s => [s.branchId, {
        todayAmount: s._sum.totalAmount ?? 0,
        todayCount: s._count.id,
      }])
    );

    const result = branches.map(b => ({
      id: b.id,
      name: b.name,
      address: b.address,
      createdAt: b.createdAt,
      usersCount: b.users.length,
      productsCount: b._count.products,
      salesCount: b._count.sales,
      todayAmount: salesMap[b.id]?.todayAmount ?? 0,
      todayCount: salesMap[b.id]?.todayCount ?? 0,
      users: b.users,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Branches GET error:', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

// POST — yangi filial + admin foydalanuvchi yaratish
export async function POST(request: NextRequest) {
  try {
    const session = await checkSuperAdmin();
    if (!session) return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });

    const { name, address, adminLogin, adminPassword, adminName } = await request.json();

    if (!name?.trim())         return NextResponse.json({ error: 'Filial nomi kiritilmagan' }, { status: 400 });
    if (!adminLogin?.trim())   return NextResponse.json({ error: 'Admin logini kiritilmagan' }, { status: 400 });
    if (!adminPassword?.trim()) return NextResponse.json({ error: 'Admin paroli kiritilmagan' }, { status: 400 });

    // Login mavjudligini tekshirish
    const existing = await prisma.user.findUnique({ where: { login: adminLogin.trim() } });
    if (existing) return NextResponse.json({ error: 'Bu login allaqachon mavjud' }, { status: 400 });

    const hashedPassword = await bcrypt.hash(adminPassword.trim(), 10);

    // Tranzaksiya: filial + admin user birga yaratiladi
    const result = await prisma.$transaction(async (tx) => {
      const branch = await tx.branch.create({
        data: {
          name: name.trim(),
          address: address?.trim() || null,
        },
      });

      const adminUser = await tx.user.create({
        data: {
          name: adminName?.trim() || `${name.trim()} Admin`,
          login: adminLogin.trim(),
          password: hashedPassword,
          role: 'ADMIN',
          branchId: branch.id,
        },
      });

      return { branch, adminUser };
    });

    return NextResponse.json({
      success: true,
      branch: result.branch,
      admin: {
        id: result.adminUser.id,
        name: result.adminUser.name,
        login: result.adminUser.login,
        role: result.adminUser.role,
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Branch POST error:', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
