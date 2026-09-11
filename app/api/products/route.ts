import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const DEFAULT_BRANCH_ID = 'default-branch';

// Branch mavjud bo'lmasa yaratadi — foreign key xatosini oldini olish
async function ensureBranch(branchId: string) {
  await prisma.branch.upsert({
    where:  { id: branchId },
    update: {},
    create: { id: branchId, name: 'Asosiy filial' },
  });
}

// GET - Barcha mahsulotlar
export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: {
        category: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(products);
  } catch (error) {
    console.error('Products GET error:', error);
    const msg = error instanceof Error ? error.message : 'Server xatosi';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST - Yangi mahsulot yaratish
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    if (!data.name?.trim())  return NextResponse.json({ error: 'Nom kiritilmagan' },           { status: 400 });
    if (!data.categoryId)    return NextResponse.json({ error: 'Kategoriya tanlanmagan' },      { status: 400 });
    if (!data.supplierId)    return NextResponse.json({ error: "Ta'minotchi tanlanmagan" },     { status: 400 });
    if (!data.salePrice)     return NextResponse.json({ error: 'Sotish narxi kiritilmagan' },   { status: 400 });
    if (!data.purchasePrice) return NextResponse.json({ error: 'Kelish narxi kiritilmagan' },   { status: 400 });

    if (data.barcode?.trim()) {
      const exists = await prisma.product.findUnique({ where: { barcode: data.barcode.trim() } });
      if (exists) return NextResponse.json({ error: 'Bu shtrix kod allaqachon mavjud' }, { status: 400 });
    }

    await ensureBranch(DEFAULT_BRANCH_ID);

    const margin = Number(data.salePrice) - Number(data.purchasePrice);

    const product = await prisma.product.create({
      data: {
        name:          data.name.trim(),
        barcode:       data.barcode?.trim() || null,
        unit:          data.unit            || 'dona',
        quantity:      Number(data.quantity)    || 0,
        minQuantity:   Number(data.minQuantity) || 10,
        purchasePrice: Number(data.purchasePrice),
        salePrice:     Number(data.salePrice),
        margin,
        vatType:       data.vatType    || 'NO_VAT',
        expiryDate:    data.expiryDate ? new Date(data.expiryDate) : null,
        categoryId:    data.categoryId,
        supplierId:    data.supplierId,
        branchId:      DEFAULT_BRANCH_ID,
      },
      include: { category: true, supplier: true },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Products POST error:', error);
    const msg = error instanceof Error ? error.message : 'Server xatosi';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
