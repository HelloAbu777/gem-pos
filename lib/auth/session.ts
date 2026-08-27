import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'gem-pos-secret-key-2024-very-secure'
);

export interface SessionData {
  userId: string;
  login: string;
  name: string;
  role: 'ADMIN' | 'CASHIER';
  branchId: string;
  [key: string]: unknown;
}

export async function createSession(data: SessionData) {
  const token = await new SignJWT(data as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(SECRET_KEY);

  (await cookies()).set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
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
  } catch (error) {
    console.error('Session verification failed:', error);
    return null;
  }
}

export async function deleteSession() {
  (await cookies()).delete('session');
}
