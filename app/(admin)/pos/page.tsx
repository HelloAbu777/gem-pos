'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Search, ShoppingCart, Trash2, Plus, Minus,
  CreditCard, Banknote, Layers, CheckCircle,
  X, Clock, ChevronDown, ReceiptText, Package, UtensilsCrossed, Building2,
  RefreshCw, Menu,
} from 'lucide-react';

/* ── Types ───────────────────────────────────────────────────── */
interface Product {
  id: string; name: string; barcode?: string;
  salePrice: number; purchasePrice: number;
  quantity: number; minQuantity: number; unit: string;
  isPinned?: boolean;
  category: { id: string; name: string };
}
interface Dish {
  id: string; name: string; price: number;
  barcode?: string | null; isActive: boolean;
}
interface LegalEntity { id: string; name: string; phone: string; }
interface Category { id: string; name: string }
interface CartItem {
  cartKey: string; type: 'product' | 'dish'; refId: string;
  name: string; salePrice: number; purchasePrice: number;
  stockQty: number; unit: string; qty: number;
}
interface SaleHistoryItem {
  id: string; totalAmount: number; paymentType: string;
  saleType?: string;
  cashAmount: number; cardAmount: number; createdAt: string;
  cashier: { name: string };
  legalEntity?: { name: string; phone: string } | null;
  saleItems: { quantity: number; priceAtSale: number; itemName: string }[];
}
type PayType = 'CASH' | 'CARD' | 'MIXED';
type MainTab  = 'pos' | 'history';

/* ── Helpers ─────────────────────────────────────────────────── */
const fmt      = (n: number) => new Intl.NumberFormat('de-DE').format(Math.round(n));
const rawNum   = (s: string) => s.replace(/\D/g, '');
const fmtInput = (raw: string) => raw ? new Intl.NumberFormat('de-DE').format(Number(raw)) : '';
const fmtTime  = (d: string) => new Date(d).toLocaleString('uz-UZ', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
});
const PAY_LABELS: Record<PayType, string> = { CASH: 'Naqd', CARD: 'Karta', MIXED: 'Aralash' };
const DISHES_CAT = '__dishes__';

/* FIX #3: AudioContext leak tuzatildi — ctx.close() qo'shildi */
function beep(ok: boolean) {
  try {
    const ctx  = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = ok ? 880 : 220;
    osc.type = ok ? 'sine' : 'sawtooth';
    gain.gain.value = 0.2;
    osc.start();
    osc.stop(ctx.currentTime + (ok ? 0.1 : 0.2));
    osc.onended = () => ctx.close(); /* ← LEAK TUZATILDI */
  } catch { /* silent */ }
}

/* ── Scan Feedback ───────────────────────────────────────────── */
function ScanFeedback({ item, onHide }: {
  item: { name: string; type: 'product' | 'dish' | 'notfound'; code: string } | null;
  onHide: () => void;
}) {
  useEffect(() => {
    if (!item) return;
    const t = setTimeout(onHide, 2000);
    return () => clearTimeout(t);
  }, [item, onHide]);
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
  sale: {
    totalAmount: number; paymentType: string;
    cashAmount: number; cardAmount: number;
    items: CartItem[];
    legalEntity?: LegalEntity | null;
  };
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className={`px-6 py-8 text-center text-white ${sale.legalEntity ? 'bg-blue-600' : 'bg-green-500'}`}>
          <CheckCircle className="w-14 h-14 mx-auto mb-3" />
          <h2 className="text-2xl font-bold">Sotuv amalga oshdi!</h2>
          {sale.legalEntity && (
            <p className="text-blue-100 text-sm mt-1 flex items-center justify-center gap-1">
              <Building2 className="w-4 h-4" />
              Y/Sh: {sale.legalEntity.name}
            </p>
          )}
        </div>
        <div className="p-5 space-y-4">
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {sale.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="flex items-center gap-1.5 text-gray-600 flex-1 mr-2 truncate">
                  {item.type === 'dish'
                    ? <UtensilsCrossed className="w-3 h-3 text-orange-400 flex-shrink-0" />
                    : <Package className="w-3 h-3 text-gray-400 flex-shrink-0" />}
                  {item.name} × {item.qty}
                </span>
                <span className="font-semibold text-gray-900 flex-shrink-0">{fmt(item.salePrice * item.qty)} so&apos;m</span>
              </div>
            ))}
          </div>
          <div className="border-t border-dashed pt-3 space-y-1.5">
            <div className="flex justify-between font-bold text-lg"><span>Jami</span><span>{fmt(sale.totalAmount)} so&apos;m</span></div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>To&apos;lov</span>
              <span className="font-medium">{PAY_LABELS[sale.paymentType as PayType]}</span>
            </div>
            {sale.paymentType === 'MIXED' && (
              <>
                <div className="flex justify-between text-sm text-gray-400"><span>Naqd</span><span>{fmt(sale.cashAmount)} so&apos;m</span></div>
                <div className="flex justify-between text-sm text-gray-400"><span>Karta</span><span>{fmt(sale.cardAmount)} so&apos;m</span></div>
              </>
            )}
          </div>
          <button onClick={onClose} className="w-full py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800">
            Yangi sotuv
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Payment Modal ───────────────────────────────────────────── */
function PaymentModal({ total, onConfirm, onClose, processing, legalEntities }: {
  total: number;
  onConfirm: (t: PayType, c: number, k: number, leId: string | null) => void;
  onClose: () => void;
  processing: boolean;
  legalEntities: LegalEntity[];
}) {
  const [payType,    setPay]     = useState<PayType>('CASH');
  const [cashRaw,    setCashRaw] = useState('');
  const [cardRaw,    setCardRaw] = useState('');
  const [err,        setErr]     = useState('');
  const [isLE,       setIsLE]    = useState(false);
  const [selectedLE, setLE]      = useState<string>('');
  const kn = Number(cardRaw) || 0;

  const handleCash = (v: string) => {
    const raw = rawNum(v);
    setCashRaw(raw);
    setCardRaw(String(Math.max(0, total - (Number(raw) || 0))));
    setErr('');
  };
  const handleCard = (v: string) => { setCardRaw(rawNum(v)); setErr(''); };

  const submit = () => {
    setErr('');
    if (isLE && !selectedLE) { setErr('Yuridik shaxsni tanlang'); return; }
    const leId = isLE ? selectedLE : null;
    if (payType === 'CASH')  { onConfirm('CASH',  total, 0,    leId); }
    else if (payType === 'CARD') { onConfirm('CARD',  0,    total, leId); }
    else {
      const cn = Number(cashRaw) || 0;
      if (Math.abs(cn + kn - total) > 1) { setErr(`Naqd+Karta=${fmt(cn + kn)}, jami ${fmt(total)}`); return; }
      onConfirm('MIXED', cn, kn, leId);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="bg-gray-900 px-6 py-5 flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-400">To&apos;lov summasi</p>
            <p className="text-3xl font-bold text-white">{fmt(total)} so&apos;m</p>
          </div>
          <button onClick={onClose} disabled={processing} className="p-2 hover:bg-gray-700 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {/* Y/Sh toggle */}
          <div
            onClick={() => { setIsLE(v => !v); setLE(''); setErr(''); }}
            className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 cursor-pointer transition-all ${
              isLE ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Building2 className={`w-5 h-5 ${isLE ? 'text-blue-600' : 'text-gray-400'}`} />
              <div>
                <p className={`text-sm font-semibold ${isLE ? 'text-blue-700' : 'text-gray-700'}`}>
                  Yuridik shaxsga sotish
                </p>
                <p className="text-xs text-gray-400">Y/Sh savdo sifatida belgilanadi</p>
              </div>
            </div>
            <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${isLE ? 'bg-blue-500' : 'bg-gray-300'}`}>
              <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${isLE ? 'translate-x-4' : ''}`} />
            </div>
          </div>

          {/* Y/Sh select */}
          {isLE && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Yuridik shaxsni tanlang <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedLE}
                onChange={e => { setLE(e.target.value); setErr(''); }}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                <option value="">— Tanlang —</option>
                {legalEntities.map(le => (
                  <option key={le.id} value={le.id}>{le.name} · {le.phone}</option>
                ))}
              </select>
              {legalEntities.length === 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  Hali yuridik shaxs yo&apos;q.{' '}
                  <a href="/legal-entities" target="_blank" className="text-blue-600 hover:underline">Qo&apos;shish →</a>
                </p>
              )}
            </div>
          )}

          {/* To'lov turi */}
          <div className="grid grid-cols-3 gap-2">
            {(['CASH', 'CARD', 'MIXED'] as PayType[]).map(t => (
              <button key={t}
                onClick={() => { setPay(t); setErr(''); setCashRaw(''); setCardRaw(''); }}
                className={`py-3 rounded-xl font-semibold text-sm flex flex-col items-center gap-1.5 ${payType === t ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {t === 'CASH'  && <Banknote    className="w-5 h-5" />}
                {t === 'CARD'  && <CreditCard  className="w-5 h-5" />}
                {t === 'MIXED' && <Layers      className="w-5 h-5" />}
                {PAY_LABELS[t]}
              </button>
            ))}
          </div>

          {payType === 'CASH' && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <Banknote className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-green-700 font-bold text-2xl">{fmt(total)} so&apos;m</p>
              <p className="text-green-500 text-sm mt-1">Naqd to&apos;lov</p>
            </div>
          )}
          {payType === 'CARD' && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
              <CreditCard className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <p className="text-blue-700 font-semibold text-lg">{fmt(total)} so&apos;m</p>
            </div>
          )}
          {payType === 'MIXED' && (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-600 mb-1 block">Naqd</label>
                <input
                  type="text" inputMode="numeric"
                  value={fmtInput(cashRaw)}
                  onChange={e => handleCash(e.target.value)}
                  placeholder="0" autoFocus
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 outline-none font-bold text-lg tracking-wide"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 mb-1 block">Karta</label>
                <input
                  type="text" inputMode="numeric"
                  value={fmtInput(cardRaw)}
                  onChange={e => handleCard(e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 outline-none font-bold text-lg tracking-wide"
                />
              </div>
              <div className={`flex justify-between px-4 py-2.5 rounded-xl text-sm font-medium ${Math.abs((Number(cashRaw) || 0) + kn - total) < 1 ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600'}`}>
                <span>Jami</span>
                <span>{fmt((Number(cashRaw) || 0) + kn)} / {fmt(total)} so&apos;m</span>
              </div>
            </div>
          )}

          {err && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{err}</div>}

          <button onClick={submit} disabled={processing}
            className={`w-full py-4 text-white rounded-xl font-bold text-lg disabled:opacity-50 flex items-center justify-center gap-2 ${
              isLE ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {processing
              ? <><svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>Saqlanmoqda...</>
              : isLE
              ? <><Building2 className="w-5 h-5" />Y/Sh sotuvni tasdiqlash</>
              : <><CheckCircle className="w-5 h-5" />Tasdiqlash</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── MAIN POS ────────────────────────────────────────────────── */
export default function PosPage() {
  const [mainTab,       setMainTab]       = useState<MainTab>('pos');
  const [products,      setProducts]      = useState<Product[]>([]);
  const [categories,    setCategories]    = useState<Category[]>([]);
  const [dishes,        setDishes]        = useState<Dish[]>([]);
  const [legalEntities, setLegalEntities] = useState<LegalEntity[]>([]);
  const [loadingProd,   setLoadingProd]   = useState(true);
  const [search,        setSearch]        = useState('');
  const [catFilter,     setCatFilter]     = useState('all');
  const [cart,          setCart]          = useState<CartItem[]>([]);
  const [showPay,       setShowPay]       = useState(false);
  const [processing,    setProcessing]    = useState(false);
  const [receipt,       setReceipt]       = useState<{
    totalAmount: number; paymentType: string;
    cashAmount: number; cardAmount: number;
    items: CartItem[]; legalEntity?: LegalEntity | null;
  } | null>(null);
  const [history,       setHistory]       = useState<SaleHistoryItem[]>([]);
  const [histTotal,     setHistTotal]     = useState(0);
  const [loadingHist,   setLoadingHist]   = useState(false);
  const [expandedId,    setExpandedId]    = useState<string | null>(null);
  const [scanFeedback,  setScanFeedback]  = useState<{ name: string; type: 'product' | 'dish' | 'notfound'; code: string } | null>(null);
  const [showCart,      setShowCart]      = useState(false); /* Mobile cart drawer */

  const searchRef = useRef<HTMLInputElement>(null);

  /* FIX #1: Scanner refs — products/dishes ref'da saqlanadi, useEffect dependency'dan olib tashlandi */
  const scanBuf      = useRef('');
  const scanTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTime     = useRef(0);
  const isScanner    = useRef(false);
  const productsRef  = useRef<Product[]>([]);
  const dishesRef    = useRef<Dish[]>([]);
  const showPayRef   = useRef(false);

  /* Ref'larni har render'da yangilab turamiz — closure muammosi yo'q */
  productsRef.current = products;
  dishesRef.current   = dishes;
  showPayRef.current  = showPay;

  /* ── Fetch ── */
  const fetchAll = useCallback(async () => {
    setLoadingProd(true);
    try {
      const [pr, cr, dr, ler] = await Promise.all([
        fetch('/api/products').then(r => r.json()),
        fetch('/api/categories').then(r => r.json()),
        fetch('/api/dishes').then(r => r.json()),
        fetch('/api/legal-entities').then(r => r.json()),
      ]);
      setProducts(Array.isArray(pr) ? pr : []);
      setCategories(Array.isArray(cr) ? cr : []);
      setDishes(Array.isArray(dr) ? dr.filter((d: Dish) => d.isActive) : []);
      setLegalEntities(Array.isArray(ler) ? ler : []);
    } finally {
      setLoadingProd(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    setLoadingHist(true);
    try {
      const r = await fetch('/api/sales/history?limit=50');
      const d = await r.json();
      setHistory(d.sales ?? []);
      setHistTotal(d.total ?? 0);
    } finally {
      setLoadingHist(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { if (mainTab === 'history') fetchHistory(); }, [mainTab, fetchHistory]);

  /* ── Cart ── */
  const addProduct = useCallback((p: Product) => {
    if (p.quantity <= 0) return;
    const key = `product-${p.id}`;
    setCart(prev => {
      const ex = prev.find(i => i.cartKey === key);
      if (ex) {
        if (ex.qty >= p.quantity) return prev;
        return prev.map(i => i.cartKey === key ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, {
        cartKey: key, type: 'product', refId: p.id,
        name: p.name, salePrice: p.salePrice, purchasePrice: p.purchasePrice,
        stockQty: p.quantity, unit: p.unit, qty: 1,
      }];
    });
  }, []);

  const addDish = useCallback((d: Dish) => {
    const key = `dish-${d.id}`;
    setCart(prev => {
      const ex = prev.find(i => i.cartKey === key);
      if (ex) return prev.map(i => i.cartKey === key ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, {
        cartKey: key, type: 'dish', refId: d.id,
        name: d.name, salePrice: d.price, purchasePrice: 0,
        stockQty: Infinity, unit: 'porsiya', qty: 1,
      }];
    });
  }, []);

  const updateQty = useCallback((key: string, delta: number) => {
    setCart(prev => prev.map(i => i.cartKey === key ? { ...i, qty: i.qty + delta } : i).filter(i => i.qty > 0));
  }, []);

  /* ── FIX #1: Barcode Scanner — bo'sh [] dependency, ref'lar orqali ishlaydi ──
   *
   * Oldingi muammo: [products, dishes, showPay, addProduct, addDish] dependency'lari
   * bor edi → har fetchAll() dan keyin useEffect qayta ishga tushar edi →
   * addEventListener/removeEventListener to'planib borardi.
   *
   * Yechim: products, dishes, showPay ref'da saqlanadi. useEffect bir marta
   * mount bo'ladi va komponent unmount bo'lguncha bir marta ishlatiladi.
   ──────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const processBarcode = (code: string) => {
      if (code.length < 3) return;
      const prod = productsRef.current.find(p => p.barcode && p.barcode === code);
      if (prod) {
        addProduct(prod);
        setScanFeedback({ name: prod.name, type: 'product', code });
        beep(true);
        return;
      }
      const dish = dishesRef.current.find(d => d.barcode && d.barcode === code && d.isActive);
      if (dish) {
        addDish(dish);
        setScanFeedback({ name: dish.name, type: 'dish', code });
        beep(true);
        return;
      }
      setScanFeedback({ name: '', type: 'notfound', code });
      beep(false);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (showPayRef.current) return;

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

      if (scanBuf.current.length === 0) {
        scanBuf.current = e.key;
        isScanner.current = false;
        if (scanTimer.current) clearTimeout(scanTimer.current);
        scanTimer.current = setTimeout(() => { scanBuf.current = ''; isScanner.current = false; }, 400);
      } else {
        if (gap < 60) {
          isScanner.current = true;
          e.preventDefault();
          e.stopPropagation();
        }
        scanBuf.current += e.key;
        if (scanTimer.current) clearTimeout(scanTimer.current);
        scanTimer.current = setTimeout(() => { scanBuf.current = ''; isScanner.current = false; }, 400);
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      if (scanTimer.current) clearTimeout(scanTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); /* ← BO'SH ARRAY: bir marta mount, bir marta unmount */

  /* ── Sale ── */
  const confirmSale = useCallback(async (payType: PayType, cashAmt: number, cardAmt: number, leId: string | null) => {
    setProcessing(true);
    try {
      const items = cart.map(i => ({
        productId:   i.type === 'product' ? i.refId : null,
        dishId:      i.type === 'dish'    ? i.refId : null,
        itemName:    i.name,
        quantity:    i.qty,
        priceAtSale: i.salePrice,
      }));
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentType: payType, cashAmount: cashAmt, cardAmount: cardAmt, legalEntityId: leId, items }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || 'Xatolik'); return; }

      const le = leId ? legalEntities.find(e => e.id === leId) ?? null : null;
      setReceipt({
        totalAmount: cart.reduce((s, i) => s + i.salePrice * i.qty, 0),
        paymentType: payType, cashAmount: cashAmt, cardAmount: cardAmt,
        items: [...cart], legalEntity: le,
      });
      setShowPay(false);
      setCart([]);
      setShowCart(false);
      /* FIX #8: fetchAll FAQAT BIR MARTA — ReceiptModal onClose dan olib tashlandi */
      fetchAll();
    } finally {
      setProcessing(false);
    }
  }, [cart, legalEntities, fetchAll]);

  /* FIX #6: onHide useCallback bilan stabillashtirilib, gereksiz re-render oldini olinadi */
  const hideScanFeedback = useCallback(() => setScanFeedback(null), []);

  const cartTotal = useMemo(() => cart.reduce((s, i) => s + i.salePrice * i.qty, 0), [cart]);
  const cartCount = useMemo(() => cart.reduce((s, i) => s + i.qty, 0), [cart]);
  const cartProfit = useMemo(() => cart.reduce((s, i) => s + (i.salePrice - i.purchasePrice) * i.qty, 0), [cart]);

  const q = search.toLowerCase();

  /* FIX #6: useMemo bilan render ichi hisob-kitob optimallashtirildi */
  const showOnlyDishes = catFilter === DISHES_CAT;
  const showAll        = catFilter === 'all';

  const filteredProds = useMemo(() => {
    if (showOnlyDishes) return [];
    return products
      .filter(p => {
        const matchSearch = !q || p.name.toLowerCase().includes(q) || (p.barcode?.toLowerCase().includes(q) ?? false);
        const matchCat    = showAll || p.category.id === catFilter;
        return matchSearch && matchCat;
      })
      .sort((a, b) => {
        if ((b.isPinned ? 1 : 0) !== (a.isPinned ? 1 : 0)) return (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0);
        return a.name.localeCompare(b.name);
      });
  }, [products, q, catFilter, showOnlyDishes, showAll]);

  const filteredDishes = useMemo(() => {
    if (!showAll && !showOnlyDishes) return [];
    return dishes.filter(d => !q || d.name.toLowerCase().includes(q) || (d.barcode?.toLowerCase().includes(q) ?? false));
  }, [dishes, q, showAll, showOnlyDishes]);

  /* ── Cart Panel (ikkala desktop va mobile uchun bir xil JSX) ── */
  const CartPanel = (
    <div className="flex flex-col h-full">
      {/* Cart header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-gray-700" />
          <span className="font-bold text-gray-900">Savat</span>
          {cartCount > 0 && (
            <span className="bg-gray-900 text-white text-xs font-bold px-2 py-0.5 rounded-full">{cartCount}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {cart.length > 0 && (
            <button onClick={() => setCart([])} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700">
              <Trash2 className="w-3.5 h-3.5" />Tozalash
            </button>
          )}
          {/* Mobile: yopish tugmasi */}
          <button onClick={() => setShowCart(false)} className="md:hidden p-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-300 py-10">
            <ShoppingCart className="w-12 h-12 mb-3" />
            <p className="text-sm font-medium text-gray-400">Savat bo&apos;sh</p>
            <p className="text-xs mt-1 text-gray-400">Mahsulot bosing yoki barkod skanerlang</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {cart.map(item => (
              <div key={item.cartKey} className="px-4 py-3 flex items-center gap-2">
                <button
                  onClick={() => setCart(p => p.filter(i => i.cartKey !== item.cartKey))}
                  className="text-gray-300 hover:text-red-500 flex-shrink-0 p-0.5"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="flex-shrink-0">
                  {item.type === 'dish'
                    ? <UtensilsCrossed className="w-5 h-5 text-orange-400" />
                    : <Package className="w-5 h-5 text-gray-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 leading-tight truncate">{item.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{fmt(item.salePrice)} so&apos;m</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => updateQty(item.cartKey, -1)}
                    className="w-7 h-7 rounded-full border-2 border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center text-sm font-bold text-gray-900">{item.qty}</span>
                  <button
                    onClick={() => updateQty(item.cartKey, 1)}
                    disabled={item.type === 'product' && item.qty >= item.stockQty}
                    className="w-7 h-7 rounded-full border-2 border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-30"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <div className="text-right flex-shrink-0 w-20">
                  <p className="text-sm font-bold text-gray-900">{fmt(item.salePrice * item.qty)}</p>
                  <p className="text-xs text-gray-400">so&apos;m</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4 space-y-3 flex-shrink-0">
        {cart.length > 0 && (
          <div className="flex justify-between text-xs bg-green-50 px-3 py-2 rounded-lg text-gray-500">
            <span>Sof foyda</span>
            <span className="font-semibold text-green-600">+{fmt(cartProfit)} so&apos;m</span>
          </div>
        )}
        <div className="flex justify-between items-baseline">
          <span className="text-gray-600 font-medium">Jami</span>
          <span className="text-2xl font-bold text-gray-900">{fmt(cartTotal)} so&apos;m</span>
        </div>
        <button
          onClick={() => { setShowPay(true); setShowCart(false); }}
          disabled={cart.length === 0}
          className="w-full py-4 bg-green-600 text-white rounded-xl font-bold text-lg hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          <ReceiptText className="w-5 h-5" />Sotish
        </button>
      </div>
    </div>
  );

  /* ── Render ── */
  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">

      {/* FIX #6: useCallback bilan stabillashtirilib o'tkazildi */}
      <ScanFeedback item={scanFeedback} onHide={hideScanFeedback} />

      {/* ── Top bar ── */}
      <div className="bg-white border-b border-gray-200 px-3 sm:px-5 py-2.5 flex items-center gap-2 sm:gap-4 flex-shrink-0">
        <h1 className="text-lg font-bold text-gray-900 hidden lg:block">Kassa</h1>

        {/* Tab switcher */}
        <div className="flex border border-gray-200 rounded-lg overflow-hidden flex-shrink-0">
          {(['pos', 'history'] as MainTab[]).map(t => (
            <button key={t} onClick={() => setMainTab(t)}
              className={`px-3 sm:px-4 py-2 text-sm font-medium flex items-center gap-1.5 ${mainTab === t ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              {t === 'pos'
                ? <><ShoppingCart className="w-4 h-4" /><span className="hidden sm:inline">Kassa</span></>
                : <><Clock className="w-4 h-4" /><span className="hidden sm:inline">Tarix</span></>}
              {t === 'history' && histTotal > 0 && mainTab !== 'history' && (
                <span className="bg-gray-200 text-gray-700 px-1.5 rounded-full text-xs">{histTotal}</span>
              )}
            </button>
          ))}
        </div>

        {/* POS qidiruv va filterlar */}
        {mainTab === 'pos' && (
          <div className="flex-1 flex items-center gap-2">
            {/* Search */}
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                ref={searchRef}
                type="text" value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Nomi yoki barkod..."
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 outline-none"
              />
            </div>

            {/* Kategoriya — kichik ekranda yashiriladi */}
            <select
              value={catFilter === DISHES_CAT ? 'all' : catFilter}
              onChange={e => setCatFilter(e.target.value)}
              className="hidden sm:block px-2.5 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-gray-900 outline-none max-w-[130px]"
            >
              <option value="all">Barcha</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            {/* Ovqatlar tugmasi */}
            {dishes.length > 0 && (
              <button
                onClick={() => setCatFilter(v => v === DISHES_CAT ? 'all' : DISHES_CAT)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border transition-all flex-shrink-0 ${
                  catFilter === DISHES_CAT
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'bg-white text-orange-600 border-orange-300 hover:bg-orange-50'
                }`}
              >
                <UtensilsCrossed className="w-4 h-4" />
                <span className="hidden sm:inline">Ovqatlar</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${catFilter === DISHES_CAT ? 'bg-orange-400 text-white' : 'bg-orange-100 text-orange-600'}`}>{dishes.length}</span>
              </button>
            )}

            {/* Yangilash tugmasi */}
            <button
              onClick={fetchAll}
              disabled={loadingProd}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-500 disabled:opacity-50 flex-shrink-0"
              title="Ma'lumotlarni yangilash"
            >
              <RefreshCw className={`w-4 h-4 ${loadingProd ? 'animate-spin' : ''}`} />
            </button>

            {/* Mobile cart tugmasi */}
            <button
              onClick={() => setShowCart(true)}
              className="md:hidden relative p-2 bg-gray-900 text-white rounded-lg flex-shrink-0"
            >
              <ShoppingCart className="w-4 h-4" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-green-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* ── POS: Mahsulotlar grid + Cart ── */}
      {mainTab === 'pos' && (
        <div className="flex flex-1 overflow-hidden relative">

          {/* Mahsulotlar grid */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4">
            {loadingProd ? (
              <div className="flex justify-center items-center h-full">
                <svg className="animate-spin w-8 h-8 text-gray-300" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              </div>
            ) : (filteredProds.length === 0 && filteredDishes.length === 0) ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Package className="w-12 h-12 mb-3 text-gray-200" />
                <p>Mahsulot yoki taom topilmadi</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-3">

                {/* Mahsulotlar */}
                {filteredProds.map(p => {
                  const ic  = cart.find(i => i.cartKey === `product-${p.id}`);
                  const out = p.quantity <= 0;
                  return (
                    <button key={`prod-${p.id}`} onClick={() => addProduct(p)} disabled={out}
                      className={`relative bg-white border rounded-xl p-3 text-left active:scale-95 transition-all touch-manipulation ${
                        out ? 'opacity-40 cursor-not-allowed border-gray-200'
                            : ic ? 'border-gray-900 ring-2 ring-gray-900 shadow-md'
                                 : 'border-gray-200 hover:border-gray-400 hover:shadow-md'
                      }`}
                    >
                      {ic && (
                        <span className="absolute -top-2 -right-2 bg-gray-900 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow z-10">
                          {ic.qty}
                        </span>
                      )}
                      {p.isPinned && <span className="absolute top-1.5 left-1.5 text-yellow-400 text-xs leading-none">⭐</span>}
                      <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gray-100 rounded-xl flex items-center justify-center mb-2 mx-auto">
                        <Package className="w-6 h-6 sm:w-7 sm:h-7 text-gray-400" />
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-gray-900 line-clamp-2 text-center mb-1 leading-snug">{p.name}</p>
                      <p className="text-sm sm:text-base font-extrabold text-gray-900 text-center">
                        {fmt(p.salePrice)}<span className="text-xs font-normal text-gray-400 ml-0.5">so&apos;m</span>
                      </p>
                      <p className={`text-xs text-center mt-0.5 font-medium ${out ? 'text-red-500' : p.quantity <= p.minQuantity ? 'text-orange-500' : 'text-gray-400'}`}>
                        {out ? 'Tugagan' : `${p.quantity} ${p.unit}`}
                      </p>
                    </button>
                  );
                })}

                {/* Taomlar */}
                {filteredDishes.map(d => {
                  const ic = cart.find(i => i.cartKey === `dish-${d.id}`);
                  return (
                    <button key={`dish-${d.id}`} onClick={() => addDish(d)}
                      className={`relative bg-white border rounded-xl p-3 text-left active:scale-95 transition-all touch-manipulation ${
                        ic ? 'border-orange-500 ring-2 ring-orange-500 shadow-md' : 'border-gray-200 hover:border-orange-300 hover:shadow-md'
                      }`}
                    >
                      {ic && (
                        <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow z-10">
                          {ic.qty}
                        </span>
                      )}
                      <div className="w-12 h-12 sm:w-14 sm:h-14 bg-orange-100 rounded-xl flex items-center justify-center mb-2 mx-auto">
                        <UtensilsCrossed className="w-6 h-6 sm:w-7 sm:h-7 text-orange-500" />
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-gray-900 line-clamp-2 text-center mb-1 leading-snug">{d.name}</p>
                      <p className="text-sm sm:text-base font-extrabold text-gray-900 text-center">
                        {fmt(d.price)}<span className="text-xs font-normal text-gray-400 ml-0.5">so&apos;m</span>
                      </p>
                      <p className="text-xs text-center mt-0.5 text-orange-500 font-medium">🍽 taom</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Desktop Cart (md va undan katta) ── */}
          <div className="hidden md:flex w-80 lg:w-96 xl:w-[420px] bg-white border-l border-gray-200 flex-col flex-shrink-0">
            {CartPanel}
          </div>

          {/* ── Mobile Cart Drawer ── */}
          {showCart && (
            <div className="md:hidden fixed inset-0 z-40 flex">
              {/* Overlay */}
              <div className="flex-1 bg-black/50" onClick={() => setShowCart(false)} />
              {/* Drawer */}
              <div className="w-[85vw] max-w-sm bg-white flex flex-col h-full shadow-2xl animate-slide-in-right">
                {CartPanel}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── History tab ── */}
      {mainTab === 'history' && (
        <div className="flex-1 overflow-y-auto p-3 sm:p-5">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-gray-900">
                Sotuvlar tarixi <span className="text-sm font-normal text-gray-500">({histTotal} ta)</span>
              </h2>
              <button onClick={fetchHistory} className="text-sm border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 text-gray-600 flex items-center gap-1.5">
                <RefreshCw className={`w-3.5 h-3.5 ${loadingHist ? 'animate-spin' : ''}`} />
                Yangilash
              </button>
            </div>
            {loadingHist ? (
              <div className="flex justify-center py-16">
                <svg className="animate-spin w-8 h-8 text-gray-400" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              </div>
            ) : history.length === 0 ? (
              <div className="py-16 text-center text-gray-400">
                <Clock className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                <p>Sotuvlar tarixi yo&apos;q</p>
              </div>
            ) : (
              <div className="space-y-2">
                {history.map(sale => {
                  const isExp = expandedId === sale.id;
                  const PC: Record<string, string> = {
                    CASH: 'bg-green-100 text-green-700',
                    CARD: 'bg-blue-100 text-blue-700',
                    MIXED: 'bg-purple-100 text-purple-700',
                  };
                  return (
                    <div key={sale.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setExpandedId(isExp ? null : sale.id)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 flex items-center gap-2 flex-wrap">
                            {sale.saleType === 'LEGAL_ENTITY' && (
                              <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                                <Building2 className="w-3 h-3" />Y/Sh
                              </span>
                            )}
                            {sale.saleItems.reduce((s, i) => s + i.quantity, 0)} ta element
                          </p>
                          <p className="text-xs text-gray-400 truncate">
                            {fmtTime(sale.createdAt)} · {sale.cashier?.name}
                            {sale.legalEntity && <span className="text-blue-500"> · {sale.legalEntity.name}</span>}
                          </p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${PC[sale.paymentType] ?? 'bg-gray-100 text-gray-600'}`}>
                          {PAY_LABELS[sale.paymentType as PayType] ?? sale.paymentType}
                        </span>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-gray-900 text-sm">{fmt(sale.totalAmount)}</p>
                          <p className="text-xs text-gray-400">so&apos;m</p>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${isExp ? 'rotate-180' : ''}`} />
                      </button>
                      {isExp && (
                        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 space-y-2">
                          {sale.saleItems.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span className="text-gray-600">{item.itemName || '—'} × {item.quantity}</span>
                              <span className="font-semibold">{fmt(item.priceAtSale * item.quantity)} so&apos;m</span>
                            </div>
                          ))}
                          {sale.paymentType === 'MIXED' && (
                            <div className="pt-2 border-t border-gray-200 text-xs text-gray-500 space-y-1">
                              <div className="flex justify-between"><span>Naqd</span><span>{fmt(sale.cashAmount)} so&apos;m</span></div>
                              <div className="flex justify-between"><span>Karta</span><span>{fmt(sale.cardAmount)} so&apos;m</span></div>
                            </div>
                          )}
                          <div className="pt-2 border-t border-gray-200 flex justify-between font-bold text-sm">
                            <span>Jami</span><span>{fmt(sale.totalAmount)} so&apos;m</span>
                          </div>
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

      {showPay && (
        <PaymentModal
          total={cartTotal}
          processing={processing}
          onConfirm={confirmSale}
          onClose={() => setShowPay(false)}
          legalEntities={legalEntities}
        />
      )}
      {/* FIX #8: onClose dan fetchAll() olib tashlandi — ikki marta chaqirilishining oldi olindi */}
      {receipt && (
        <ReceiptModal
          sale={receipt}
          onClose={() => setReceipt(null)}
        />
      )}
    </div>
  );
}
