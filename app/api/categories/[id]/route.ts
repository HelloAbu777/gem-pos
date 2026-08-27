import { NextRequest, NextResponse } from 'next/server';

// DEMO MODE - In-memory categories storage
let categories = [
  { id: '1', name: 'Ichimliklar', _count: { products: 15 } },
  { id: '2', name: 'Oziq-ovqat', _count: { products: 32 } },
  { id: '3', name: 'Maishiy texnika', _count: { products: 8 } },
  { id: '4', name: 'Kosmetika', _count: { products: 21 } },
];

// PUT - Kategoriyani yangilash
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { name } = await request.json();
    const { id } = await params;

    const index = categories.findIndex(cat => cat.id === id);
    if (index === -1) {
      return NextResponse.json({ error: 'Kategoriya topilmadi' }, { status: 404 });
    }

    categories[index] = { ...categories[index], name };
    return NextResponse.json(categories[index]);
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

// DELETE - Kategoriyani o'chirish
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    categories = categories.filter(cat => cat.id !== id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
