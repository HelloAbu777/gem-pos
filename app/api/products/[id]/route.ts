import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth/session';

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await context.params;
    const data    = await request.json();

    if (!data.name?.trim())  return NextResponse.json({ error: 'Nom kiritilmagan' }, { status: 400 });
    if (!data.salePrice)     return NextResponse.json({ error: 'Sotish narxi kiritilmagan' }, { status: 400 });
    if (!data.purchasePrice) return NextResponse.json({ error: 'Kelish narxi kiritilmagan' }, { status: 400 });

    // Barcode unique (o'zidan tashqari)
    if (data.barcode?.trim()) {
      const ex = await prisma.product.findFirst({
        where: { barcode: data.barcode.trim(), id: { not: id } },
      });
      if (ex) return NextResponse.json({ error: 'Bu barcode allaqachon mavjud' }, { status: 400 });
    }

    const margin = Number(data.salePrice) - Number(data.purchasePrice);

    const product = await prisma.product.update({
      where: { id },
      data: {
        name:          data.name.trim(),
        barcode:       data.barcode?.trim() || null,
        unit:          data.unit          || 'dona',
        quantity:      Number(data.quantity)      || 0,
        minQuantity:   Number(data.minQuantity)   || 10,
        purchasePrice: Number(data.purchasePrice),
        salePrice:     Number(data.salePrice),
        margin,
        vatType:       data.vatType       || 'NO_VAT',
        expiryDate:    data.expiryDate ? new Date(data.expiryDate) : null,
        categoryId:    data.categoryId,
        supplierId:    data.supplierId,
      },
      include: { category: true, supplier: true },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error('Product PUT error:', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await context.params;

    // Sotilgan mahsulotlar bor bo'lsa xabar ber
    const saleCount = await prisma.saleItem.count({ where: { productId: id } });
    if (saleCount > 0) {
      return NextResponse.json(
        { error: `Bu mahsulot ${saleCount} ta sotuvda ishlatilgan. O'chirib bo'lmaydi.` },
        { status: 400 }
      );
    }

    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Product DELETE error:', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
