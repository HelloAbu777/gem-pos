'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, X, UtensilsCrossed, Search, ToggleLeft, ToggleRight, Printer } from 'lucide-react';

interface Dish {
  id: string;
  name: string;
  price: number;
  barcode: string | null;
  isActive: boolean;
  createdAt: string;
}

const fmt = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(n));

/* ── Barcode Print ── */
function printBarcode(name: string, barcode: string, price: number) {
  const w = window.open('', '_blank', 'width=400,height=300');
  if (!w) return;
  w.document.write(`
    <!DOCTYPE html><html><head><title>Barcode</title>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { display:flex; align-items:center; justify-content:center; min-height:100vh; background:#fff; font-family:monospace; }
      .label { border:1px solid #ccc; padding:10px 14px; width:200px; text-align:center; }
      .name  { font-size:11px; font-weight:bold; margin-bottom:6px; word-break:break-word; }
      .code  { font-size:18px; letter-spacing:2px; font-family:monospace; margin:4px 0; }
      .price { font-size:13px; font-weight:bold; margin-top:6px; }
      .bars  { display:flex; justify-content:center; align-items:flex-end; gap:1px; margin:6px 0; height:40px; }
      .bar   { background:#000; }
    </style></head><body>
    <div class="label">
      <div class="name">${name}</div>
      <div class="bars" id="bars"></div>
      <div class="code">${barcode}</div>
      <div class="price">${fmt(price)} so'm</div>
    </div>
    <script>
      const bars = document.getElementById('bars');
      const widths = [3,2,1,2,3,1,2,1,3,2,1,2,1,3,2];
      for(let i=0;i<'${barcode}'.length*3+15;i++){
        const b=document.createElement('div');
        b.className='bar';
        const w=widths[i%widths.length];
        b.style.width=(i%2===0?w:w-1)+'px';
        b.style.height=(30+((i*7)%12))+'px';
        bars.appendChild(b);
      }
      window.onload = () => { window.print(); window.close(); };
    </script></body></html>`);
  w.document.close();
}

/* ── Modal ── */
function DishModal({
  open, onClose, onSave, initial,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: { name: string; price: number; barcode: string; isActive: boolean }) => Promise<void>;
  initial?: Dish | null;
}) {
  const [name,     setName]     = useState('');
  const [price,    setPrice]    = useState('');
  const [barcode,  setBarcode]  = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? '');
      setPrice(initial?.price?.toString() ?? '');
      setBarcode(initial?.barcode ?? '');
      setIsActive(initial?.isActive ?? true);
      setError('');
    }
  }, [open, initial]);

  const handleSave = async () => {
    setError('');
    if (!name.trim())           { setError('Taom nomi kiritilmagan'); return; }
    if (!price || Number(price) <= 0) { setError('Narx noto\'g\'ri'); return; }
    setSaving(true);
    try {
      await onSave({ name: name.trim(), price: Number(price), barcode: barcode.trim(), isActive });
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-orange-500" />
            {initial ? 'Taomni tahrirlash' : 'Yangi taom'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Nom */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Taom nomi <span className="text-red-500">*</span>
            </label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Masalan: Palov, Shashlik..."
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none"
            />
          </div>

          {/* Narx */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Narx (so'm) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={price}
              onChange={e => setPrice(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="Masalan: 25000"
              min={1}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none"
            />
          </div>

          {/* Barcode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Shtrix kod
              <span className="text-gray-400 text-xs ml-1">(ixtiyoriy)</span>
            </label>
            <input
              type="text"
              value={barcode}
              onChange={e => setBarcode(e.target.value)}
              placeholder="Masalan: 4780068020047"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none font-mono"
            />
          </div>

          {/* Aktiv */}
          {initial && (
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-medium text-gray-700">Aktiv holat</span>
              <button
                onClick={() => setIsActive(v => !v)}
                className={`flex items-center gap-1.5 text-sm font-medium ${isActive ? 'text-green-600' : 'text-gray-400'}`}
              >
                {isActive
                  ? <ToggleRight className="w-8 h-8 text-green-500" />
                  : <ToggleLeft  className="w-8 h-8 text-gray-400" />}
                {isActive ? 'Aktiv' : 'Nofaol'}
              </button>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Bekor qilish
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2.5 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50"
          >
            {saving ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function DishesPage() {
  const [dishes,     setDishes]     = useState<Dish[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [modalOpen,  setModalOpen]  = useState(false);
  const [editTarget, setEditTarget] = useState<Dish | null>(null);
  const [deleteId,   setDeleteId]   = useState<string | null>(null);

  const fetchDishes = useCallback(async () => {
    try {
      const res  = await fetch('/api/dishes?all=1');
      const data = await res.json();
      setDishes(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchDishes(); }, [fetchDishes]);

  const handleSave = async (data: { name: string; price: number; barcode: string; isActive: boolean }) => {
    const url    = editTarget ? `/api/dishes/${editTarget.id}` : '/api/dishes';
    const method = editTarget ? 'PUT' : 'POST';
    const res    = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Xatolik'); }
    await fetchDishes();
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/dishes/${id}`, { method: 'DELETE' });
    if (res.ok) { setDeleteId(null); fetchDishes(); }
  };

  const filtered = dishes.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    (d.barcode ?? '').includes(search)
  );

  const activeCount   = dishes.filter(d =>  d.isActive).length;
  const inactiveCount = dishes.filter(d => !d.isActive).length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <UtensilsCrossed className="w-7 h-7 text-orange-500" />
            Taomlar
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Kassada sotiluvchi taomlar ro'yxati
          </p>
        </div>
        <button
          onClick={() => { setEditTarget(null); setModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Yangi taom
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Jami taomlar</p>
          <p className="text-2xl font-bold text-gray-900">{dishes.length}</p>
        </div>
        <div className="bg-white border border-green-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Aktiv</p>
          <p className="text-2xl font-bold text-green-600">{activeCount}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Nofaol</p>
          <p className="text-2xl font-bold text-gray-400">{inactiveCount}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Taom nomi yoki shtrix kod..."
          className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 outline-none"
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <svg className="animate-spin w-8 h-8 text-orange-300" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <UtensilsCrossed className="w-12 h-12 mb-3 text-gray-200" />
            <p className="font-medium">{search ? 'Taom topilmadi' : 'Hali taom yo\'q'}</p>
            {!search && <p className="text-sm mt-1">Yuqoridagi tugmani bosib qo'shing</p>}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Taom nomi</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Shtrix kod</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Narx</th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Holat</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(dish => (
                <tr key={dish.id} className={`hover:bg-gray-50 transition-colors ${!dish.isActive ? 'opacity-50' : ''}`}>
                  {/* Nom */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                        <UtensilsCrossed className="w-4 h-4 text-orange-500" />
                      </div>
                      <span className="font-medium text-gray-900">{dish.name}</span>
                    </div>
                  </td>

                  {/* Barcode */}
                  <td className="px-5 py-4">
                    {dish.barcode ? (
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-gray-700 bg-gray-100 px-2.5 py-1 rounded-md">
                          {dish.barcode}
                        </span>
                        <button
                          onClick={() => printBarcode(dish.name, dish.barcode!, dish.price)}
                          className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                          title="Chop etish"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </td>

                  {/* Narx */}
                  <td className="px-5 py-4 text-right">
                    <span className="font-bold text-gray-900">{fmt(dish.price)}</span>
                    <span className="text-xs text-gray-400 ml-1">so'm</span>
                  </td>

                  {/* Holat */}
                  <td className="px-5 py-4 text-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                      dish.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {dish.isActive ? 'Aktiv' : 'Nofaol'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => { setEditTarget(dish); setModalOpen(true); }}
                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteId(dish.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      <DishModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditTarget(null); }}
        onSave={handleSave}
        initial={editTarget}
      />

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">O'chirishni tasdiqlang</h3>
            <p className="text-sm text-gray-500 mb-6">
              Bu taom o'chiriladi va kassada ko'rinmaydi.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Bekor qilish
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
              >
                O'chirish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
