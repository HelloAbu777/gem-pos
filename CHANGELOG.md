# Changelog

O'zgarishlar tarixi va versiya yangilanishlari.

## [1.0.0] - 2026-08-27

### ✨ Yangi Funksiyalar

#### 🔍 Shtrix Kod Scanner Tizimi
- **Avtomatik Scanner Aniqlash**: Hardware scanner va keyboard farqlash (< 50ms interval)
- **Real-time Barcode Qidiruv**: 50ms dan kam javob berish vaqti
- **Visual Feedback**: Skaner aktiv ko'rsatkichi va animatsiya
- **Audio Feedback**: Success (800Hz beep) va error (200Hz sawtooth) signallari
- **Kategoriyadan Mustaqil**: Har qanday kategoriyada bo'lgan mahsulotni skanerlash
- **Avtomatik Savatga Qo'shish**: Input maydonisiz to'g'ridan-to'g'ri savat

#### 💰 POS (Kassa) Tizimi
- **To'liq POS Interfeysi**: Mahsulotlar grid, savat, to'lov modali
- **3 Xil To'lov**: Naqd, Karta, Aralash
- **Avtomatik Qaytim**: Naqd to'lovda avtomatik hisoblash
- **Savat Boshqaruvi**: Miqdorni oshirish/kamaytirish, mahsulotni o'chirish
- **Real-time Yangilanish**: Zaxira holati real-time tekshiruvi

#### 🗄️ Database Integratsiya
- **Prisma ORM**: PostgreSQL bilan to'liq integratsiya
- **Transaction Safety**: Database transaction ichida sotuvlar
- **Avtomatik Zaxira Yangilash**: Sotuvda mahsulot miqdori kamayishi
- **Branch-specific**: Har bir filial o'z mahsulotlari bilan ishlaydi
- **Session-based Auth**: JWT session tekshiruvi barcha API da

#### 📊 Sales API
- **POST /api/sales**: Yangi sotuv yaratish
  - To'lov validatsiyasi (CASH/CARD/MIXED)
  - Zaxira tekshiruvi
  - Transaction safety
  - Avtomatik inventory update
- **GET /api/sales**: Sotuvlar tarixi
  - Pagination (limit, offset)
  - Date range filter
  - Branch-specific

#### 🔎 Barcode Search API
- **GET /api/products/barcode/[barcode]**: Barcode orqali qidirish
  - Tez qidiruv (indexed barcode field)
  - Zaxira validatsiyasi
  - Branch filtering
  - Category va Supplier include

#### 📦 Products API Enhancement
- **Session-based Filtering**: Faqat o'z filiali mahsulotlari
- **Role-based Access**: ADMIN faqat mahsulot qo'sha oladi
- **Barcode Uniqueness**: Takrorlanmaydigan shtrix kod
- **Automatic Margin**: Avtomatik marja hisoblash

### 🔧 Texnik O'zgarishlar

#### Database Schema
```prisma
Product {
  barcode String? @unique  // Shtrix kod (unique)
  quantity Float           // Zaxira miqdori
  branchId String          // Filial ID
}

Sale {
  paymentType PaymentType  // CASH, CARD, MIXED
  cashAmount Float?
  cardAmount Float?
  saleItems SaleItem[]
}
```

#### API Endpoints
- `GET /api/products` - Session-based products list
- `GET /api/products/barcode/[barcode]` - Barcode search (NEW)
- `POST /api/sales` - Create sale with transaction (NEW)
- `GET /api/sales` - Sales history with filters (NEW)

### 📚 Hujjatlar

- ✅ **README.md**: To'liq loyiha tavsifi
- ✅ **BARCODE_TESTING.md**: Batafsil test yo'riqnomasi
- ✅ **SHTRIX_KOD_QOSHISH.md**: Qisqa foydalanuvchi qo'llanmasi
- ✅ **DEPLOYMENT_GUIDE.md**: Vercel deployment yo'riqnomasi
- ✅ **CHANGELOG.md**: O'zgarishlar tarixi

### 🐛 Bug Fixes

- Fixed: `findUnique` with multiple where conditions → Changed to `findFirst`
- Fixed: Scanner detection timing (adjusted to 50ms threshold)
- Fixed: Audio context creation on user interaction
- Fixed: Transaction safety in sales creation

### 🔐 Xavfsizlik

- ✅ Session-based authentication on all POS APIs
- ✅ Branch-specific data filtering
- ✅ Role-based access control (ADMIN vs CASHIER)
- ✅ SQL injection prevention via Prisma
- ✅ Transaction safety for critical operations

### ⚡ Performance

- Indexed barcode field for fast search
- Optimized database queries with `include` and `select`
- Real-time UI updates without page reload
- Efficient state management with React hooks

### 🎯 Test Coverage

Test uchun barcode'lar:
- `4820024700016` - Coca Cola 1.5L (12,000 so'm)
- `1234567890123` - Non (2,500 so'm)
- `5000174416618` - Shampun Pantene (45,000 so'm)
- `9876543210123` - Tuxum 10 dona (22,000 so'm)
- `4607046681014` - Pepsi 2L (13,000 so'm)
- `2000000000001` - Sabzi 1kg (8,000 so'm)

### 📱 Compatibility

- ✅ Modern browsers (Chrome, Firefox, Safari, Edge)
- ✅ Hardware barcode scanners (USB HID)
- ✅ Keyboard barcode input (for testing)
- ✅ Mobile responsive design

### 🚀 Deployment Ready

- ✅ Vercel-optimized build configuration
- ✅ Environment variables documented
- ✅ Prisma migration setup
- ✅ Production database compatible (Neon/Supabase)

---

## Keyingi Versiyalar

### [1.1.0] - Rejalashtirilgan

- [ ] Offline mode support
- [ ] Receipt printing
- [ ] Multi-language support (UZ/RU/EN)
- [ ] Advanced analytics dashboard
- [ ] Customer management system
- [ ] Loyalty program integration

### [1.2.0] - Rejalashtirilgan

- [ ] Mobile app (React Native)
- [ ] Cloud synchronization
- [ ] Advanced reporting
- [ ] Inventory forecasting
- [ ] API webhooks

---

**Version Format**: MAJOR.MINOR.PATCH
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes and minor improvements
