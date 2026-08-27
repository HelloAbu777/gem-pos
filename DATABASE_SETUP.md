# 🗄️ Database Setup Guide

Production database ni sozlash uchun to'liq yo'riqnoma.

---

## 🎯 Database Provider Tanlash

### 1. Vercel Postgres (Tavsiya - Eng Oson)

**Afzalliklar:**
- ✅ Vercel bilan native integration
- ✅ Avtomatik environment variables
- ✅ Serverless friendly
- ✅ Tez sozlash

**Narx:**
- Free tier: 256MB, 60 soatlik compute
- Pro: $20/oy dan boshlanadi

**Sozlash:**

1. Vercel dashboard → **Storage** → **Create Database**
2. **Postgres** ni tanlang
3. Database nomini kiriting: `gem-pos-db`
4. Region tanlang (eng yaqinini)
5. **Create** bosing

Environment variables avtomatik qo'shiladi:
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`

Prisma uchun `.env` da:
```env
DATABASE_URL="$(POSTGRES_PRISMA_URL)"
DIRECT_URL="$(POSTGRES_URL_NON_POOLING)"
```

---

### 2. Neon.tech (Tavsiya - Bepul va Yaxshi)

**Afzalliklar:**
- ✅ Generous free tier
- ✅ 512MB storage bepul
- ✅ Serverless Postgres
- ✅ Branching support

**Narx:**
- Free: 0.5GB storage, 3 projects
- Pro: $19/oy

**Sozlash:**

1. [console.neon.tech](https://console.neon.tech) ga o'ting
2. **New Project** → nom: `gem-pos`
3. Region tanlang
4. **Create Project**
5. Connection string ni nusxalang

Format:
```
postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
```

Vercel da environment variables:
```
DATABASE_URL=postgresql://user:pass@host.neon.tech/gem_pos?sslmode=require
DIRECT_URL=postgresql://user:pass@host.neon.tech/gem_pos?sslmode=require
```

---

### 3. Supabase (Full-featured)

**Afzalliklar:**
- ✅ Bepul tier
- ✅ Auth va Storage ham bor
- ✅ 500MB database bepul
- ✅ Real-time subscriptions

**Narx:**
- Free: 500MB database
- Pro: $25/oy

**Sozlash:**

1. [supabase.com](https://supabase.com) ga o'ting
2. **New Project** → `gem-pos`
3. Parol o'ylab toping (kuchli!)
4. **Settings** → **Database** → **Connection String**
5. **URI** ni tanlang (Prisma uchun)

Format:
```
postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres
```

---

### 4. Railway.app (Development Friendly)

**Afzalliklar:**
- ✅ Developer friendly
- ✅ $5 bepul credit
- ✅ Oson sozlash

**Sozlash:**

1. [railway.app](https://railway.app) ga o'ting
2. **New Project** → **Provision PostgreSQL**
3. **Variables** tab → `DATABASE_URL` ni ko'ring
4. Copy va Vercel ga qo'shing

---

## 🔧 Vercel ga Environment Variables Qo'shish

### Dashboard orqali:

1. Vercel → Project → **Settings**
2. **Environment Variables**
3. Quyidagilarni qo'shing:

```
Name: DATABASE_URL
Value: postgresql://user:pass@host/db?sslmode=require
Environment: Production, Preview, Development
```

```
Name: DIRECT_URL (agar Vercel Postgres yoki Neon bo'lsa)
Value: postgresql://user:pass@host/db?sslmode=require
Environment: Production
```

```
Name: NEXTAUTH_SECRET
Value: (openssl rand -base64 32 natijasi)
Environment: Production, Preview, Development
```

```
Name: NEXTAUTH_URL
Value: https://your-app.vercel.app
Environment: Production
```

---

## 🚀 Database Migration

### Vercel Deployment paytida avtomatik:

Vercel `build` command paytida Prisma generate avtomatik ishlaydi (`postinstall` hook).

Migration deploy qilish uchun:

1. **Local terminalda:**

```bash
# Production DATABASE_URL bilan
export DATABASE_URL="your_production_database_url"

# Migration deploy
npx prisma migrate deploy
```

2. **Yoki Vercel CLI:**

```bash
# Environment variables bilan
vercel env pull .env.production.local

# Migration
npx prisma migrate deploy --schema prisma/schema.prisma
```

---

## 📊 Seed Data (Demo)

Production database ga demo data qo'shish:

```bash
# Local
export DATABASE_URL="production_url"
npm run db:seed

# Yoki to'g'ridan-to'g'ri
npx tsx prisma/seed.ts
```

**Eslatma:** Production da real data bo'lsa, seed ishlatmang!

---

## 🔍 Database Management

### Prisma Studio

Local:
```bash
npx prisma studio
```

Production uchun:
```bash
# DATABASE_URL ni production ga o'rnating
DATABASE_URL="production_url" npx prisma studio
```

### Database Migrations

Yangi migration yaratish (development):
```bash
npx prisma migrate dev --name add_new_field
```

Production ga deploy:
```bash
npx prisma migrate deploy
```

Rollback (ehtiyotkorlik bilan!):
```bash
npx prisma migrate resolve --rolled-back MIGRATION_NAME
```

---

## 🔐 Xavfsizlik

### Connection String Protection

❌ **XATO:**
```
DATABASE_URL=postgresql://user:pass@host/db
```
Git da commit qilish!

✅ **TO'G'RI:**
```
DATABASE_URL=postgresql://user:pass@host/db
```
Faqat Vercel environment variables da!

### SSL Mode

Har doim SSL ishlatilsin (production):
```
?sslmode=require
```

### IP Whitelist

Ba'zi providerlar IP whitelist talab qiladi:

**Vercel uchun:**
- Vercel IPs dynamic
- Database providerda "Allow all IPs" yoqing (0.0.0.0/0)
- Yoki Vercel Postgres/Neon ishlatilsin (whitelist kerak emas)

---

## 📊 Connection Pooling

Serverless environmentlar uchun connection pooling muhim.

### Prisma Connection Pool

`schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")  // Pooled
  directUrl = env("DIRECT_URL")   // Direct (migrations uchun)
}
```

### Neon Pooling

Neon avtomatik pooling beradi:
```
postgresql://user:pass@host.neon.tech/db?sslmode=require
```

---

## 🐛 Troubleshooting

### Error: "Can't reach database server"

**Sabab:** Network yoki credentials xato

**Yechim:**
1. DATABASE_URL to'g'riligini tekshiring
2. Host name va port to'g'ri
3. User/password xatosiz
4. Database ochiq (IP whitelist)

### Error: "SSL connection required"

**Yechim:**
```
?sslmode=require
```
Connection stringga qo'shing

### Error: "Too many connections"

**Sabab:** Connection limit ga yetildi

**Yechim:**
1. Connection pooling yoqing
2. Database plan upgrade qiling
3. Prisma connection limit sozlang

---

## 📈 Monitoring

### Vercel Analytics

Vercel dashboard → **Analytics** → database queriesni monitoring

### Database Provider Dashboard

- **Neon:** Metrics tab
- **Supabase:** Reports
- **Vercel Postgres:** Usage tab

---

## 💾 Backup

### Automatic Backups

Ko'pchilik providerlar avtomatik backup qiladi:
- **Vercel Postgres:** Daily automatic
- **Neon:** Point-in-time recovery
- **Supabase:** Daily backups (Pro)

### Manual Backup

```bash
# PostgreSQL dump
pg_dump $DATABASE_URL > backup.sql

# Restore
psql $DATABASE_URL < backup.sql
```

---

## ✅ Production Checklist

Deploy qilishdan oldin:

- [ ] Database yaratildi
- [ ] DATABASE_URL Vercel da sozlandi
- [ ] NEXTAUTH_SECRET unique
- [ ] SSL mode yoqilgan
- [ ] Migration deploy qilindi
- [ ] Seed data qo'shildi (agar kerak bo'lsa)
- [ ] Connection test o'tdi
- [ ] Backup strategiya belgilandi

---

**Database tayyor! Deploy qilishingiz mumkin! 🚀**
