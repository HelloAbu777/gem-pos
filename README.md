# 💎 GEM POS - Point of Sale System

Modern, tez va foydalanish uchun qulay kassa tizimi. Shtrix kod scanner, real-time inventory, va to'liq boshqaruv paneli bilan.

## ✨ Asosiy Xususiyatlar

### 🔍 Shtrix Kod Scanner
- **Avtomatik Aniqlash** - Hardware scanner va keyboard farqlash
- **Real-time Qidiruv** - 50ms dan kam javob berish
- **Visual/Audio Feedback** - Success va error signallari
- **Kategoriyadan Mustaqil** - Har qanday mahsulotni skanerlash

### 💰 POS (Point of Sale)
- Tez va intuitiv interfeys
- 3 xil to'lov usuli: Naqd, Karta, Aralash
- Avtomatik qaytim hisoblash
- Real-time savat boshqaruvi

### 📦 Mahsulot Boshqaruvi
- To'liq CRUD operatsiyalar
- Kategoriyalar va taminotchilar
- Zaxira nazorati va ogohlantirishlar
- Barcode qidiruv va filter

### 📊 Dashboard
- Real-time statistika
- Sotuvlar tahlili
- Zaxira holati
- Tezkor ko'rsatkichlar

## 🚀 Tezkor Boshlash

### 1. O'rnatish

```bash
cd gem-pos
npm install
```

### 2. Environment Variables

`.env` faylini yarating:

```env
DATABASE_URL="postgresql://user:pass@localhost:5432/gem_pos"
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Database Setup

```bash
# Prisma migratsiya
npx prisma migrate dev

# Seed data (demo)
npx prisma db seed
```

### 4. Ishga Tushirish

```bash
npm run dev
```

Browser da oching: `http://localhost:3000`

## 🎯 Demo Login

- **Login:** `admin`
- **Parol:** `admin123`

## 📱 Sahifalar

- `/login` - Kirish sahifasi
- `/dashboard` - Asosiy dashboard
- `/pos` - Kassa (POS) - **Shtrix kod scanner**
- `/products` - Mahsulotlar ro'yxati
- `/products/categories` - Kategoriyalar

## 🔧 Texnologiyalar

- **Frontend:** Next.js 15, React 19, TailwindCSS
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** JWT (jose)
- **Icons:** Lucide React

## 📦 Test Barcode'lar

Shtrix kod scanner test qilish uchun:

```
4820024700016  →  Coca Cola 1.5L      (12,000 so'm)
1234567890123  →  Non (Kulcha)        (2,500 so'm)
5000174416618  →  Shampun Pantene     (45,000 so'm)
9876543210123  →  Tuxum (10 dona)     (22,000 so'm)
4607046681014  →  Pepsi 2L            (13,000 so'm)
```

## 📚 Hujjatlar

- **Shtrix Kod Test:** [BARCODE_TESTING.md](BARCODE_TESTING.md)
- **Tezkor Yo'riqnoma:** [SHTRIX_KOD_QOSHISH.md](SHTRIX_KOD_QOSHISH.md)
- **Setup Qo'llanma:** [SETUP.md](SETUP.md)
- **Deployment:** [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

## 🚀 Production ga Deploy

### Vercel (Tavsiya etiladi)

```bash
# Vercel CLI
npm i -g vercel
vercel login
vercel --prod
```

Yoki GitHub orqali:
1. Repository ni GitHub ga push qiling
2. [vercel.com](https://vercel.com) ga kiring
3. Import repository
4. Environment variables sozlang
5. Deploy!

Batafsil: [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

## 🔐 Xavfsizlik

- ✅ JWT based authentication
- ✅ HTTP-only cookies
- ✅ Secure session management
- ✅ Environment variables protection
- ✅ SQL injection prevention (Prisma)

## 📊 Database Schema

```prisma
User → Branch
Product → Category, Supplier, Branch
Sale → User (Cashier), Branch
SaleItem → Sale, Product
```

## 🛠️ Development

### Build

```bash
npm run build
```

### Production Server

```bash
npm run start
```

### Prisma Studio

```bash
npx prisma studio
```

## 📝 Scripts

```json
{
  "dev": "next dev",           // Development server
  "build": "next build",       // Production build
  "start": "next start",       // Production server
  "lint": "eslint"             // Code linting
}
```

## 🐛 Muammolarni Hal Qilish

### Scanner ishlamayapti?
1. Hardware scanner USB orqali ulangan bo'lishi kerak
2. Scanner "Enter" yuboradigan rejimda bo'lishi kerak
3. Browser console (F12) ni tekshiring

### Database connection xatosi?
1. PostgreSQL ishlayotganligini tekshiring
2. DATABASE_URL to'g'ri formatdaligini tekshiring
3. Database yaratilganligini tasdiqlang

### Build xatosi?
```bash
rm -rf .next node_modules
npm install
npm run build
```

## 🤝 Hissa Qo'shish

1. Fork qiling
2. Feature branch yarating (`git checkout -b feature/AmazingFeature`)
3. Commit qiling (`git commit -m 'Add some AmazingFeature'`)
4. Push qiling (`git push origin feature/AmazingFeature`)
5. Pull Request oching

## 📄 License

Bu loyiha shaxsiy foydalanish uchun mo'ljallangan.

## 👥 Muallif

**GEM POS System**

## 🎉 Minnatdorchilik

- Next.js jamoasiga
- Prisma jamoasiga
- Lucide Icons jamoasiga
- TailwindCSS jamoasiga

---

**Made with ❤️ for efficient business management**
