import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'gem-pos-secret-key-2024-very-secure'
);

// Session 7 kun davom etadi
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 kun
const SESSION_DURATION_JWT     = '7d';

// Token qolgan muddati 1 kundan kam bo'lsa — yangilash
const REFRESH_THRESHOLD_SECONDS = 60 * 60 * 24; // 1 kun

export interface SessionData {
  userId:   string;
  login:    string;
  name:     string;
  role:     'SUPER_ADMIN' | 'ADMIN' | 'CASHIER';
  branchId: string | null;
  [key: string]: unknown;
}

export async function createSession(data: SessionData) {
  const token = await new SignJWT(data as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION_JWT)
    .sign(SECRET_KEY);

  (await cookies()).set('session', token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   SESSION_DURATION_SECONDS,
    path:     '/',
  });

  return token;
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as SessionData;
  } catch {
    return null;
  }
}

export async function deleteSession() {
  (await cookies()).delete('session');
}

// Tokenni yangilash — muddati tugashiga 1 kun qolsa
export async function refreshSessionIfNeeded(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    const exp = payload.exp as number | undefined;

    if (!exp) return null;

    const now           = Math.floor(Date.now() / 1000);
    const timeRemaining = exp - now;

    // Agar 1 kundan kam qolsa — yangi token yaratamiz
    if (timeRemaining < REFRESH_THRESHOLD_SECONDS) {
      const { exp: _exp, iat: _iat, ...data } = payload;
      void _exp; void _iat;

      const newToken = await new SignJWT(data)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(SESSION_DURATION_JWT)
        .sign(SECRET_KEY);

      return newToken;
    }

    return null; // Yangilash shart emas
  } catch {
    return null;
  }
}
