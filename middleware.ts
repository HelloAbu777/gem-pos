import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'gem-pos-secret-key-2024-very-secure'
);

const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/admin/clear-db',
  '/api/admin/migrate',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static asset va public path'larni o'tkazib yuborish
  if (
    PUBLIC_PATHS.some(p => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('session')?.value;

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    const role = payload.role as string;

    // Super Admin panel — faqat SUPER_ADMIN kirishi mumkin
    if (pathname.startsWith('/super-admin')) {
      if (role !== 'SUPER_ADMIN') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
      return NextResponse.next();
    }

    // Admin panel — SUPER_ADMIN kirishiga ruxsat yo'q (u o'z paneliga ega)
    if (
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/pos') ||
      pathname.startsWith('/products') ||
      pathname.startsWith('/dishes') ||
      pathname.startsWith('/warehouse') ||
      pathname.startsWith('/statistics') ||
      pathname.startsWith('/legal-entities')
    ) {
      if (role === 'SUPER_ADMIN') {
        return NextResponse.redirect(new URL('/super-admin/dashboard', request.url));
      }
    }

    return NextResponse.next();
  } catch {
    const loginUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('session');
    return response;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',],
};
