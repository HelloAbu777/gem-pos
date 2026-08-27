# 🚀 GEM POS - Production Deployment Guide

Bu yo'riqnomada loyihani Vercel ga deploy qilish jarayoni batafsil tushuntirilgan.

## 📋 Pre-Deployment Checklist

### 1. Kod Tayyorligi
- [ ] Barcha featurelar test qilindi
- [ ] TypeScript xatolari yo'q (`npm run build`)
- [ ] Environment variables to'g'ri sozlangan
- [ ] Database schema tayyor

### 2. Database Tayyorligi
- [ ] Production database yaratilgan (PostgreSQL)
- [ ] Database URL olingan
- [ ] Prisma migratsiya test qilindi

### 3. Git Repository
- [ ] GitHub/GitLab repositorysi yaratilgan
- [ ] Kod commit va push qilindi
- [ ] `.env` file `.gitignore` da

## 🗄️ Database Setup (Neon/Supabase)

### Neon (Tavsiya etiladi)

1. **[neon.tech](https://neon.tech)** ga kiring
2. Yangi project yarating
3. Database credentials ni oling:

```env
DATABASE_URL="postgresql://user:password@ep-xxx-xxx.region.neon.tech/gem_pos?sslmode=require"
DIRECT_URL="postgresql://user:password@ep-xxx-xxx.region.neon.tech/gem_pos?sslmode=require"
```

### Supabase

1. **[supabase.com](https://supabase.com)** ga kiring
2. Yangi project yarating
3. Database Settings → Connection string:

```env
DATABASE_URL="postgresql://postgres:[password]@db.xxx.supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:[password]@db.xxx.supabase.co:5432/postgres"
```

## 🚀 Vercel Deployment

### Method 1: Vercel Dashboard (Oson)

1. **[vercel.com](https://vercel.com)** ga kiring
2. "Add New" → "Project" bosing
3. GitHub repository ni import qiling
4. Project sozlamalari:

```
Framework Preset: Next.js
Root Directory: ./
Build Command: npm run build (yoki prisma generate && next build)
Output Directory: .next
```

5. **Environment Variables** ni qo'shing:

```env
# Database
DATABASE_URL="your-neon-or-supabase-url"
DIRECT_URL="your-direct-url"

# Authentication
NEXTAUTH_SECRET="generate-32-char-random-string"
NEXTAUTH_URL="https://your-domain.vercel.app"

# Node Environment
NODE_ENV="production"
```

6. **Deploy** bosing!

### Method 2: Vercel CLI

```bash
# 1. Vercel CLI o'rnatish
npm i -g vercel

# 2. Login
vercel login

# 3. Deploy
vercel --prod

# Environment variables CLI orqali
vercel env add DATABASE_URL
vercel env add NEXTAUTH_SECRET
vercel env add NEXTAUTH_URL
```

## 🔑 Environment Variables

### NEXTAUTH_SECRET yaratish

```bash
# Node.js bilan
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Yoki online
# https://generate-secret.vercel.app/32
```

### To'liq .env fayl

```env
# Database (Neon/Supabase)
DATABASE_URL="postgresql://user:pass@host:5432/gem_pos?sslmode=require"
DIRECT_URL="postgresql://user:pass@host:5432/gem_pos?sslmode=require"

# NextAuth
NEXTAUTH_SECRET="your-32-character-secret-key-here"
NEXTAUTH_URL="https://your-app.vercel.app"

# Node Environment
NODE_ENV="production"
```

## 📊 Prisma Migration (Production)

### Auto Migration (Vercel)

Vercel build jarayonida avtomatik:

```json
// package.json
{
  "scripts": {
    "build": "prisma generate && prisma migrate deploy && next build",
    "vercel-build": "prisma generate && prisma migrate deploy && next build"
  }
}
```

### Manual Migration

```bash
# Local dan production ga migrate
npx prisma migrate deploy --preview-feature

# Prisma Studio (production)
npx prisma studio --browser none
```

## 🌱 Seed Data (Ixtiyoriy)

Production uchun seed data:

```bash
# Local
npx prisma db seed

# Production (Vercel CLI orqali)
vercel env pull .env.production
npx prisma db seed
```

## 🔧 Build Command Optimizatsiya

`package.json` da:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && next build",
    "start": "next start",
    "postinstall": "prisma generate",
    "vercel-build": "prisma generate && prisma migrate deploy && next build"
  }
}
```

## 🚦 Deployment Tekshiruvi

### 1. Health Check

Deployment muvaffaqiyatli bo'lgandan keyin:

- ✅ Homepage yuklanadi (`/`)
- ✅ Login sahifasi ishlaydi (`/login`)
- ✅ Database connection ishlaydi
- ✅ API endpoints javob beradi

### 2. Scanner Test

POS sahifasida (`/pos`):
- ✅ Mahsulotlar ro'yxati ko'rinadi
- ✅ Barcode scanner ishlaydi
- ✅ Savatga qo'shish ishlaydi
- ✅ To'lov amalga oshadi

### 3. Performance

```bash
# Lighthouse test
npx lighthouse https://your-app.vercel.app

# yoki Chrome DevTools → Lighthouse
```

## 🐛 Common Issues

### Issue 1: Prisma Client Not Generated

**Error:** `@prisma/client did not initialize yet`

**Hal qilish:**
```json
// package.json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

### Issue 2: Database Connection Error

**Error:** `Can't reach database server`

**Hal qilish:**
1. DATABASE_URL to'g'ri formatdaligini tekshiring
2. SSL mode qo'shilganligini tekshiring (`?sslmode=require`)
3. Database firewall sozlamalarini tekshiring

### Issue 3: Build Timeout

**Error:** `Build exceeded maximum time`

**Hal qilish:**
```bash
# .vercelignore yarating
node_modules
.next
.git
*.log
```

### Issue 4: Environment Variables Not Working

**Hal qilish:**
1. Vercel Dashboard → Settings → Environment Variables
2. Production, Preview, Development ga alohida qo'shing
3. Redeploy qiling

## 📈 Post-Deployment

### 1. Domain Setup

Vercel Dashboard → Settings → Domains:
- Custom domain qo'shing
- DNS sozlamalarini yangilang

### 2. Analytics

```bash
# Vercel Analytics
npm i @vercel/analytics

# app/layout.tsx
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

### 3. Monitoring

- Vercel Dashboard → Analytics
- Error tracking
- Performance monitoring

### 4. Backup

Database backup strategiyasi:
- Neon: Avtomatik backups
- Supabase: Point-in-time recovery
- Manual: `pg_dump` scheduled jobs

## 🔄 Yangilanishlar Deploy Qilish

```bash
# 1. Kod o'zgartirishlar
git add .
git commit -m "feat: add new feature"

# 2. Push qiling
git push origin main

# 3. Vercel avtomatik deploy qiladi!
```

Yoki manual:
```bash
vercel --prod
```

## 🔐 Xavfsizlik

### Production Checklist

- [ ] Environment variables secure
- [ ] Database credentials yashirin
- [ ] CORS sozlangan
- [ ] Rate limiting qo'shilgan
- [ ] SSL/HTTPS faol
- [ ] Backup strategiyasi mavjud

### Rate Limiting (Ixtiyoriy)

```bash
npm i @upstash/ratelimit @upstash/redis
```

## 📞 Support

**Muammolar?**
- Vercel Docs: https://vercel.com/docs
- Prisma Docs: https://www.prisma.io/docs
- Next.js Docs: https://nextjs.org/docs

---

**Muvaffaqiyatli deployment!** 🎉
