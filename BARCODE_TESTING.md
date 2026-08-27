# Shtrix Kod (Barcode) Scanner Test Yo'riqnomasi

## 🎯 Asosiy Funksiyalar

POS tizimida shtrix kod scanner **avtomatik** ishlaydi:
- Hardware scanner orqali shtrix kod skanerlanganda mahsulot **avtomatik ravishda** savatga qo'shiladi
- Hech qanday tugmani bosish yoki input maydoniga yozish kerak emas
- Scanner aktiv holati va ovozli signal bilan tasdiqlash

## 📦 Test Uchun Tayyor Mahsulotlar

### Ichimliklar
- **Coca Cola 1.5L** - `4820024700016` - 12,000 so'm
- **Pepsi 2L** - `4607046681014` - 13,000 so'm  
- **Choy Akbar 100g** - `4760146071024` - 18,000 so'm

### Oziq-ovqat
- **Non (Kulcha)** - `1234567890123` - 2,500 so'm
- **Tuxum (10 dona)** - `9876543210123` - 22,000 so'm
- **Sabzi 1kg** - `2000000000001` - 8,000 so'm

### Boshqa
- **Shampun Pantene** - `5000174416618` - 45,000 so'm
- **Samsung Galaxy A54** - `8806094908546` - 3,500,000 so'm

## 🔧 Qanday Ishlaydi?

### Scanner Hardware bilan
1. POS sahifasini oching (`/pos`)
2. Shtrix kod skanerini USB orqali ulang
3. Mahsulotning shtrix kodini skaner bilan o'qiting
4. ✅ Mahsulot **avtomatik** savatga qo'shiladi
5. 🔊 Success ovozi eshitiladi
6. 📊 O'ng tarafdagi savatda mahsulot ko'rinadi

### Keyboard orqali Test (Developement)
Agar scanner yo'q bo'lsa, keyboard orqali test qilish mumkin:
1. POS sahifasida bo'ling
2. Tez-tez barcode raqamlarini yozing (masalan: `4820024700016`)
3. `Enter` tugmasini bosing
4. Mahsulot savatga qo'shiladi

**MUHIM:** Keyboard orqali test qilganda raqamlarni **tez** yozish kerak (50ms dan kam interval), chunki tizim scanner va keyboard ni farqlaydi.

## 🎨 Visual Feedback

### Scanner Aktiv
```
┌─────────────────────────────────────┐
│ 🟢 Skaner aktiv: 4820024700016     │ (Yashil animatsiya)
└─────────────────────────────────────┘
```

### Success
- ✅ Mahsulot savatga qo'shiladi
- 🔊 Qisqa "beep" ovozi
- 📊 Savat elementlari yangilanadi

### Error
- ❌ Mahsulot topilmadi
- 🔊 Uzunroq past ovoz
- ⚠️ Console da ogohlantirish

## 💡 Ishlash Printsipi

### Avtomatik Aniqlash
Tizim quyidagicha ishlaydi:

1. **Har bir tugma bosilganda:**
   - Vaqt intervalini o'lchaydi (< 50ms = scanner)
   - Raqam yoki harfni bufferga qo'shadi
   
2. **Enter tugmasi bosilganda:**
   - Buffer uzunligi > 3 bo'lsa
   - API ga so'rov yuboriladi: `GET /api/products/barcode/{barcode}`
   - Mahsulot topilsa savatga qo'shiladi
   
3. **Timeout (500ms):**
   - Agar tugmalar sekin bosilsa (odatda keyboard)
   - Buffer tozalanadi

### Kategoriya Filterdan Qat'iy Nazar
- Savatga qo'shish **barcha kategoriyalarda** ishlaydi
- "Ichimliklar" tanllangan bo'lsa ham, "Oziq-ovqat" mahsulotini skaner qilish mumkin
- Filter faqat mahsulotlar gridini cheklaydi, savatga qo'shishni emas

## 🚀 Ishga Tushirish

### 1. Dependencies O'rnatish
```bash
cd gem-pos
npm install
```

### 2. Development Server
```bash
npm run dev
```

### 3. Browserda Ochish
```
http://localhost:3000/pos
```

## 🛠️ Muammolarni Hal Qilish

### Scanner ishlamayapti?
1. Scanner to'g'ri ulanganligini tekshiring (USB)
2. Scanner "Enter" tugmasini barcode oxirida yuboradimi? (ko'pchilik scannerlar default yuboradi)
3. Browser konsolni tekshiring (F12) - xatolar bor mi?

### Mahsulot topilmayapti?
1. Barcode to'g'ri kiritilganligini tekshiring
2. `/api/products/barcode/{barcode}` endpoint ishlaganligini tekshiring
3. Mock datada mavjudligini tekshiring

### Scanner juda tez yoki sekin?
`page.tsx` faylida `timeDiff < 50` qiymatini o'zgartiring:
- **50ms** - standart scanner uchun
- **100ms** - sekinroq scanner uchun
- **30ms** - juda tez scanner uchun

## 📝 Qo'shimcha Imkoniyatlar

### Savat Boshqaruvi
- ➕ Miqdorni oshirish (Plus tugmasi)
- ➖ Miqdorni kamaytirish (Minus tugmasi)
- 🗑️ Mahsulotni o'chirish (Trash icon)
- 🧹 Butun savatni tozalash ("Tozalash" tugmasi)

### To'lov
- 💵 Naqd
- 💳 Karta
- 🔀 Aralash (Naqd + Karta)

### Qaytim Hisoblash
Naqd to'lovda avtomatik qaytim hisoblanadi.

## 🔐 Xavfsizlik

- ✅ To'lov summasi validatsiyasi
- ✅ Zaxira tekshiruvi
- ✅ Mahsulot mavjudligi tekshiruvi
- ✅ To'lov turi validatsiyasi

---

**Demo Mode:** Hozirda tizim mock data bilan ishlaydi. Real database (Prisma) ga ulanish uchun API route.ts fayllaridagi kommentariyalangan qismlarni aktivlashtiring.
