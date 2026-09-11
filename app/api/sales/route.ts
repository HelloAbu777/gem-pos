import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth/session';

const DEFAULT_BRANCH_ID  = 'default-branch';
const DEFAULT_CASHIER_ID = 'default-cashier';

interface SaleItemInput {
  productId?:  string | null;
  dishId?:     string | null;
  itemName:    string;
  quantity:    number;
  priceAtSale: number;
}

interface SaleRequest {
  paymentType:    'CASH' | 'CARD' | 'MIXED';
  cashAmount?:    number;
  cardAmount?:    number;
  legalEntityId?: string | null;
  items:          SaleItemInput[];
}

// Branch va default-cashier user mavjud bo'lmasa yaratadi
async function ensureDefaults() {
  await prisma.branch.upsert({
    where:  { id: DEFAULT_BRANCH_ID },
    update: {},
    create: { id: DEFAULT_BRANCH_ID, name: 'Asosiy filial' },
  });

  const userExists = await prisma.user.findUnique({ where: { id: DEFAULT_CASHIER_ID } });
  if (!userExists) {
    const bcrypt = await import('bcryptjs');
    const hash   = await bcrypt.hash('admin123', 10);
    // login conflict bo'lmasligi uchun upsert
    const existing = await prisma.user.findUnique({ where: { login: 'admin' } });
    if (existing) {
      // admin user bor lekin ID boshqa — shu user ni DEFAULT_CASHIER_ID sifatida ishlatamiz
      return existing.id;
    }
    await prisma.user.create({
      data: {
        id:       DEFAULT_CASHIER_ID,
        name:     'Admin',
        login:    'admin',
        password: hash,
        role:     'ADMIN',
        branchId: DEFAULT_BRANCH_ID,
      },
    });
  }
  return DEFAULT_CASHIER_ID;
}

// Cashier ID ni tekshiradi — DB da yo'q bo'lsa fallback qaytaradi
async function resolvecashierId(userId: string | undefined): Promise<string> {
  if (userId) {
    const exists = await prisma.user.findUnique({ where: { id: userId } });
    if (exists) return userId;
  }
  // userId yo'q yoki DB da topilmadi — default cashier
  await ensureDefaults();
  // admin login bilan user ni topamiz
  const admin = await prisma.user.findFirst({
    where: { OR: [{ id: DEFAULT_CASHIER_ID }, { login: 'admin' }] },
  });
  if (admin) return admin.id;
  return DEFAULT_CASHIER_ID;
}

// POST - Yangi sotuv
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const data: SaleRequest = await request.json();

    if (!data.items || data.items.length === 0)
      return NextResponse.json({ error: "Savat bo'sh" }, { status: 400 });

    // Branch va cashier ID ni xavfsiz aniqlash
    const branchId  = session?.branchId || DEFAULT_BRANCH_ID;
    const cashierId = await resolvecashierId(session?.userId);

    const totalAmount = data.items.reduce((s, i) => s + i.priceAtSale * i.quantity, 0);

    let cashAmount = data.cashAmount ?? 0;
    let cardAmount = data.cardAmount ?? 0;

    if (data.paymentType === 'CARD')  { cashAmount = 0; cardAmount = totalAmount; }
    if (data.paymentType === 'CASH')  { cashAmount = totalAmount; cardAmount = 0; }
    if (data.paymentType === 'MIXED') {
      if (Math.abs(cashAmount + cardAmount - totalAmount) > 1)
        return NextResponse.json({ error: 'Naqd+Karta summasi jami bilan teng emas' }, { status: 400 });
    }

    const saleType = data.legalEntityId ? 'LEGAL_ENTITY' : 'RETAIL';

    if (data.legalEntityId) {
      const le = await prisma.legalEntity.findUnique({ where: { id: data.legalEntityId } });
      if (!le) return NextResponse.json({ error: 'Yuridik shaxs topilmadi' }, { status: 400 });
    }

    // Branch ham mavjudligini ta'minlash
    await prisma.branch.upsert({
      where:  { id: branchId },
      update: {},
      create: { id: branchId, name: 'Asosiy filial' },
    });

    const sale = await prisma.$transaction(async (tx) => {
      for (const item of data.items) {
        if (!item.productId) continue;
        const product = await tx.product.findFirst({ where: { id: item.productId } });
        if (!product) throw new Error(`Mahsulot topilmadi: ${item.itemName}`);
        if (product.quantity < item.quantity)
          throw new Error(`"${product.name}" zaxirada yetarli emas. Mavjud: ${product.quantity}`);
      }

      const newSale = await tx.sale.create({
        data: {
          totalAmount,
          paymentType:   data.paymentType,
          cashAmount,
          cardAmount,
          saleType,
          cashierId,
          branchId,
          legalEntityId: data.legalEntityId ?? null,
          saleItems: {
            create: data.items.map(item => ({
              productId:   item.productId ?? null,
              itemName:    item.itemName,
              quantity:    item.quantity,
              priceAtSale: item.priceAtSale,
            })),
          },
        },
        include: {
          saleItems:   true,
          legalEntity: { select: { id: true, name: true, phone: true } },
          cashier:     { select: { id: true, name: true } },
        },
      });

      for (const item of data.items) {
        if (!item.productId) continue;
        await tx.product.update({
          where: { id: item.productId },
          data:  { quantity: { decrement: item.quantity } },
        });
      }

      return newSale;
    });

    return NextResponse.json({ success: true, sale }, { status: 201 });

  } catch (error) {
    console.error('Sale POST error:', error);
    if (error instanceof Error)
      return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

// GET - Sotuvlar tarixi
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const { searchParams } = request.nextUrl;
    const limit  = parseInt(searchParams.get('limit')  || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where = session?.branchId ? { branchId: session.branchId } : {};

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: {
          cashier:     { select: { id: true, name: true } },
          legalEntity: { select: { id: true, name: true, phone: true } },
          saleItems:   { select: { itemName: true, quantity: true, priceAtSale: true } },
        },
        orderBy: { createdAt: 'desc' },
        take:    limit,
        skip:    offset,
      }),
      prisma.sale.count({ where }),
    ]);

    return NextResponse.json({ sales, total, limit, offset });
  } catch (error) {
    console.error('Sale GET error:', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
