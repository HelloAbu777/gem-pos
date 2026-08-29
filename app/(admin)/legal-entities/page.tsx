'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Phone, Building2, Trash2, Pencil, X, TrendingUp, ShoppingBag } from 'lucide-react';

interface LegalEntity {
  id: string;
  name: string;
  phone: string;
  salesCount: number;
  totalAmount: number;
  createdAt: string;
}

const fmt = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(n));
const fmtDate = (d: string) => new Date(d).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' });

/* ── Modal ── */
function Modal({
  open, onClose, onSave, initial,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (name: string, phone: string) => Promise<void>;
  initial?: { name: string; phone: string } | null;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? '');
      setPhone(initial?.phone ?? '');
      setError('');
    }
  }, [open, initial]);

  const handleSave = async () => {
    if (!name.trim()) { setError('Ism kiritilmagan'); return; }
    if (!phone.trim()) { setError('Telefon raqam kiritilmagan'); return; }
    setSaving(true);
    try {
      await onSave(name.trim(), phone.trim());
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
          <h2 className="text-lg font-bold text-gray-900">
            {initial ? 'Tahrirlash' : 'Yangi yuridik shaxs'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tashkilot / Shaxs ismi <span className="text-red-500">*</span>
            </label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="Masalan: Anvar Karimov yoki OOO RahnaMo"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telefon raqam <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="+998 90 123 45 67"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
            />
          </div>

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
            className="flex-1 px-4 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            {saving ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function LegalEntitiesPage() {
  const [entities, setEntities] = useState<LegalEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<LegalEntity | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchEntities = useCallback(async () => {
    try {
      const res = await fetch('/api/legal-entities');
      const data = await res.json();
      setEntities(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEntities(); }, [fetchEntities]);

  const handleAdd = async (name: string, phone: string) => {
    const res = await fetch('/api/legal-entities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone }),
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || 'Xatolik');
    }
    await fetchEntities();
  };

  const handleEdit = async (name: string, phone: string) => {
    if (!editTarget) return;
    const res = await fetch(`/api/legal-entities/${editTarget.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone }),
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || 'Xatolik');
    }
    await fetchEntities();
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/legal-entities/${id}`, { method: 'DELETE' });
    if (res.ok) { setDeleteId(null); fetchEntities(); }
  };

  const totalSales = entities.reduce((s, e) => s + e.totalAmount, 0);
  const totalCount = entities.reduce((s, e) => s + e.salesCount, 0);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-7 h-7" />
            Yuridik Shaxslar
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Tovar sotilgan tashkilot va shaxslar ro'yxati
          </p>
        </div>
        <button
          onClick={() => { setEditTarget(null); setModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Yangi qo'shish
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Jami yuridik shaxslar</p>
          <p className="text-2xl font-bold text-gray-900">{entities.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Jami sotuvlar (Y/Sh)</p>
          <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Jami summa (Y/Sh)</p>
          <p className="text-2xl font-bold text-gray-900">{fmt(totalSales)} <span className="text-sm font-normal text-gray-400">so'm</span></p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <svg className="animate-spin w-8 h-8 text-gray-300" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
        ) : entities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Building2 className="w-12 h-12 mb-3 text-gray-200" />
            <p className="font-medium">Hali yuridik shaxs yo'q</p>
            <p className="text-sm mt-1">Yuqoridagi tugmani bosib qo'shing</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Ism / Tashkilot</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Telefon</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Sotuvlar</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Jami summa</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Qo'shilgan</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entities.map(e => (
                <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-blue-600">
                          {e.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="font-medium text-gray-900">{e.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      {e.phone}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">{e.salesCount}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                      <span className="text-sm font-semibold text-gray-900">{fmt(e.totalAmount)}</span>
                      <span className="text-xs text-gray-400">so'm</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-500">{fmtDate(e.createdAt)}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => { setEditTarget(e); setModalOpen(true); }}
                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteId(e.id)}
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

      {/* Add / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditTarget(null); }}
        onSave={editTarget ? handleEdit : handleAdd}
        initial={editTarget}
      />

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">O'chirishni tasdiqlang</h3>
            <p className="text-sm text-gray-500 mb-6">
              Bu yuridik shaxs o'chiriladi. Bog'liq sotuvlar saqlanib qoladi.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
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
