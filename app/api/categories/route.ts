import { NextRequest, NextResponse } from 'next/server';

// DEMO MODE - Mock categories
const mockCategories = [
  { id: '1', name: 'Ichimliklar', _count: { products: 15 } },
  { id: '2', name: 'Oziq-ovqat', _count: { products: 32 } },
  { id: '3', name: 'Maishiy texnika', _count: { products: 8 } },
  { id: '4', name: 'Kosmetika', _count: { products: 21 } },
];

let categories = [...mockCategories];

// GET - Barcha kategoriyalar
export async function GET() {
  return NextResponse.json(categories);
}

// POST - Yangi kategoriya yaratish
export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Kategoriya nomi talab qilinadi' },
        { status: 400 }
      );
    }

    const newCategory = {
      id: Date.now().toString(),
      name,
      _count: { products: 0 },
    };

    categories.push(newCategory);
    return NextResponse.json(newCategory, { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { error: 'Server xatosi' },
      { status: 500 }
    );
  }
}
