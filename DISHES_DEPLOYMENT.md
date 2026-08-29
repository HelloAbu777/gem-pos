# Taomlar (Dishes) Deploy Qo'llanmasi

## ✅ Mahalliy (Local) Test

Localhost da taomlar muvaffaqiyatli ishlayapti:
- ✅ Dish modeli database ga qo'shildi
- ✅ 5 ta test taom qo'shildi (Palov, Shashlik, Lag'mon, Manti, Somsa)
- ✅ `/api/dishes` endpoint ishlayapti
- ✅ POS sahifasida mahsulotlar va taomlar birga ko'rinmoqda
- ✅ Taomlar to'q sariq (orange) rangli ko'rinadi
- ✅ Barcode scanner taomlar uchun ham ishlaydi

## 🚀 Production Deploy

### 1. Git Push (✅ BAJARILDI)
```bash
git add -A
git commit -m "feat: Add Dish model"
git push origin main
```

### 2. Vercel Deployment (⏳ KUTING)

Vercel avtomatik deploy qiladi. Bu 2-3 daqiqa vaqt oladi.

Deploy statusini tekshirish:
1. https://vercel.com/dashboard
2. Loyihangizni toping
3. "Deployments" tabini oching
4. Eng yangi deploy "Ready" bo'lishini kuting

### 3. Production Database Migration (‼️ MUHIM)

Vercel production database'da ham Dish modelini yaratish kerak:

**Variant A: Vercel Dashboard orqali**
1. Vercel Dashboard → Storage → Postgres
2. `.schema` tab ni oching
3. Quyidagi SQL ni bajaring:

```sql
CREATE TABLE "dishes" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "price" DOUBLE PRECISION NOT NULL,
  "barcode" TEXT UNIQUE,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**Variant B: Prisma migrate orqali**
```bash
# Production DATABASE_URL ni .env ga qo'shing
DATABASE_URL="postgres://vercel_production_url"
DIRECT_URL="postgres://vercel_direct_url"

# Migration
npx prisma migrate deploy
```

### 4. Test Taomlarni Production ga qo'shish

Production database ga test taomlar:

```sql
INSERT INTO "dishes" ("id", "name", "price", "barcode", "isActive", "createdAt", "updatedAt") VALUES
('dish-1', 'Palov', 25000, '4870022003305', true, NOW(), NOW()),
('dish-2', 'Shashlik', 30000, '4870022003312', true, NOW(), NOW()),
('dish-3', 'Lagmon', 20000, '4870022003329', true, NOW(), NOW()),
('dish-4', 'Manti', 18000, '4870022003336', true, NOW(), NOW()),
('dish-5', 'Somsa', 5000, '4870022003343', true, NOW(), NOW());
```

## 🔍 Tekshirish

Production tekshirish:
1. https://gem-pos.vercel.app/pos ga o'ting
2. "Barcha mahsulotlar" tanlang
3. To'q sariq (orange) taomlar ko'rinishi kerak
4. "🍽 Taomlar" kategoriyasini tanlang - faqat taomlar ko'rinadi
5. Barcode scanner bilan test qiling: `4870022003305` (Palov)

## 📊 Nima qo'shildi?

### Database
- `dishes` jadvali (model Dish)
- `barcode` ustuni (unique)
- `isActive` flag

### API
- `GET /api/dishes` - Barcha aktiv taomlarni olish

### Frontend
- Taomlar to'q sariq (orange) rangli
- "🍽 taom" badge
- UtensilsCrossed icon
- Mahsulotlar va taomlar bir gridda
- "Taomlar" kategoriya filtri

### Barcode Scanner
- Taomlar uchun barcode qo'llab-quvvatlash
- `4870022003305` - Palov
- `4870022003312` - Shashlik
- `4870022003329` - Lag'mon
- `4870022003336` - Manti
- `4870022003343` - Somsa

## ⚠️ Ehtiyot chorasi

Agar production da taomlar ko'rinmasa:

1. **Database tekshiring**: Dish jadvali mavjudmi?
2. **Migration bajaring**: `npx prisma migrate deploy`
3. **Test taomlar qo'shing**: Yuqoridagi SQL
4. **API test qiling**: `https://gem-pos.vercel.app/api/dishes`
5. **Cache tozalang**: Ctrl+Shift+R yoki Incognito mode
6. **Console tekshiring**: F12 → Console → Xatolar bormi?

## 📞 Yordam

Muammo bo'lsa:
- Vercel logs tekshiring
- Database connection tekshiring
- Environment variables to'g'rimi (DIRECT_URL)
