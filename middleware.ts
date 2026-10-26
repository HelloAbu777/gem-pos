import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'gem-pos-secret-key-2024-very-secure'
);

const SESSION_DURATION     = '7d';
const SESSION_MAX_AGE      = 60 * 60 * 24 * 7;       // 7 kun (seconds)
const REFRESH_THRESHOLD    = 60 * 60 * 24;            // 1 kun qolsa yangilash

const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/admin/clear-db',
  '/api/admin/migrate',
  '/api/admin/fix-branchid',
  '/api/admin/reset-super',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static asset va public path
  if (
    PUBLIC_PATHS.some(p => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/icons') ||
    pathname.startsWith('/sw.js') ||
    pathname.startsWith('/manifest.json') ||
    pathname.startsWith('/offline')
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

    // Super Admin panel — faqat SUPER_ADMIN
    if (pathname.startsWith('/super-admin')) {
      if (role !== 'SUPER_ADMIN') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }

    // Admin panel — SUPER_ADMIN o'z paneliga
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

    // Auto-refresh: token muddati 1 kundan kam qolsa — yangilash
    const exp = payload.exp as number | undefined;
    const now = Math.floor(Date.now() / 1000);

    if (exp && (exp - now) < REFRESH_THRESHOLD) {
      // Eski payload dan yangi token yaratamiz
      const { exp: _e, iat: _i, ...data } = payload;
      void _e; void _i;

      const newToken = await new SignJWT(data)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(SESSION_DURATION)
        .sign(SECRET_KEY);

      const response = NextResponse.next();
      response.cookies.set('session', newToken, {
        httpOnly: true,
        secure:   process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge:   SESSION_MAX_AGE,
        path:     '/',
      });
      return response;
    }

    return NextResponse.next();
  } catch (err) {
    // Token xato turini aniqlaymiz
    const errMsg = err instanceof Error ? err.message : String(err);
    
    // Faqat expire bo'lganda login'ga yuboramiz
    // Boshqa xatolarda (JWSInvalid, encoding muammo) — o'tkazib yuboramiz
    if (
      errMsg.includes('expired') ||
      errMsg.includes('JWTExpired') ||
      errMsg.includes('exp claim')
    ) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('session');
      return response;
    }

    // Boshqa JWT xatolari — next() bilan o'tkazib yuboramiz
    // (session tekshirib bo'lmagan bo'lsa ham sahifaga kirishga ruxsat)
    return NextResponse.next();
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',],
};
