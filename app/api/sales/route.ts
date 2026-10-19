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

// Cashier ID ni raw SQL bilan tekshiradi
async function resolveCashierId(userId: string | undefined): Promise<string> {
  if (userId) {
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "users" WHERE id = ${userId} LIMIT 1
    `;
    if (rows.length > 0) return userId;
  }
  // Fallback: admin user ni topamiz
  const adminRows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "users"
    WHERE id = ${DEFAULT_CASHIER_ID} OR login = 'admin'
    LIMIT 1
  `;
  if (adminRows.length > 0) return adminRows[0].id;

  // Hech kim yo'q — default yaratamiz
  const bcrypt = await import('bcryptjs');
  const hash   = await bcrypt.hash('admin123', 10);
  await prisma.$executeRaw`
    INSERT INTO "branches" ("id","name","updatedAt")
    VALUES (${DEFAULT_BRANCH_ID},'Asosiy filial',NOW())
    ON CONFLICT ("id") DO NOTHING
  `;
  await prisma.$executeRaw`
    INSERT INTO "users" ("id","name","login","password","role","branchId","updatedAt")
    VALUES (${DEFAULT_CASHIER_ID},'Admin','admin',${hash},'ADMIN',${DEFAULT_BRANCH_ID},NOW())
    ON CONFLICT ("login") DO NOTHING
  `;
  return DEFAULT_CASHIER_ID;
}

// POST - Yangi sotuv
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const data: SaleRequest = await request.json();

    if (!data.items || data.items.length === 0)
      return NextResponse.json({ error: "Savat bo'sh" }, { status: 400 });

    const branchId  = session?.branchId ?? DEFAULT_BRANCH_ID;
    const cashierId = await resolveCashierId(session?.userId);

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
      const le = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM "legal_entities" WHERE id = ${data.legalEntityId} LIMIT 1
      `;
      if (le.length === 0) return NextResponse.json({ error: 'Yuridik shaxs topilmadi' }, { status: 400 });
    }

    // Branch mavjudligini ta'minlash
    await prisma.$executeRaw`
      INSERT INTO "branches" ("id","name","updatedAt")
      VALUES (${branchId},'Asosiy filial',NOW())
      ON CONFLICT ("id") DO NOTHING
    `;

    // Mahsulotlar miqdorini tekshirish
    for (const item of data.items) {
      if (!item.productId) continue;
      const prod = await prisma.$queryRaw<{ name: string; quantity: number }[]>`
        SELECT name, quantity FROM "products" WHERE id = ${item.productId} LIMIT 1
      `;
      if (prod.length === 0) throw new Error(`Mahsulot topilmadi: ${item.itemName}`);
      if (Number(prod[0].quantity) < item.quantity)
        throw new Error(`"${prod[0].name}" zaxirada yetarli emas. Mavjud: ${prod[0].quantity}`);
    }

    // Sotuv yaratish
    const saleId = `sale_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    await prisma.$executeRaw`
      INSERT INTO "sales" (
        "id","totalAmount","paymentType","cashAmount","cardAmount",
        "saleType","cashierId","branchId","legalEntityId","createdAt"
      ) VALUES (
        ${saleId}, ${totalAmount}, ${data.paymentType},
        ${cashAmount}, ${cardAmount}, ${saleType},
        ${cashierId}, ${branchId}, ${data.legalEntityId ?? null},
        NOW()
      )
    `;

    // Sotuv tafsilotlarini yaratish + mahsulot miqdorini kamaytirish
    for (const item of data.items) {
      const itemId = `si_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      await prisma.$executeRaw`
        INSERT INTO "sale_items" ("id","saleId","productId","itemName","quantity","priceAtSale")
        VALUES (${itemId}, ${saleId}, ${item.productId ?? null}, ${item.itemName}, ${item.quantity}, ${item.priceAtSale})
      `;
      if (item.productId) {
        await prisma.$executeRaw`
          UPDATE "products" SET quantity = quantity - ${item.quantity} WHERE id = ${item.productId}
        `;
      }
    }

    return NextResponse.json({ success: true, sale: { id: saleId, totalAmount } }, { status: 201 });

  } catch (error) {
    console.error('Sale POST error:', error);
    const msg = error instanceof Error ? error.message : 'Server xatosi';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

// GET - Sotuvlar tarixi
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const { searchParams } = request.nextUrl;
    const limit  = parseInt(searchParams.get('limit')  || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const branchId = session?.branchId ?? null;

    const sales = branchId
      ? await prisma.$queryRaw<{
          id: string; totalAmount: number; paymentType: string;
          cashAmount: number | null; cardAmount: number | null;
          saleType: string; createdAt: Date;
          cashierName: string | null; legalEntityName: string | null; legalEntityPhone: string | null;
        }[]>`
          SELECT s.id, s."totalAmount",
                 s."paymentType"::TEXT AS "paymentType",
                 s."cashAmount", s."cardAmount",
                 s."saleType"::TEXT AS "saleType",
                 s."createdAt",
                 u.name AS "cashierName",
                 le.name AS "legalEntityName", le.phone AS "legalEntityPhone"
          FROM "sales" s
          LEFT JOIN "users" u ON u.id = s."cashierId"
          LEFT JOIN "legal_entities" le ON le.id = s."legalEntityId"
          WHERE s."branchId" = ${branchId}
          ORDER BY s."createdAt" DESC
          LIMIT ${limit} OFFSET ${offset}
        `
      : await prisma.$queryRaw<{
          id: string; totalAmount: number; paymentType: string;
          cashAmount: number | null; cardAmount: number | null;
          saleType: string; createdAt: Date;
          cashierName: string | null; legalEntityName: string | null; legalEntityPhone: string | null;
        }[]>`
          SELECT s.id, s."totalAmount",
                 s."paymentType"::TEXT AS "paymentType",
                 s."cashAmount", s."cardAmount",
                 s."saleType"::TEXT AS "saleType",
                 s."createdAt",
                 u.name AS "cashierName",
                 le.name AS "legalEntityName", le.phone AS "legalEntityPhone"
          FROM "sales" s
          LEFT JOIN "users" u ON u.id = s."cashierId"
          LEFT JOIN "legal_entities" le ON le.id = s."legalEntityId"
          ORDER BY s."createdAt" DESC
          LIMIT ${limit} OFFSET ${offset}
        `;

    const totalRow = branchId
      ? await prisma.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*) AS count FROM "sales" WHERE "branchId" = ${branchId}`
      : await prisma.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*) AS count FROM "sales"`;

    const total = Number(totalRow[0]?.count ?? 0);

    // Har bir sotuv uchun itemlarni olish
    const saleIds = sales.map(s => s.id);
    const items = saleIds.length > 0
      ? await prisma.$queryRaw<{ saleId: string; itemName: string; quantity: number; priceAtSale: number }[]>`
          SELECT "saleId", "itemName", quantity, "priceAtSale"
          FROM "sale_items"
          WHERE "saleId" = ANY(${saleIds}::TEXT[])
        `
      : [];

    const result = sales.map(s => ({
      id:          s.id,
      totalAmount: Number(s.totalAmount),
      paymentType: s.paymentType,
      cashAmount:  Number(s.cashAmount ?? 0),
      cardAmount:  Number(s.cardAmount ?? 0),
      saleType:    s.saleType,
      createdAt:   s.createdAt,
      cashier:     { name: s.cashierName ?? 'Admin' },
      legalEntity: s.legalEntityName ? { name: s.legalEntityName, phone: s.legalEntityPhone } : null,
      saleItems:   items.filter(i => i.saleId === s.id).map(i => ({
        itemName:    i.itemName,
        quantity:    Number(i.quantity),
        priceAtSale: Number(i.priceAtSale),
      })),
    }));

    return NextResponse.json({ sales: result, total, limit, offset });
  } catch (error) {
    console.error('Sale GET error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown';
    return NextResponse.json({ error: 'Server xatosi', details: msg }, { status: 500 });
  }
}
