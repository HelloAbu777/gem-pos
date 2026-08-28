'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, ShoppingCart, Trash2, Plus, Minus,
  CreditCard, Banknote, Layers, CheckCircle,
  X, Clock, ChevronDown, ReceiptText, Package, UtensilsCrossed,
} from 'lucide-react';

/* ── Types ───────────────────────────────────────────────────── */
interface Product {
  id: string; name: string; barcode?: string;
  salePrice: number; purchasePrice: number;
  quantity: number; minQuantity: number; unit: string;
  category: { id: string; name: string };
}
interface Dish {
  id: string; name: string; price: number;
  barcode?: string | null; isActive: boolean;
}
interface Category { id: string; name: string }
interface CartItem {
  cartKey: string; type: 'product' | 'dish'; refId: string;
  name: string; salePrice: number; purchasePrice: number;
  stockQty: number; unit: string; qty: number;
}
interface SaleHistoryItem {
  id: string; totalAmount: number; paymentType: string;
  cashAmount: number; cardAmount: number; createdAt: string;
  cashier: { name: string };
  saleItems: { quantity: number; priceAtSale: number; itemName: string }[];
}
type PayType = 'CASH' | 'CARD' | 'MIXED';
type MainTab  = 'pos' | 'history';

/* ── Helpers ─────────────────────────────────────────────────── */
const fmt = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(n));
const fmtTime = (d: string) => new Date(d).toLocaleString('uz-UZ', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
});
const PAY_LABELS: Record<PayType, string> = { CASH: 'Naqd', CARD: 'Karta', MIXED: 'Aralash' };
const DISHES_CAT = '__dishes__';
const DISHES_CAT = '__dishes__';

function beep(ok: boolean) {
  try {
    const ctx  = new (window.AudioContext || (window as unknown as {webkitAudioContext: typeof AudioContext}).webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = ok ? 880 : 220;
    osc.type = ok ? 'sine' : 'sawtooth';
    gain.gain.value = 0.2;
    osc.start(); osc.stop(ctx.currentTime + (ok ? 0.1 : 0.2));
  } catch { /* silent */ }
}

/* ── Scan Feedback ───────────────────────────────────────────── */
function ScanFeedback({ item, onHide }: {
  item: { name: string; type: 'product' | 'dish' | 'notfound'; code: string } | null;
  onHide: () => void;
}) {
  useEffect(() => { if (!item) return; const t = setTimeout(onHide, 2000); return () => clearTimeout(t); }, [item, onHide]);
  if (!item) return null;
  const ok = item.type !== 'notfound';
  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-white font-semibold text-sm animate-bounce ${ok ? 'bg-green-600' : 'bg-red-600'}`}>
      {ok
        ? <><CheckCircle className="w-5 h-5 flex-shrink-0" />{item.type === 'dish' ? '🍽' : '📦'} {item.name} — savatga qo&apos;shildi</>
        : <><X className="w-5 h-5 flex-shrink-0" /> &quot;{item.code}&quot; — topilmadi</>}
    </div>
  );
}

/* ── Receipt Modal ───────────────────────────────────────────── */
function ReceiptModal({ sale, onClose }: {
  sale: { totalAmount: number; paymentType: string; cashAmount: number; cardAmount: number; items: CartItem[] };
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="bg-green-500 px-6 py-8 text-center text-white">
          <CheckCircle className="w-14 h-14 mx-auto mb-3" />
          <h2 className="text-2xl font-bold">Sotuv amalga oshdi!</h2>
        </div>
        <div className="p-5 space-y-4">
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {sale.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="flex items-center gap-1.5 text-gray-600 flex-1 mr-2 truncate">
                  {item.type === 'dish' ? <UtensilsCrossed className="w-3 h-3 text-orange-400 flex-shrink-0" /> : <Package className="w-3 h-3 text-gray-400 flex-shrink-0" />}
                  {item.name} × {item.qty}
                </span>
                <span className="font-semibold text-gray-900 flex-shrink-0">{fmt(item.salePrice * item.qty)} so'm</span>
              </div>
            ))}
          </div>
          <div className="border-t border-dashed pt-3 space-y-1.5">
            <div className="flex justify-between font-bold text-lg"><span>Jami</span><span>{fmt(sale.totalAmount)} so'm</span></div>
            <div className="flex justify-between text-sm text-gray-500"><span>To'lov</span><span className="font-medium">{PAY_LABELS[sale.paymentType as PayType]}</span></div>
            {sale.paymentType === 'MIXED' && (
              <>
                <div className="flex justify-between text-sm text-gray-400"><span>Naqd</span><span>{fmt(sale.cashAmount)} so'm</span></div>
                <div className="flex justify-between text-sm text-gray-400"><span>Karta</span><span>{fmt(sale.cardAmount)} so'm</span></div>
              </>
            )}
          </div>
          <button onClick={onClose} className="w-full py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800">Yangi sotuv</button>
        </div>
      </div>
    </div>
  );
}

/* ── Payment Modal ───────────────────────────────────────────── */
function PaymentModal({ total, onConfirm, onClose, processing }: {
  total: number; onConfirm: (t: PayType, c: number, k: number) => void;
  onClose: () => void; processing: boolean;
}) {
  const [payType, setPay]  = useState<PayType>('CASH');
  const [cashAmt, setCash] = useState('');
  const [cardAmt, setCard] = useState('');
  const [err, setErr]      = useState('');
  const cn = Number(cashAmt) || 0;
  const kn = Number(cardAmt) || 0;

  const handleCash = (v: string) => {
    setCash(v);
    if (payType === 'MIXED') setCard(String(Math.max(0, total - (Number(v) || 0))));
    setErr('');
  };
  const submit = () => {
    setErr('');
    if (payType === 'CASH') { if (cn < total) { setErr('Naqd yetarli emas'); return; } onConfirm('CASH', total, 0); }
    else if (payType === 'CARD') { onConfirm('CARD', 0, total); }
    else { if (Math.abs(cn + kn - total) > 1) { setErr(`Naqd+Karta=${fmt(cn+kn)}, jami ${fmt(total)}`); return; } onConfirm('MIXED', cn, kn); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="bg-gray-900 px-6 py-5 flex justify-between items-center">
          <div><p className="text-sm text-gray-400">To'lov summasi</p><p className="text-3xl font-bold text-white">{fmt(total)} so'm</p></div>
          <button onClick={onClose} disabled={processing} className="p-2 hover:bg-gray-700 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {(['CASH','CARD','MIXED'] as PayType[]).map(t => (
              <button key={t} onClick={() => { setPay(t); setErr(''); setCash(''); setCard(''); }}
                className={`py-3 rounded-xl font-semibold text-sm flex flex-col items-center gap-1.5 ${payType===t?'bg-gray-900 text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {t==='CASH'&&<Banknote className="w-5 h-5"/>}{t==='CARD'&&<CreditCard className="w-5 h-5"/>}{t==='MIXED'&&<Layers className="w-5 h-5"/>}
                {PAY_LABELS[t]}
              </button>
            ))}
          </div>
          {payType==='CASH'&&(
            <div className="space-y-3">
              <input type="number" value={cashAmt} onChange={e=>handleCash(e.target.value)} placeholder={String(total)} autoFocus
                className="w-full px-4 py-3 text-xl border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 outline-none font-bold"/>
              {cn>=total&&<div className="flex justify-between px-4 py-3 bg-green-50 text-green-700 rounded-xl font-semibold"><span>Qaytim</span><span>{fmt(cn-total)} so'm</span></div>}
            </div>
          )}
          {payType==='CARD'&&(
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
              <CreditCard className="w-8 h-8 text-blue-500 mx-auto mb-2"/>
              <p className="text-blue-700 font-semibold text-lg">{fmt(total)} so'm</p>
            </div>
          )}
          {payType==='MIXED'&&(
            <div className="space-y-3">
              <div><label className="text-sm font-medium text-gray-600 mb-1 block">Naqd</label>
                <input type="number" value={cashAmt} onChange={e=>handleCash(e.target.value)} placeholder="0" autoFocus
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 outline-none font-bold text-lg"/>
              </div>
              <div><label className="text-sm font-medium text-gray-600 mb-1 block">Karta</label>
                <input type="number" value={cardAmt} onChange={e=>{setCard(e.target.value);setErr('');}} placeholder="0"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 outline-none font-bold text-lg"/>
              </div>
              <div className={`flex justify-between px-4 py-2.5 rounded-xl text-sm font-medium ${Math.abs(cn+kn-total)<1?'bg-green-50 text-green-700':'bg-gray-50 text-gray-600'}`}>
                <span>Jami</span><span>{fmt(cn+kn)} / {fmt(total)} so'm</span>
              </div>
            </div>
          )}
          {err&&<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{err}</div>}
          <button onClick={submit} disabled={processing}
            className="w-full py-4 bg-green-600 text-white rounded-xl font-bold text-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {processing?<><svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>Saqlanmoqda...</>:<><CheckCircle className="w-5 h-5"/>Tasdiqlash</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── MAIN POS ────────────────────────────────────────────────── */
export default function PosPage() {
  const [mainTab,      setMainTab]      = useState<MainTab>('pos');
  const [products,     setProducts]     = useState<Product[]>([]);
  const [categories,   setCategories]   = useState<Category[]>([]);
  const [dishes,       setDishes]       = useState<Dish[]>([]);
  const [loadingProd,  setLoadingProd]  = useState(true);
  const [search,       setSearch]       = useState('');
  const [catFilter,    setCatFilter]    = useState('all');
  const [cart,         setCart]         = useState<CartItem[]>([]);
  const [showPay,      setShowPay]      = useState(false);
  const [processing,   setProcessing]   = useState(false);
  const [receipt,      setReceipt]      = useState<{totalAmount:number;paymentType:string;cashAmount:number;cardAmount:number;items:CartItem[]}|null>(null);
  const [history,      setHistory]      = useState<SaleHistoryItem[]>([]);
  const [histTotal,    setHistTotal]    = useState(0);
  const [loadingHist,  setLoadingHist]  = useState(false);
  const [expandedId,   setExpandedId]   = useState<string|null>(null);
  const [scanFeedback, setScanFeedback] = useState<{name:string;type:'product'|'dish'|'notfound';code:string}|null>(null);

  const searchRef  = useRef<HTMLInputElement>(null);
  // Scanner refs — React state'siz, tezkor
  const scanBuf    = useRef('');
  const scanTimer  = useRef<ReturnType<typeof setTimeout>|null>(null);
  const lastTime   = useRef(0);
  const isScanner  = useRef(false);

  /* ── Fetch ── */
  const fetchAll = useCallback(async () => {
    setLoadingProd(true);
    try {
      const [pr, cr, dr] = await Promise.all([
        fetch('/api/products').then(r=>r.json()),
        fetch('/api/categories').then(r=>r.json()),
        fetch('/api/dishes').then(r=>r.json()),
      ]);
      setProducts(Array.isArray(pr) ? pr : []);
      setCategories(Array.isArray(cr) ? cr : []);
      setDishes(Array.isArray(dr) ? dr.filter((d:Dish)=>d.isActive) : []);
    } finally { setLoadingProd(false); }
  }, []);

  const fetchHistory = useCallback(async () => {
    setLoadingHist(true);
    try {
      const r = await fetch('/api/sales/history?limit=50');
      const d = await r.json();
      setHistory(d.sales ?? []); setHistTotal(d.total ?? 0);
    } finally { setLoadingHist(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { if (mainTab==='history') fetchHistory(); }, [mainTab, fetchHistory]);

  /* ── Cart ── */
  const addProduct = useCallback((p: Product) => {
    if (p.quantity <= 0) return;
    const key = `product-${p.id}`;
    setCart(prev => {
      const ex = prev.find(i=>i.cartKey===key);
      if (ex) { if (ex.qty>=p.quantity) return prev; return prev.map(i=>i.cartKey===key?{...i,qty:i.qty+1}:i); }
      return [...prev, {cartKey:key,type:'product',refId:p.id,name:p.name,salePrice:p.salePrice,purchasePrice:p.purchasePrice,stockQty:p.quantity,unit:p.unit,qty:1}];
    });
  }, []);

  const addDish = useCallback((d: Dish) => {
    const key = `dish-${d.id}`;
    setCart(prev => {
      const ex = prev.find(i=>i.cartKey===key);
      if (ex) return prev.map(i=>i.cartKey===key?{...i,qty:i.qty+1}:i);
      return [...prev, {cartKey:key,type:'dish',refId:d.id,name:d.name,salePrice:d.price,purchasePrice:0,stockQty:Infinity,unit:'porsiya',qty:1}];
    });
  }, []);

  const updateQty = (key: string, delta: number) => {
    setCart(prev => prev.map(i=>i.cartKey===key?{...i,qty:i.qty+delta}:i).filter(i=>i.qty>0));
  };

  /* ── BARCODE SCANNER ─────────────────────────────────────────
   *
   * Muammo: USB skaner harflarni JUDA TEZDA yuboradi (~5-30ms interval).
   * Oddiy klaviatura esa sekin (~100-500ms).
   *
   * Yechim:
   *  1. Birinchi harf kelganda — buffer'ga qo'sh, vaqtni yozib ol.
   *  2. Ikkinchi harf <60ms ichida kelsa → SKANER aniqlandI:
   *     isScanner=true, keydownning defaultini prevent qil
   *  3. Enter kelganda va isScanner=true → qidirish
   *  4. 400ms o'tsa harf kelmasa → buffer tozala, isScanner=false
   *
   * BU YONDASHUV: Search input ga yozilishini to'xtatmaydi (foydalanuvchi
   * qo'lda yoza oladi), lekin skaner aniqlanganda preventDefault ishlaydi.
   ─────────────────────────────────────────────────────────────── */
  useEffect(() => {
    // Productsni ref'da saqlaymiz — closure muammosi bo'lmasin
    const productsRef = { current: products };
    const dishesRef   = { current: dishes };
    productsRef.current = products;
    dishesRef.current   = dishes;

    const processBarcode = (code: string) => {
      if (code.length < 3) return;
      // Mahsulot
      const prod = productsRef.current.find(p => p.barcode && p.barcode === code);
      if (prod) { addProduct(prod); setScanFeedback({name:prod.name,type:'product',code}); beep(true); return; }
      // Taom
      const dish = dishesRef.current.find(d => d.barcode && d.barcode === code && d.isActive);
      if (dish) { addDish(dish); setScanFeedback({name:dish.name,type:'dish',code}); beep(true); return; }
      // Topilmadi
      setScanFeedback({name:'',type:'notfound',code}); beep(false);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (showPay) return;

      const now = Date.now();
      const gap = now - lastTime.current;
      lastTime.current = now;

      if (e.key === 'Enter') {
        if (isScanner.current && scanBuf.current.length >= 3) {
          e.preventDefault();
          e.stopPropagation();
          const code = scanBuf.current;
          scanBuf.current = ''; isScanner.current = false;
          if (scanTimer.current) clearTimeout(scanTimer.current);
          processBarcode(code);
        }
        return;
      }

      if (e.key.length !== 1) return;

      // Birinchi harf yoki davom
      if (scanBuf.current.length === 0) {
        // Birinchi harf — hali bilmaymiz (skaner yoki klaviatura)
        scanBuf.current = e.key;
        isScanner.current = false;
        if (scanTimer.current) clearTimeout(scanTimer.current);
        scanTimer.current = setTimeout(() => { scanBuf.current = ''; isScanner.current = false; }, 400);
      } else {
        // Keyingi harf — gap tekshirish
        if (gap < 60) {
          // SKANER: juda tez keldi!
          isScanner.current = true;
          e.preventDefault();
          e.stopPropagation();
        }
        scanBuf.current += e.key;
        if (scanTimer.current) clearTimeout(scanTimer.current);
        scanTimer.current = setTimeout(() => { scanBuf.current = ''; isScanner.current = false; }, 400);
      }
    };

    // Capture phase — eng oldin ushlaymiz
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      if (scanTimer.current) clearTimeout(scanTimer.current);
    };
  }, [products, dishes, showPay, addProduct, addDish]);

  /* ── Sale ── */
  const confirmSale = async (payType: PayType, cashAmt: number, cardAmt: number) => {
    setProcessing(true);
    try {
      const items = cart.map(i => ({
        productId:   i.type==='product' ? i.refId : null,
        dishId:      i.type==='dish'    ? i.refId : null,
        itemName:    i.name, quantity: i.qty, priceAtSale: i.salePrice,
      }));
      const res  = await fetch('/api/sales', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({paymentType:payType, cashAmount:cashAmt, cardAmount:cardAmt, items}),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error||'Xatolik'); return; }
      setReceipt({totalAmount:cart.reduce((s,i)=>s+i.salePrice*i.qty,0), paymentType:payType, cashAmount:cashAmt, cardAmount:cardAmt, items:[...cart]});
      setShowPay(false); setCart([]); fetchAll();
    } finally { setProcessing(false); }
  };

  const cartTotal = cart.reduce((s,i)=>s+i.salePrice*i.qty, 0);
  const cartCount = cart.reduce((s,i)=>s+i.qty, 0);

  const q = search.toLowerCase();

  // "Taomlar" kategoriyasi tanlansa — faqat taomlar
  // Boshqa kategoriya tanlansa — faqat o'sha kategoriya mahsulotlari
  // "all" tanlansa — mahsulotlar + taomlar birga (unified list)
  const showOnlyDishes = catFilter === DISHES_CAT;
  const showAll        = catFilter === 'all';

  const filteredProds = showOnlyDishes ? [] : products.filter(p => {
    const matchSearch = !q || p.name.toLowerCase().includes(q) || (p.barcode?.toLowerCase().includes(q) ?? false);
    const matchCat    = showAll || p.category.id === catFilter;
    return matchSearch && matchCat;
  });

  // Taomlar: "all" da ham, "Taomlar" da ham ko'rinadi
  const filteredDishes = (showAll || showOnlyDishes)
    ? dishes.filter(d => !q || d.name.toLowerCase().includes(q) || (d.barcode?.toLowerCase().includes(q) ?? false))
    : [];

  /* ── Render ── */
  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">

      <ScanFeedback item={scanFeedback} onHide={()=>setScanFeedback(null)} />

      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center gap-4 flex-shrink-0">
        <h1 className="text-xl font-bold text-gray-900 hidden md:block">Kassa</h1>

        <div className="flex border border-gray-200 rounded-lg overflow-hidden">
          {(['pos','history'] as MainTab[]).map(t=>(
            <button key={t} onClick={()=>setMainTab(t)}
              className={`px-4 py-2 text-sm font-medium flex items-center gap-2 ${mainTab===t?'bg-gray-900 text-white':'bg-white text-gray-600 hover:bg-gray-50'}`}>
              {t==='pos'?<><ShoppingCart className="w-4 h-4"/>Kassa</>:<><Clock className="w-4 h-4"/>Tarix</>}
              {t==='history'&&histTotal>0&&mainTab!=='history'&&<span className="bg-gray-200 text-gray-700 px-1.5 rounded-full text-xs">{histTotal}</span>}
            </button>
          ))}
        </div>

        {mainTab==='pos'&&(
          <div className="flex-1 flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4"/>
              <input ref={searchRef} type="text" value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="Nomi yoki barkod..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 outline-none"/>
            </div>
            <select value={catFilter} onChange={e=>setCatFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-gray-900 outline-none">
              <option value="all">Barcha mahsulotlar</option>
              {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              {dishes.length>0&&<option value={DISHES_CAT}>🍽 Taomlar ({dishes.length})</option>}
            </select>
          </div>
        )}
      </div>

      {/* POS grid + cart */}
      {mainTab==='pos'&&(
        <div className="flex flex-1 overflow-hidden">
          {/* Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {loadingProd?(
              <div className="flex justify-center items-center h-full">
                <svg className="animate-spin w-8 h-8 text-gray-300" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
              </div>
            ):(filteredProds.length===0 && filteredDishes.length===0)?(
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Package className="w-12 h-12 mb-3 text-gray-200"/>
                <p>Mahsulot yoki taom topilmadi</p>
              </div>
            ):(
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">

                {/* Mahsulotlar */}
                {filteredProds.map(p=>{
                  const ic=cart.find(i=>i.cartKey===`product-${p.id}`);
                  const out=p.quantity<=0;
                  return(
                    <button key={`prod-${p.id}`} onClick={()=>addProduct(p)} disabled={out}
                      className={`relative bg-white border rounded-xl p-3 text-left hover:shadow-md active:scale-95 transition-all ${out?'opacity-40 cursor-not-allowed border-gray-200':ic?'border-gray-900 ring-1 ring-gray-900':'border-gray-200 hover:border-gray-400'}`}>
                      {ic&&<span className="absolute -top-2 -right-2 bg-gray-900 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">{ic.qty}</span>}
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mb-2.5 mx-auto"><Package className="w-5 h-5 text-gray-400"/></div>
                      <p className="text-xs font-semibold text-gray-900 line-clamp-2 text-center mb-1">{p.name}</p>
                      <p className="text-sm font-bold text-gray-900 text-center">{fmt(p.salePrice)}<span className="text-xs font-normal text-gray-400 ml-0.5">so'm</span></p>
                      <p className={`text-xs text-center mt-0.5 ${out?'text-red-500':p.quantity<=p.minQuantity?'text-orange-500':'text-gray-400'}`}>{out?'Tugagan':`${p.quantity} ${p.unit}`}</p>
                    </button>
                  );
                })}

                {/* Taomlar — mahsulotlar bilan birga */}
                {filteredDishes.map(d=>{
                  const ic=cart.find(i=>i.cartKey===`dish-${d.id}`);
                  return(
                    <button key={`dish-${d.id}`} onClick={()=>addDish(d)}
                      className={`relative bg-white border rounded-xl p-3 text-left hover:shadow-md active:scale-95 transition-all ${ic?'border-orange-400 ring-1 ring-orange-400':'border-gray-200 hover:border-orange-300'}`}>
                      {ic&&<span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">{ic.qty}</span>}
                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mb-2.5 mx-auto"><UtensilsCrossed className="w-5 h-5 text-orange-500"/></div>
                      <p className="text-xs font-semibold text-gray-900 line-clamp-2 text-center mb-1">{d.name}</p>
                      <p className="text-sm font-bold text-gray-900 text-center">{fmt(d.price)}<span className="text-xs font-normal text-gray-400 ml-0.5">so'm</span></p>
                      <p className="text-xs text-center mt-0.5 text-orange-500 font-medium">🍽 taom</p>
                    </button>
                  );
                })}

              </div>
            )}
          </div>

          {/* Cart */}
          <div className="w-80 xl:w-96 bg-white border-l border-gray-200 flex flex-col flex-shrink-0">
            <div className="px-4 py-3.5 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-gray-700"/>
                <span className="font-bold text-gray-900">Savat</span>
                {cartCount>0&&<span className="bg-gray-900 text-white text-xs font-bold px-2 py-0.5 rounded-full">{cartCount}</span>}
              </div>
              {cart.length>0&&<button onClick={()=>setCart([])} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700"><Trash2 className="w-3.5 h-3.5"/>Tozalash</button>}
            </div>
            <div className="flex-1 overflow-y-auto">
              {cart.length===0?(
                <div className="flex flex-col items-center justify-center h-full text-gray-300 py-10">
                  <ShoppingCart className="w-12 h-12 mb-3"/>
                  <p className="text-sm">Savat bo&apos;sh</p>
                  <p className="text-xs mt-1 text-gray-400">Mahsulot bosing yoki barkod skanerlang</p>
                </div>
              ):(
                <div className="divide-y divide-gray-100">
                  {cart.map(item=>(
                    <div key={item.cartKey} className="px-4 py-3 flex items-center gap-3">
                      <button onClick={()=>setCart(p=>p.filter(i=>i.cartKey!==item.cartKey))} className="text-gray-300 hover:text-red-500 flex-shrink-0"><X className="w-4 h-4"/></button>
                      <div className="flex-shrink-0">{item.type==='dish'?<UtensilsCrossed className="w-4 h-4 text-orange-400"/>:<Package className="w-4 h-4 text-gray-400"/>}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                        <p className="text-xs text-gray-400">{fmt(item.salePrice)} so'm</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button onClick={()=>updateQty(item.cartKey,-1)} className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100"><Minus className="w-3 h-3"/></button>
                        <span className="w-6 text-center text-sm font-bold">{item.qty}</span>
                        <button onClick={()=>updateQty(item.cartKey,1)} disabled={item.type==='product'&&item.qty>=item.stockQty} className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-30"><Plus className="w-3 h-3"/></button>
                      </div>
                      <div className="text-right flex-shrink-0 w-20">
                        <p className="text-sm font-bold text-gray-900">{fmt(item.salePrice*item.qty)}</p>
                        <p className="text-xs text-gray-400">so'm</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="border-t border-gray-200 p-4 space-y-3">
              {cart.length>0&&(
                <div className="flex justify-between text-xs bg-green-50 px-3 py-2 rounded-lg text-gray-500">
                  <span>Sof foyda</span>
                  <span className="font-semibold text-green-600">+{fmt(cart.reduce((s,i)=>s+(i.salePrice-i.purchasePrice)*i.qty,0))} so'm</span>
                </div>
              )}
              <div className="flex justify-between items-baseline">
                <span className="text-gray-600 font-medium">Jami</span>
                <span className="text-2xl font-bold text-gray-900">{fmt(cartTotal)} so'm</span>
              </div>
              <button onClick={()=>setShowPay(true)} disabled={cart.length===0}
                className="w-full py-4 bg-green-600 text-white rounded-xl font-bold text-lg hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                <ReceiptText className="w-5 h-5"/>Sotish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History */}
      {mainTab==='history'&&(
        <div className="flex-1 overflow-y-auto p-5">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-gray-900">Sotuvlar tarixi <span className="text-sm font-normal text-gray-500">({histTotal} ta)</span></h2>
              <button onClick={fetchHistory} className="text-sm border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 text-gray-600">Yangilash</button>
            </div>
            {loadingHist?(
              <div className="flex justify-center py-16"><svg className="animate-spin w-8 h-8 text-gray-400" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg></div>
            ):history.length===0?(
              <div className="py-16 text-center text-gray-400"><Clock className="w-10 h-10 mx-auto mb-3 text-gray-200"/><p>Sotuvlar tarixi yo&apos;q</p></div>
            ):(
              <div className="space-y-2">
                {history.map(sale=>{
                  const isExp=expandedId===sale.id;
                  const PC:Record<string,string>={CASH:'bg-green-100 text-green-700',CARD:'bg-blue-100 text-blue-700',MIXED:'bg-purple-100 text-purple-700'};
                  return(
                    <div key={sale.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                      <button onClick={()=>setExpandedId(isExp?null:sale.id)} className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 text-left">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900">{sale.saleItems.reduce((s,i)=>s+i.quantity,0)} ta element</p>
                          <p className="text-xs text-gray-400">{fmtTime(sale.createdAt)} · {sale.cashier?.name}</p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${PC[sale.paymentType]??'bg-gray-100 text-gray-600'}`}>{PAY_LABELS[sale.paymentType as PayType]??sale.paymentType}</span>
                        <div className="text-right flex-shrink-0"><p className="font-bold text-gray-900">{fmt(sale.totalAmount)}</p><p className="text-xs text-gray-400">so'm</p></div>
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExp?'rotate-180':''}`}/>
                      </button>
                      {isExp&&(
                        <div className="border-t border-gray-100 px-5 py-4 bg-gray-50 space-y-2">
                          {sale.saleItems.map((item,idx)=>(
                            <div key={idx} className="flex justify-between text-sm">
                              <span className="text-gray-600">{item.itemName||'—'} × {item.quantity}</span>
                              <span className="font-semibold">{fmt(item.priceAtSale*item.quantity)} so'm</span>
                            </div>
                          ))}
                          {sale.paymentType==='MIXED'&&(
                            <div className="pt-2 border-t border-gray-200 text-xs text-gray-500 space-y-1">
                              <div className="flex justify-between"><span>Naqd</span><span>{fmt(sale.cashAmount)} so'm</span></div>
                              <div className="flex justify-between"><span>Karta</span><span>{fmt(sale.cardAmount)} so'm</span></div>
                            </div>
                          )}
                          <div className="pt-2 border-t border-gray-200 flex justify-between font-bold text-sm"><span>Jami</span><span>{fmt(sale.totalAmount)} so'm</span></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {showPay&&<PaymentModal total={cartTotal} processing={processing} onConfirm={confirmSale} onClose={()=>setShowPay(false)}/>}
      {receipt&&<ReceiptModal sale={receipt} onClose={()=>{setReceipt(null);fetchAll();}}/>}
    </div>
  );
}
