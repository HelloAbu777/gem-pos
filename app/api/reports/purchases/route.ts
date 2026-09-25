import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/reports/purchases
 *
 * Query params:
 *   from  — boshlanish sanasi (YYYY-MM-DD), default: bugun
 *   to    — tugash sanasi    (YYYY-MM-DD), default: bugun
 *   type  — "warehouse" | "products" | "all" (default: "all")
 *   limit — nechta qaytarsin (default: 200)
 *
 * Response:
 *   { total, items: [...] }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const from  = searchParams.get('from');
    const to    = searchParams.get('to');
    const type  = searchParams.get('type') || 'all';
    const limit = parseInt(searchParams.get('limit') || '200');

    const today = new Date().toISOString().split('T')[0];
    const start = new Date(from || today);
    const end   = new Date(to   || today);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const items: object[] = [];

    // ── 1. Mahsulotlar bo'limidagi kirimlar ──────────────────────
    if (type === 'all' || type === 'products') {
      const products = await prisma.product.findMany({
        where: { createdAt: { gte: start, lte: end } },
        include: {
          category: { select: { id: true, name: true } },
          supplier: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      for (const p of products) {
        items.push({
          source:        'products',
          id:            p.id,
          name:          p.name,
          barcode:       p.barcode,
          unit:          p.unit,
          quantity:      p.quantity,
          minQuantity:   p.minQuantity,
          purchasePrice: p.purchasePrice,
          salePrice:     p.salePrice,
          margin:        p.salePrice - p.purchasePrice,
          vatType:       p.vatType,
          expiryDate:    p.expiryDate,
          category:      p.category.name,
          categoryId:    p.category.id,
          supplier:      p.supplier.name,
          supplierId:    p.supplier.id,
          totalValue:    p.purchasePrice * p.quantity,
          createdAt:     p.createdAt,
        });
      }
    }

    // ── 2. Ombor kirim ────────────────────────────────────────────
    if (type === 'all' || type === 'warehouse') {
      const warehouseItems = await prisma.warehouseItem.findMany({
        where: { createdAt: { gte: start, lte: end } },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      for (const w of warehouseItems) {
        items.push({
          source:        'warehouse',
          id:            w.id,
          name:          w.name,
          barcode:       w.barcode,
          unit:          w.unit,
          quantity:      w.quantity,
          purchasePrice: w.purchasePrice,
          salePrice:     (w as Record<string, unknown>).salePrice || 0,
          totalValue:    w.purchasePrice * w.quantity,
          description:   w.description,
          categoryId:    w.categoryId,
          supplierId:    w.supplierId,
          isTransferred: w.isTransferred,
          transferredAt: w.transferredAt,
          createdAt:     w.createdAt,
        });
      }
    }

    // Sanasi bo'yicha sort
    items.sort((a, b) => {
      const da = new Date((a as Record<string, unknown>).createdAt as string).getTime();
      const db = new Date((b as Record<string, unknown>).createdAt as string).getTime();
      return db - da;
    });

    return NextResponse.json({
      total:     items.length,
      from:      start.toISOString(),
      to:        end.toISOString(),
      type,
      items,
    });

  } catch (error) {
    console.error('Purchases report error:', error);
    const msg = error instanceof Error ? error.message : 'Server xatosi';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
