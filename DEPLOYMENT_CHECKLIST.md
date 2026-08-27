# ✅ Production Deployment Checklist

Vercel ga deploy qilishdan oldin bu ro'yxatni tekshiring.

## 🔍 Pre-Deployment

### Code Quality
- [x] TypeScript xatolari yo'q (`npm run build`)
- [x] No diagnostic errors
- [x] All API endpoints tested
- [x] Database schema validated
- [x] Git repository initialized
- [x] Code committed to main branch

### Environment Variables
- [ ] DATABASE_URL tayyor (Neon/Supabase)
- [ ] DIRECT_URL tayyor
- [ ] NEXTAUTH_SECRET generated (32 chars)
- [ ] NEXTAUTH_URL production URL bilan
- [ ] `.env.production` file yaratilgan

### Database
- [ ] Production database yaratilgan
- [ ] Connection tested
- [ ] Prisma schema pushed
- [ ] Initial data seeded (optional)

### Documentation
- [x] README.md updated
- [x] DEPLOYMENT_GUIDE.md available
- [x] BARCODE_TESTING.md created
- [x] CHANGELOG.md maintained

## 🚀 Vercel Setup

### Step 1: GitHub Repository

```bash
# 1. GitHub da yangi repo yarating
# 2. Local repo ni ulangtiring

git remote add origin https://github.com/USERNAME/gem-pos.git
git push -u origin main
```

### Step 2: Vercel Project

1. [vercel.com](https://vercel.com) ga kiring
2. "Add New" → "Project"
3. GitHub repository ni import qiling
4. Framework: **Next.js** (auto-detected)

### Step 3: Environment Variables

Vercel Dashboard → Settings → Environment Variables:

```env
# Required
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
NEXTAUTH_SECRET=your-32-char-secret
NEXTAUTH_URL=https://your-domain.vercel.app
NODE_ENV=production
```

### Step 4: Build Settings

```
Framework Preset: Next.js
Build Command: npm run build
Output Directory: .next
Install Command: npm install
Development Command: npm run dev
```

### Step 5: Deploy

Click **"Deploy"** button!

## ✅ Post-Deployment Verification

### 1. Basic Functionality
- [ ] Homepage loads (`/`)
- [ ] Login page works (`/login`)
- [ ] Dashboard loads (`/dashboard`)
- [ ] Products page works (`/products`)
- [ ] POS page accessible (`/pos`)

### 2. POS System Tests
- [ ] Mahsulotlar ro'yxati ko'rinadi
- [ ] Kategoriya filter ishlaydi
- [ ] Qidiruv ishlaydi
- [ ] Manual mahsulot qo'shish (click)
- [ ] **Barcode scanner** ishlaydi ⭐
- [ ] Savatga qo'shish
- [ ] Miqdor o'zgartirish
- [ ] Savat tozalash
- [ ] To'lov modali (Naqd)
- [ ] To'lov modali (Karta)
- [ ] To'lov modali (Aralash)
- [ ] Sotuv muvaffaqiyatli bajariladi

### 3. API Endpoints
- [ ] `GET /api/products` - Works
- [ ] `GET /api/products/barcode/[code]` - Works ⭐
- [ ] `POST /api/sales` - Creates sale ⭐
- [ ] `GET /api/sales` - Returns history
- [ ] `GET /api/categories` - Works
- [ ] `GET /api/dashboard/stats` - Works

### 4. Authentication
- [ ] Login ishlaydi
- [ ] Session saqlanadi
- [ ] Logout ishlaydi
- [ ] Protected routes ishga tushadi
- [ ] API auth checks working

### 5. Database
- [ ] Database connection stable
- [ ] Queries executing successfully
- [ ] Transactions working (sales)
- [ ] Stock updates working
- [ ] Data persistence confirmed

## 🧪 Barcode Scanner Test

Production da test qilish:

1. POS sahifasiga kiring (`/pos`)
2. USB barcode scanner ulang
3. Test barcode'larni skanerlang:

```
4820024700016  →  Coca Cola 1.5L
1234567890123  →  Non (Kulcha)
5000174416618  →  Shampun Pantene
```

**Expected:**
- ✅ Visual indicator ("Skaner aktiv")
- ✅ Audio beep (success)
- ✅ Product added to cart automatically
- ✅ No manual input required

## 📊 Performance Checks

### Lighthouse Audit
```bash
npx lighthouse https://your-app.vercel.app
```

**Target Scores:**
- Performance: > 80
- Accessibility: > 90
- Best Practices: > 90
- SEO: > 90

### Page Load Times
- Homepage: < 2s
- POS Page: < 3s
- API Response: < 500ms
- Barcode Search: < 100ms

## 🔐 Security Verification

- [ ] HTTPS enforced
- [ ] Environment variables secure
- [ ] No secrets in client code
- [ ] Session cookies HTTP-only
- [ ] CORS configured properly
- [ ] SQL injection protected (Prisma)
- [ ] XSS protection enabled

## 🐛 Common Issues & Solutions

### Issue 1: Build Failed
**Check:**
- package.json scripts
- TypeScript errors
- Missing dependencies

**Fix:**
```bash
npm run build  # Test locally
```

### Issue 2: Database Connection
**Check:**
- DATABASE_URL format
- SSL mode (`?sslmode=require`)
- Database firewall rules

**Fix:**
Test connection locally with production URL

### Issue 3: Prisma Client
**Error:** `@prisma/client not generated`

**Fix:**
```json
{
  "scripts": {
    "postinstall": "prisma generate",
    "build": "prisma generate && next build"
  }
}
```

### Issue 4: Scanner Not Working
**Check:**
- Browser console for errors
- Network tab for API calls
- Device compatibility

**Debug:**
```javascript
// POS page console
console.log('Barcode buffer:', barcodeBuffer)
console.log('Last keypress:', lastKeypressRef.current)
```

## 📈 Monitoring

### Vercel Dashboard
- [ ] Deployment successful
- [ ] No errors in logs
- [ ] API requests successful
- [ ] Resource usage normal

### Error Tracking
- Check Vercel Logs for errors
- Monitor API endpoint failures
- Watch database connection issues

## 🔄 Continuous Deployment

### Automatic Deploy
```bash
# Any push to main triggers deploy
git add .
git commit -m "fix: update feature"
git push origin main
```

### Manual Deploy
```bash
vercel --prod
```

## 📞 Support Resources

- **Vercel Docs**: https://vercel.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Prisma Docs**: https://prisma.io/docs
- **PostgreSQL Docs**: https://postgresql.org/docs

---

## 🎉 Deployment Complete!

Agar barcha checklar ✅ bo'lsa, tizim production ga tayyor!

**POS URL**: `https://your-domain.vercel.app/pos`

Test barcode scanner, to'lovlarni amalga oshiring va ishlab chiqing! 🚀
