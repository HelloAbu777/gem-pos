# 🔍 Shtrix Kod Ishlashi - Qisqa Yo'riqnoma

## ✅ Tayyor!

POS tizimingizda shtrix kod scanner **to'liq avtomatik** ishlaydi!

## 🚀 Ishlatish

### 1. POS Sahifasini Oching
```
http://localhost:3000/pos
```

### 2. Scanner bilan Skanerlang
- Mahsulot shtrix kodini scanner bilan o'qiting
- Mahsulot **avtomatik** savatga tushadi
- ✅ Success ovozi eshitiladi
- 🟢 Skaner aktiv ko'rsatkichi chiqadi

### 3. To'lov
- Savatni tekshiring
- "To'lovni amalga oshirish" tugmasini bosing
- To'lov turini tanlang (Naqd / Karta / Aralash)
- Tasdiqlang

## 📦 Test Mahsulotlar

```
4820024700016  →  Coca Cola 1.5L      (12,000 so'm)
1234567890123  →  Non (Kulcha)        (2,500 so'm)
5000174416618  →  Shampun Pantene     (45,000 so'm)
9876543210123  →  Tuxum (10 dona)     (22,000 so'm)
```

## 🎯 Asosiy Afzalliklar

✅ **Avtomatik ishlaydi** - hech narsa bosish kerak emas  
✅ **Har qanday kategoriyada** - filter qo'yilgan bo'lsa ham  
✅ **Tez va aniq** - 50ms dan kam javob beradi  
✅ **Visual feedback** - skaner aktiv ko'rsatkichi  
✅ **Audio feedback** - success/error ovozlari  
✅ **Zaxira nazorati** - zaxirada yo'q mahsulotlarni qo'shmaydi  

## 🛠️ Ishga Tushirish (Birinchi Marta)

```bash
cd gem-pos
npm install
npm run dev
```

Keyin brauzerni oching: `http://localhost:3000/pos`

## ❓ Tez-tez So'raladigan Savollar

**Q: Scanner ishlmayapti?**  
A: USB ulanganligini va scanner "Enter" yuboradigan holatda ekanligini tekshiring.

**Q: Mahsulot topilmayapti?**  
A: Barcode to'g'ri ekanligini va mahsulotlar jadvalida borligini tekshiring.

**Q: Kategoriya filter ta'sir qiladi mi?**  
A: Yo'q! Scanner har qanday mahsulotni qo'shadi, kategoriyadan qat'iy nazar.

---

**Batafsil ma'lumot:** `BARCODE_TESTING.md` faylini o'qing
