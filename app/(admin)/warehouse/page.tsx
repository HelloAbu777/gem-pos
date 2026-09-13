'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Pencil, Trash2, X, ArrowRightLeft,
  Warehouse, Package, Barcode, Truck,
  CheckCircle, AlertCircle,
} from 'lucide-react';

/* ── Types ── */
interface WarehouseItem {
  id: string;
  name: string;
  barcode: string | null;
  unit: string;
  quantity: number;
  purchasePrice: number;
  description: string | null;
  categoryId: string | null;
  supplierId: string | null;
  isTransferred: boolean;
  transferredAt: string | null;
  createdAt: string;
}
interface Category { id: string; name: string }
interface Supplier { id: string; name: string }

/* ── Helpers ── */
const fmt = (n: number) => new Intl.NumberFormat('de-DE').format(Math.round(n));
const fmtDate = (d: string) => new Date(d).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' });

/* ── Field wrapper ── */
function F({ label, req, children }: { label: string; req?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">
        {label}{req && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 outline-none';

/* ══════════════════════════════════════
   ADD / EDIT MODAL
══════════════════════════════════════ */
function ItemModal({
  open, onClose, onSave, initial,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string; barcode: string; unit: string; quantity: string;
    purchasePrice: string; description: string;
  }) => Promise<void>;
  initial?: WarehouseItem | null;
}) {
  const [name,          setName]          = useState('');
  const [barcode,       setBarcode]       = useState('');
  const [unit,          setUnit]          = useState('dona');
  const [quantity,      setQuantity]      = useState('0');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [description,   setDescription]  = useState('');
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    if (initial) {
      setName(initial.name);
      setBarcode(initial.barcode ?? '');
      setUnit(initial.unit);
      setQuantity(String(initial.quantity));
      setPurchasePrice(String(initial.purchasePrice));
      setDescription(initial.description ?? '');
    } else {
      setName(''); setBarcode(''); setUnit('dona');
      setQuantity('0'); setPurchasePrice(''); setDescription('');
    }
  }, [open, initial]);

  const handleSave = async () => {
    setError('');
    if (!name.trim()) { setError('Nom kiritilmagan'); return; }
    setSaving(true);
    try {
      await onSave({ name, barcode, unit, quantity, purchasePrice, description });
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    } finally { setSaving(false); }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="font-bold text-gray-900">
            {initial ? 'Tahrirlash' : "Omborga mahsulot qo'shish"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4 overflow-y-auto max-h-[70vh]">
          <div className="col-span-2">
            <F label="Nomi" req>
              <input autoFocus className={inp} value={name} onChange={e=>setName(e.target.value)} placeholder="Mahsulot nomi"/>
            </F>
          </div>
          <F label="Shtrix kod">
            <input className={`${inp} font-mono`} value={barcode} onChange={e=>setBarcode(e.target.value)} placeholder="4780068020047"/>
          </F>
          <F label="O'lchov birligi">
            <select className={inp} value={unit} onChange={e=>setUnit(e.target.value)}>
              <option>dona</option><option>kg</option><option>litr</option><option>metr</option><option>quti</option><option>paket</option>
            </select>
          </F>
          <F label="Miqdor" req>
            <input type="number" className={inp} value={quantity} onChange={e=>setQuantity(e.target.value)} min="0"/>
          </F>
          <F label="Kelish narxi (so'm)">
            <input type="number" className={inp} value={purchasePrice} onChange={e=>setPurchasePrice(e.target.value)} placeholder="0"/>
          </F>
          <div className="col-span-2">
            <F label="Izoh">
              <textarea className={`${inp} resize-none`} rows={2} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Qo'shimcha ma'lumot..."/>
            </F>
          </div>
          {error && <p className="col-span-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        </div>
        <div className="flex gap-3 px-6 pb-5">
          <button onClick={onClose} disabled={saving} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-50">Bekor qilish</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
            {saving ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   TRANSFER MODAL
══════════════════════════════════════ */
function TransferModal({
  item, categories, suppliers, onClose, onTransfer,
}: {
  item: WarehouseItem;
  categories: Category[];
  suppliers: Supplier[];
  onClose: () => void;
  onTransfer: (data: { categoryId: string; supplierId: string; salePrice: string; vatType: string; minQuantity: string }) => Promise<void>;
}) {
  const [categoryId,  setCategoryId]  = useState('');
  const [supplierId,  setSupplierId]  = useState('');
  const [salePrice,   setSalePrice]   = useState('');
  const [vatType,     setVatType]     = useState('NO_VAT');
  const [minQuantity, setMinQuantity] = useState('10');
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');

  const margin = Number(salePrice) - item.purchasePrice;

  const handleTransfer = async () => {
    setError('');
    if (!categoryId)  { setError('Kategoriya tanlanmagan'); return; }
    if (!supplierId)  { setError("Ta'minotchi tanlanmagan"); return; }
    if (!salePrice)   { setError('Sotish narxi kiritilmagan'); return; }
    setSaving(true);
    try {
      await onTransfer({ categoryId, supplierId, salePrice, vatType, minQuantity });
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gray-900 px-6 py-5 flex items-start justify-between">
          <div>
            <h2 className="text-white font-bold text-lg">Mahsulotlarga o'tkazish</h2>
            <p className="text-gray-400 text-sm mt-0.5">{item.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-5 h-5"/></button>
        </div>

        {/* Info */}
        <div className="px-6 py-4 bg-blue-50 border-b border-blue-100 grid grid-cols-3 gap-3 text-center text-sm">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Miqdor</p>
            <p className="font-bold text-gray-900">{item.quantity} {item.unit}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Kelish narxi</p>
            <p className="font-bold text-gray-900">{fmt(item.purchasePrice)} so'm</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Marja</p>
            <p className={`font-bold ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {margin >= 0 ? '+' : ''}{fmt(margin)} so'm
            </p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <F label="Kategoriya" req>
            <select className={inp} value={categoryId} onChange={e=>setCategoryId(e.target.value)}>
              <option value="">— Tanlang —</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </F>
          <F label="Ta'minotchi" req>
            <select className={inp} value={supplierId} onChange={e=>setSupplierId(e.target.value)}>
              <option value="">— Tanlang —</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </F>
          <div className="grid grid-cols-2 gap-4">
            <F label="Sotish narxi (so'm)" req>
              <input type="number" className={inp} value={salePrice} onChange={e=>setSalePrice(e.target.value)} placeholder="0"/>
            </F>
            <F label="Minimal zaxira">
              <input type="number" className={inp} value={minQuantity} onChange={e=>setMinQuantity(e.target.value)}/>
            </F>
          </div>
          <F label="Soliq">
            <select className={inp} value={vatType} onChange={e=>setVatType(e.target.value)}>
              <option value="NO_VAT">Soliqsiz</option>
              <option value="STANDARD">Standart</option>
              <option value="ZERO_VAT">0%</option>
            </select>
          </F>

          {salePrice && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-2.5 text-sm">
              <span className="text-gray-500">Marja: </span>
              <span className={`font-bold ${margin >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
                {margin >= 0 ? '+' : ''}{fmt(margin)} so'm
              </span>
              {item.purchasePrice > 0 && (
                <span className="text-blue-500 ml-2">
                  ({(margin / item.purchasePrice * 100).toFixed(1)}%)
                </span>
              )}
            </div>
          )}

          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        </div>

        <div className="flex gap-3 px-6 pb-5">
          <button onClick={onClose} disabled={saving} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-50">Bekor qilish</button>
          <button onClick={handleTransfer} disabled={saving}
            className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2">
            <ArrowRightLeft className="w-4 h-4"/>
            {saving ? 'O\'tkazilmoqda...' : 'Mahsulotlarga o\'tkazish'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════ */
export default function WarehousePage() {
  const [items,       setItems]       = useState<WarehouseItem[]>([]);
  const [categories,  setCategories]  = useState<Category[]>([]);
  const [suppliers,   setSuppliers]   = useState<Supplier[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [filter,      setFilter]      = useState<'all' | 'active' | 'transferred'>('active');
  const [addOpen,     setAddOpen]     = useState(false);
  const [editTarget,  setEditTarget]  = useState<WarehouseItem | null>(null);
  const [transferTarget, setTransferTarget] = useState<WarehouseItem | null>(null);
  const [deleteId,    setDeleteId]    = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [wr, cr, sr] = await Promise.all([
        fetch('/api/warehouse').then(r => r.json()),
        fetch('/api/categories').then(r => r.json()),
        fetch('/api/suppliers').then(r => r.json()),
      ]);
      setItems(Array.isArray(wr) ? wr : []);
      setCategories(Array.isArray(cr) ? cr : []);
      setSuppliers(Array.isArray(sr) ? sr : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSave = async (data: {
    name: string; barcode: string; unit: string; quantity: string;
    purchasePrice: string; description: string;
  }, id?: string) => {
    const url    = id ? `/api/warehouse/${id}` : '/api/warehouse';
    const method = id ? 'PUT' : 'POST';
    const res    = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Xatolik'); }
    await fetchAll();
  };

  const handleTransfer = async (item: WarehouseItem, tData: {
    categoryId: string; supplierId: string; salePrice: string; vatType: string; minQuantity: string;
  }) => {
    const res = await fetch('/api/warehouse/transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, ...tData }),
    });
    if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Xatolik'); }
    await fetchAll();
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/warehouse/${id}`, { method: 'DELETE' });
    if (res.ok) { setDeleteId(null); fetchAll(); }
  };

  const q = search.toLowerCase();
  const filtered = items.filter(i => {
    const matchSearch = !q || i.name.toLowerCase().includes(q) || (i.barcode ?? '').includes(q);
    const matchFilter =
      filter === 'all' ? true :
      filter === 'active' ? !i.isTransferred :
      i.isTransferred;
    return matchSearch && matchFilter;
  });

  const activeCount      = items.filter(i => !i.isTransferred).length;
  const transferredCount = items.filter(i => i.isTransferred).length;
  const totalValue       = items.filter(i => !i.isTransferred).reduce((s, i) => s + i.purchasePrice * i.quantity, 0);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Warehouse className="w-7 h-7"/>
            Ombor
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Kassaga o'tkazilmagan mahsulotlar</p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-lg hover:bg-gray-800 text-sm font-medium">
          <Plus className="w-4 h-4"/>Omborga qo'shish
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Omborga kelgan</p>
          <p className="text-2xl font-bold text-gray-900">{items.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">{activeCount} ta aktiv</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">O'tkazilgan</p>
          <p className="text-2xl font-bold text-green-600">{transferredCount}</p>
          <p className="text-xs text-gray-400 mt-0.5">Mahsulotlar bo'limiga</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Ombor qiymati</p>
          <p className="text-xl font-bold text-gray-900">{fmt(totalValue)}</p>
          <p className="text-xs text-gray-400 mt-0.5">so'm (aktiv mahsulotlar)</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4"/>
          <input
            type="text" placeholder="Nom yoki shtrix kod..." value={search}
            onChange={e=>setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 outline-none"/>
        </div>
        <div className="flex border border-gray-200 rounded-lg overflow-hidden">
          {[
            { key: 'active',       label: `Aktiv (${activeCount})` },
            { key: 'transferred',  label: `O'tkazilgan (${transferredCount})` },
            { key: 'all',          label: 'Barchasi' },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key as typeof filter)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${filter===f.key?'bg-gray-900 text-white':'bg-white text-gray-600 hover:bg-gray-50'}`}>
              {f.label}
            </button>
          ))}
        </div>
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
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Warehouse className="w-12 h-12 mb-3 text-gray-200"/>
            <p className="font-medium">Mahsulot topilmadi</p>
            <p className="text-sm mt-1">Yangi mahsulot qo'shing</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Mahsulot</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Shtrix kod</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Miqdor</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Kelish narxi</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Jami qiymat</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Holat</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Amal</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
                      {item.description && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">{item.description}</p>}
                    </td>
                    <td className="px-4 py-3">
                      {item.barcode
                        ? <span className="font-mono text-xs text-gray-700 bg-gray-100 px-2 py-1 rounded-md">{item.barcode}</span>
                        : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-semibold text-gray-900">{item.quantity}</span>
                      <span className="text-xs text-gray-400 ml-1">{item.unit}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-gray-700">{fmt(item.purchasePrice)}</span>
                      <span className="text-xs text-gray-400 ml-0.5">so'm</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-semibold text-gray-900">{fmt(item.purchasePrice * item.quantity)}</span>
                      <span className="text-xs text-gray-400 ml-0.5">so'm</span>
                    </td>
                    <td className="px-4 py-3">
                      {item.isTransferred ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
                          <CheckCircle className="w-3 h-3"/>O'tkazilgan
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full">
                          <AlertCircle className="w-3 h-3"/>Omborida
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {!item.isTransferred && (
                          <>
                            <button
                              onClick={() => setTransferTarget(item)}
                              title="Mahsulotlarga o'tkazish"
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                              <ArrowRightLeft className="w-4 h-4"/>
                            </button>
                            <button
                              onClick={() => setEditTarget(item)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                              <Pencil className="w-4 h-4"/>
                            </button>
                            <button
                              onClick={() => setDeleteId(item.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4"/>
                            </button>
                          </>
                        )}
                        {item.isTransferred && (
                          <span className="text-xs text-gray-400">
                            {item.transferredAt ? fmtDate(item.transferredAt) : '—'}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      <ItemModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={data => handleSave(data)}
      />

      {/* Edit Modal */}
      <ItemModal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSave={data => handleSave(data, editTarget!.id)}
        initial={editTarget}
      />

      {/* Transfer Modal */}
      {transferTarget && (
        <TransferModal
          item={transferTarget}
          categories={categories}
          suppliers={suppliers}
          onClose={() => setTransferTarget(null)}
          onTransfer={data => handleTransfer(transferTarget, data)}
        />
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">O'chirishni tasdiqlang</h3>
            <p className="text-sm text-gray-500 mb-6">Bu ombor mahsuloti o'chiriladi.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50">Bekor</button>
              <button onClick={() => handleDelete(deleteId)} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700">O'chirish</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
