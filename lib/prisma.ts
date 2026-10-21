import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Vercel serverless uchun connection_limit=1 — har function instance bitta connection
// pool_timeout=10 — 10s dan keyin connection olinmasa xato
const getDatabaseUrl = () => {
  const url = process.env.DATABASE_URL ?? '';
  // pgbouncer va connection_limit allaqachon URL'da bo'lsa — qo'shmaymiz
  if (!url || url.includes('connection_limit')) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}connection_limit=5&pool_timeout=10`;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: { url: getDatabaseUrl() },
    },
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
} else {
  globalForPrisma.prisma = prisma;
}
