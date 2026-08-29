'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Search, X, Package, Tag, Truck, Calendar,
  AlertTriangle, Barcode, Pencil, Trash2, Printer,
} from 'lucide-react';
import BarcodePrintModal from '@/components/ui/BarcodePrintModal';

/* ── Types ── */
interface Category { id: string; name: string }
interface Supplier { id: string; name: string }
interface Product {
  id: string; name: string; barcode?: string | null;
  unit: string; quantity: number; minQuantity: number;
  purchasePrice: number; salePrice: number; margin: number;
  vatType: string; expiryDate?: string | null;
  category: Category; supplier: Supplier; createdAt: string;
}

const fmt     = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(n));
const fmtDate = (s: string) => new Date(s).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
const VAT_LABELS: Record<string, string> = { NO_VAT: 'Soliqsiz', STANDARD: 'Standart', ZERO_VAT: '0%' };

/* ── Product Detail Modal ── */
function DetailModal({ product, onClose, onPrint }: {
  product: Product; onClose: () => void; onPrint?: () => void;
}) {
  const marginPct  = product.purchasePrice > 0
    ? ((product.salePrice - product.purchasePrice) / product.purchasePrice * 100).toFixed(1) : '0';
  const isLow      = product.quantity <= product.minQuantity;
  const isOut      = product.quantity === 0;
  const expiryDays = product.expiryDate
    ? Math.ceil((new Date(product.expiryDate).getTime() - Date.now()) / 86400000) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="bg-gray-900 text-white px-6 py-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">{product.name}</h2>
              <p className="text-gray-400 text-sm">{product.category.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto max-h-[65vh]">
          <div className="flex flex-wrap gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
              isOut ? 'text-red-600 bg-red-50 border-red-200' :
              isLow ? 'text-orange-600 bg-orange-50 border-orange-200' :
              'text-green-600 bg-green-50 border-green-200'
            }`}>{isOut ? 'Tugagan' : isLow ? '⚠ Kam qolgan' : '✓ Yetarli'}</span>
            {expiryDays !== null && (
              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                expiryDays <= 0 ? 'text-red-600 bg-red-50 border-red-200' :
                expiryDays <= 7 ? 'text-orange-600 bg-orange-50 border-orange-200' :
                'text-gray-600 bg-gray-50 border-gray-200'
              }`}>
                <Calendar className="w-3 h-3 inline mr-1" />
                {expiryDays <= 0 ? "Muddati o'tgan" : `${expiryDays} kun qoldi`}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-4"><p className="text-xs text-gray-500 mb-1">Kelish narxi</p><p className="text-xl font-bold text-gray-900">{fmt(product.purchasePrice)}</p><p className="text-xs text-gray-400">so&apos;m</p></div>
            <div className="bg-green-50 border border-green-100 rounded-xl p-4"><p className="text-xs text-gray-500 mb-1">Sotish narxi</p><p className="text-xl font-bold text-green-700">{fmt(product.salePrice)}</p><p className="text-xs text-gray-400">so&apos;m</p></div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4"><p className="text-xs text-gray-500 mb-1">Marja</p><p className="text-xl font-bold text-blue-700">+{fmt(product.salePrice - product.purchasePrice)}</p><p className="text-xs text-blue-400">{marginPct}%</p></div>
            <div className={`rounded-xl p-4 border ${isOut ? 'bg-red-50 border-red-100' : isLow ? 'bg-orange-50 border-orange-100' : 'bg-white border-gray-200'}`}>
              <p className="text-xs text-gray-500 mb-1">Zaxira</p>
              <p className={`text-xl font-bold ${isOut ? 'text-red-600' : isLow ? 'text-orange-600' : 'text-gray-900'}`}>{fmt(product.quantity)}</p>
              <p className="text-xs text-gray-400">{product.unit} (min: {fmt(product.minQuantity)})</p>
            </div>
          </div>
          <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 text-sm">
            {[
              { icon: Barcode,  label: 'Shtrix kod',   val: product.barcode ? <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{product.barcode}</span> : '—' },
              { icon: Tag,      label: 'Kategoriya',   val: product.category.name },
              { icon: Truck,    label: "Ta'minotchi",  val: product.supplier.name },
              { icon: Package,  label: "O'lchov",      val: product.unit },
              { icon: Package,  label: 'Soliq',        val: VAT_LABELS[product.vatType] ?? product.vatType },
              ...(product.expiryDate ? [{ icon: Calendar, label: 'Muddat', val: fmtDate(product.expiryDate) }] : []),
              { icon: Calendar, label: "Qo'shilgan",  val: fmtDate(product.createdAt) },
            ].map(({ icon: Icon, label, val }, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2 text-gray-500"><Icon className="w-4 h-4" />{label}</div>
                <span className="text-gray-800 font-medium">{val}</span>
              </div>
            ))}
          </div>
          {product.barcode && (
            <button onClick={() => { onClose(); onPrint?.(); }}
              className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50">
              <Printer className="w-4 h-4" />Shtrix kodni chop etish
            </button>
          )}
        </div>
        <div className="px-6 pb-5">
          <button onClick={onClose} className="w-full py-2.5 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 text-sm">Yopish</button>
        </div>
      </div>
    </div>
  );
}

/* ── Add / Edit Modal ─────────────────────────────────────────────
   MUHIM: Har bir maydon uchun alohida useState ishlatiladi.
   Buning sababi: bitta `form` obyekti bilan setForm() chaqirilganda
   komponent qayta render bo'lib, autoFocus focus'ni o'g'irlaydi.
   Alohida state'lar bilan faqat tegishli input re-render bo'ladi.
───────────────────────────────────────────────────────────────── */
function ProductModal({ open, onClose, onSave, initial, categories, suppliers }: {
  open: boolean; onClose: () => void;
  onSave: (data: {
    name: string; barcode: string; unit: string; quantity: string;
    minQuantity: string; purchasePrice: string; salePrice: string;
    vatType: string; expiryDate: string; categoryId: string; supplierId: string;
  }) => Promise<void>;
  initial?: Product | null;
  categories: Category[]; suppliers: Supplier[];
}) {
  const [name,          setName]          = useState('');
  const [barcode,       setBarcode]       = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [salePrice,     setSalePrice]     = useState('');
  const [quantity,      setQuantity]      = useState('0');
  const [minQuantity,   setMinQuantity]   = useState('10');
  const [unit,          setUnit]          = useState('dona');
  const [vatType,       setVatType]       = useState('NO_VAT');
  const [categoryId,    setCategoryId]    = useState('');
  const [supplierId,    setSupplierId]    = useState('');
  const [expiryDate,    setExpiryDate]    = useState('');
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState('');
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setError('');
    if (initial) {
      setName(initial.name);
      setBarcode(initial.barcode ?? '');
      setPurchasePrice(String(initial.purchasePrice));
      setSalePrice(String(initial.salePrice));
      setQuantity(String(initial.quantity));
      setMinQuantity(String(initial.minQuantity));
      setUnit(initial.unit);
      setVatType(initial.vatType);
      setCategoryId(initial.category.id);
      setSupplierId(initial.supplier.id);
      setExpiryDate(initial.expiryDate ? initial.expiryDate.split('T')[0] : '');
    } else {
      setName(''); setBarcode(''); setPurchasePrice(''); setSalePrice('');
      setQuantity('0'); setMinQuantity('10'); setUnit('dona');
      setVatType('NO_VAT'); setCategoryId(''); setSupplierId(''); setExpiryDate('');
    }
    setTimeout(() => nameRef.current?.focus(), 60);
  }, [open, initial]);

  const handleSave = async () => {
    setError('');
    if (!name.trim())    { setError('Nom kiritilmagan'); return; }
    if (!purchasePrice)  { setError('Kelish narxi kiritilmagan'); return; }
    if (!salePrice)      { setError('Sotish narxi kiritilmagan'); return; }
    if (!categoryId)     { setError('Kategoriya tanlanmagan'); return; }
    if (!supplierId)     { setError("Ta'minotchi tanlanmagan"); return; }
    setSaving(true);
    try {
      await onSave({ name, barcode, purchasePrice, salePrice, quantity, minQuantity, unit, vatType, categoryId, supplierId, expiryDate });
      onClose();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Xatolik'); }
    finally { setSaving(false); }
  };

  if (!open) return null;

  const inp = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 outline-none";
  const F = ({ label, req, children }: { label: string; req?: boolean; children: React.ReactNode }) => (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">
        {label}{req && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );

  const margin = Number(salePrice) - Number(purchasePrice);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="font-bold text-gray-900">
            {initial ? 'Mahsulotni tahrirlash' : "Yangi mahsulot qo'shish"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4 overflow-y-auto max-h-[70vh]">
          <F label="Nomi" req>
            <input ref={nameRef} className={inp}
              value={name} onChange={e => setName(e.target.value)} placeholder="Mahsulot nomi" />
          </F>
          <F label="Shtrix kod">
            <input className={`${inp} font-mono`}
              value={barcode} onChange={e => setBarcode(e.target.value)} placeholder="4780068020047" />
          </F>
          <F label="Kelish narxi (so'm)" req>
            <input type="number" className={inp}
              value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} placeholder="0" />
          </F>
          <F label="Sotish narxi (so'm)" req>
            <input type="number" className={inp}
              value={salePrice} onChange={e => setSalePrice(e.target.value)} placeholder="0" />
          </F>
          <F label="Miqdor">
            <input type="number" className={inp}
              value={quantity} onChange={e => setQuantity(e.target.value)} />
          </F>
          <F label="Minimal zaxira">
            <input type="number" className={inp}
              value={minQuantity} onChange={e => setMinQuantity(e.target.value)} />
          </F>
          <F label="O'lchov birligi">
            <select className={inp} value={unit} onChange={e => setUnit(e.target.value)}>
              <option>dona</option><option>kg</option><option>litr</option><option>metr</option>
            </select>
          </F>
          <F label="Soliq">
            <select className={inp} value={vatType} onChange={e => setVatType(e.target.value)}>
              <option value="NO_VAT">Soliqsiz</option>
              <option value="STANDARD">Standart</option>
              <option value="ZERO_VAT">0%</option>
            </select>
          </F>
          <F label="Kategoriya" req>
            <select className={inp} value={categoryId} onChange={e => setCategoryId(e.target.value)}>
              <option value="">— Tanlang —</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </F>
          <F label="Ta'minotchi" req>
            <select className={inp} value={supplierId} onChange={e => setSupplierId(e.target.value)}>
              <option value="">— Tanlang —</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </F>
          <F label="Yaroqlilik muddati">
            <input type="date" className={inp}
              value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
          </F>
          <div className="col-span-2">
            {purchasePrice && salePrice && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-2.5 text-sm">
                <span className="text-gray-500">Marja: </span>
                <span className="font-bold text-blue-700">+{fmt(margin)} so&apos;m</span>
                {Number(purchasePrice) > 0 && (
                  <span className="text-blue-500 ml-2">
                    ({(margin / Number(purchasePrice) * 100).toFixed(1)}%)
                  </span>
                )}
              </div>
            )}
          </div>
          {error && (
            <p className="col-span-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}
        </div>
        <div className="flex gap-3 px-6 pb-5">
          <button onClick={onClose} disabled={saving}
            className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
            Bekor qilish
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
            {saving ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function ProductsPage() {
  const [products,    setProducts]    = useState<Product[]>([]);
  const [categories,  setCategories]  = useState<Category[]>([]);
  const [suppliers,   setSuppliers]   = useState<Supplier[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [statusFilter,setStatusFilter]= useState('all');
  const [selected,    setSelected]    = useState<Product | null>(null);
  const [editTarget,  setEditTarget]  = useState<Product | null>(null);
  const [addOpen,     setAddOpen]     = useState(false);
  const [deleteId,    setDeleteId]    = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [printTarget, setPrintTarget] = useState<Product | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [pr, cr, sr] = await Promise.all([
        fetch('/api/products').then(r => r.json()),
        fetch('/api/categories').then(r => r.json()),
        fetch('/api/suppliers').then(r => r.json()),
      ]);
      setProducts(Array.isArray(pr) ? pr : []);
      setCategories(Array.isArray(cr) ? cr : []);
      setSuppliers(Array.isArray(sr) ? sr : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSave = async (form: {
    name: string; barcode: string; unit: string; quantity: string;
    minQuantity: string; purchasePrice: string; salePrice: string;
    vatType: string; expiryDate: string; categoryId: string; supplierId: string;
  }, id?: string) => {
    const url    = id ? `/api/products/${id}` : '/api/products';
    const method = id ? 'PUT' : 'POST';
    const res    = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Xatolik'); }
    await fetchAll();
  };

  const handleDelete = async (id: string) => {
    setDeleteError('');
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    if (res.ok) { setDeleteId(null); fetchAll(); }
    else { const d = await res.json(); setDeleteError(d.error || "O'chirishda xatolik"); }
  };

  const filtered = products.filter(p => {
    const ms = p.name.toLowerCase().includes(search.toLowerCase()) || (p.barcode ?? '').toLowerCase().includes(search.toLowerCase());
    const mf = statusFilter === 'all'
      || (statusFilter === 'low' && p.quantity <= p.minQuantity && p.quantity > 0)
      || (statusFilter === 'out' && p.quantity === 0);
    return ms && mf;
  });

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mahsulotlar</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} ta mahsulot</p>
        </div>
        <button onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-lg hover:bg-gray-800 text-sm font-medium">
          <Plus className="w-4 h-4" /> Yangi mahsulot
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input type="text" placeholder="Nom yoki shtrix kod..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 outline-none" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 outline-none bg-white">
          <option value="all">Barchasi</option>
          <option value="low">Kam qolgan</option>
          <option value="out">Tugagan</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20">
            <svg className="animate-spin w-8 h-8 text-gray-300" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Mahsulot</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Shtrix kod</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Kategoriya</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Kelish</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sotish</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Marja</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Zaxira</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Amal</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-16 text-center text-gray-400">
                    <Package className="w-10 h-10 mx-auto mb-2 text-gray-200" />Mahsulot topilmadi
                  </td></tr>
                ) : filtered.map(p => {
                  const isLow  = p.quantity <= p.minQuantity && p.quantity > 0;
                  const isOut  = p.quantity === 0;
                  const margin = p.salePrice - p.purchasePrice;
                  const mPct   = p.purchasePrice > 0 ? ((margin / p.purchasePrice) * 100).toFixed(0) : '0';
                  const expiryDays = p.expiryDate
                    ? Math.ceil((new Date(p.expiryDate).getTime() - Date.now()) / 86400000) : null;
                  return (
                    <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 cursor-pointer" onClick={() => setSelected(p)}>
                        <p className="font-semibold text-gray-900 text-sm hover:text-blue-600 transition-colors">{p.name}</p>
                        {p.expiryDate && expiryDays !== null && (
                          <p className={`text-xs mt-0.5 ${expiryDays <= 0 ? 'text-red-500' : expiryDays <= 7 ? 'text-orange-500' : 'text-gray-400'}`}>
                            {expiryDays <= 0 ? "⚠ Muddati o'tgan" : expiryDays <= 7 ? `⏰ ${expiryDays} kun qoldi` : `📅 ${fmtDate(p.expiryDate)}`}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {p.barcode ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs text-gray-700 bg-gray-100 px-2 py-1 rounded-md">{p.barcode}</span>
                            <button onClick={() => setPrintTarget(p)}
                              className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors">
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">{p.category.name}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm text-gray-500">{fmt(p.purchasePrice)}</span>
                        <span className="text-xs text-gray-400 ml-0.5">so&apos;m</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-bold text-gray-900">{fmt(p.salePrice)}</span>
                        <span className="text-xs text-gray-400 ml-0.5">so&apos;m</span>
                      </td>
                      <td className="px-4 py-3 text-right hidden lg:table-cell">
                        <span className="text-sm font-semibold text-green-600">+{fmt(margin)}</span>
                        <span className="text-xs text-gray-400 ml-1">({mPct}%)</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {(isLow || isOut) && <AlertTriangle className={`w-3.5 h-3.5 ${isOut ? 'text-red-500' : 'text-orange-400'}`} />}
                          <span className={`text-sm font-bold ${isOut ? 'text-red-600' : isLow ? 'text-orange-600' : 'text-gray-900'}`}>{fmt(p.quantity)}</span>
                          <span className="text-xs text-gray-400">{p.unit}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => setSelected(p)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                            <Barcode className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditTarget(p)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setDeleteId(p.id); setDeleteError(''); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <DetailModal product={selected} onClose={() => setSelected(null)}
          onPrint={() => { setPrintTarget(selected); setSelected(null); }} />
      )}

      {/* Add Modal */}
      <ProductModal open={addOpen} onClose={() => setAddOpen(false)}
        onSave={form => handleSave(form)}
        categories={categories} suppliers={suppliers} />

      {/* Edit Modal */}
      <ProductModal open={!!editTarget} onClose={() => setEditTarget(null)}
        onSave={form => handleSave(form, editTarget!.id)}
        initial={editTarget} categories={categories} suppliers={suppliers} />

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">O&apos;chirishni tasdiqlang</h3>
            <p className="text-sm text-gray-500 mb-4">Bu mahsulot o&apos;chiriladi.</p>
            {deleteError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-4">{deleteError}</p>}
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50">Bekor</button>
              <button onClick={() => handleDelete(deleteId)} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700">O&apos;chirish</button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Print Modal */}
      <BarcodePrintModal
        open={!!printTarget} onClose={() => setPrintTarget(null)}
        name={printTarget?.name ?? ''} barcode={printTarget?.barcode ?? ''}
        price={printTarget?.salePrice ?? 0}
      />
    </div>
  );
}
