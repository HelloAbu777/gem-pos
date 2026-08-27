# GEM POS - Tezkor O'rnatish Bo'yicha Qo'llanma

## ⚠️ Muhim: npm install muammosi hal qilish

Agar `npm install` juda sekin ishlasa yoki timeout bo'lsa, quyidagilarni bajaring:

### Variant 1: npm cache tozalash va qayta urinish
```powershell
# 1. npm cache'ni tozalash
npm cache clean --force

# 2. node_modules va package-lock.json o'chirish
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item package-lock.json -ErrorAction SilentlyContinue

# 3. Qayta o'rnatish
npm install --verbose
```

### Variant 2: Yarn ishlatish (tezroq)
```powershell
# 1. Yarn o'rnatish
npm install -g yarn

# 2. Dependencies o'rnatish
yarn install
```

### Variant 3: pnpm ishlatish (eng tez)
```powershell
# 1. pnpm o'rnatish
npm install -g pnpm

# 2. Dependencies o'rnatish
pnpm install
```

## 🚀 To'liq O'rnatish Jarayoni

### 1-Qadam: Dependencies o'rnatish
```powershell
cd "c:\Users\user\Desktop\BAR KASSA\gem-pos"

# Eng yaxshi variant - pnpm
npm install -g pnpm
pnpm install
```

### 2-Qadam: Prisma sozlash
```powershell
# Prisma Client generatsiya qilish
npx prisma generate

# Database yaratish (PostgreSQL'da)
# psql ni ochinghttps://www.postgresql.org/docs/
```

### 3-Qadam: Database migration
```powershell
# PostgreSQL ga ulanish
psql -U postgres

# Database yaratish
CREATE DATABASE gem_pos;

# Chiqish
\q

# Migration qilish
npx prisma db push

# Seed (birinchi admin yaratish)
npx tsx prisma/seed.ts
```

### 4-Qadam: Development server ishga tushirish
```powershell
npm run dev
# yoki
pnpm dev
# yoki
yarn dev
```

### 5-Qadam: Brauzerda ochish
```
http://localhost:3000
```

Login: **admin**  
Parol: **admin123**

## 🔧 Muammolarni hal qilish

### Muammo: "prisma command not found"
```powershell
npx prisma generate
```

### Muammo: "Can't reach database server"
PostgreSQL ishlamayapti, ishga tushiring:
```powershell
# PostgreSQL statusini tekshirish
Get-Service postgresql*

# Ishga tushirish
Start-Service postgresql-x64-18
```

### Muammo: "Module not found: jose"
```powershell
npm install jose
# yoki
pnpm add jose
```

### Muammo: TypeScript xatolari
```powershell
# node_modules qayta o'rnatish
Remove-Item -Recurse node_modules
pnpm install
```

## ✅ Tekshirish

Hammasi to'g'ri ishlab turganini tekshiring:

1. **Database**: Prisma Studio ochib ko'ring
   ```powershell
   npx prisma studio
   ```

2. **Login sahifasi**: http://localhost:3000/login

3. **Dashboard**: Login qilgandan keyin avtomatik ochiladi

4. **API**: http://localhost:3000/api/categories - bo'sh array qaytarishi kerak: `[]`

## 🎯 Keyingi Qadamlar

1. Login qiling (admin/admin123)
2. Kategoriyalar bo'limiga o'ting
3. Yangi kategoriya yarating (masalan: "Ichimliklar")
4. Mahsulotlar bo'limiga o'ting
5. Yangi mahsulot qo'shing

---

**Yordam kerak bo'lsa**, quyidagilarni tekshiring:
- PostgreSQL ishlayaptimi?
- .env fayl to'g'rimi?
- npm install to'liq o'tganmi?
