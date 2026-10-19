'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Building2, Plus, Users, ShoppingCart, Package,
  X, Eye, EyeOff, RefreshCw, Edit2, TrendingUp,
} from 'lucide-react';

const fmt = (n: number) => new Intl.NumberFormat('de-DE').format(Math.round(n));

interface BranchUser { id: string; name: string; login: string; role: string; }
interface Branch {
  id: string; name: string; address?: string;
  createdAt: string;
  usersCount: number; productsCount: number; salesCount: number;
  todayAmount: number; todayCount: number;
  users: BranchUser[];
}

/* ── Yangi filial modali ── */
function CreateBranchModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    name: '', address: '',
    adminName: '', adminLogin: '', adminPassword: '',
  });
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim())          { setError('Filial nomi kiritilmagan'); return; }
    if (!form.adminLogin.trim())    { setError('Admin logini kiritilmagan'); return; }
    if (form.adminPassword.length < 4) { setError('Parol kamida 4 ta belgi bo\'lishi kerak'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/super-admin/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Xatolik'); return; }
      onSuccess();
      onClose();
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-indigo-900 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-300" />
            <h2 className="text-base font-bold text-white">Yangi filial yaratish</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-indigo-800 rounded-lg">
            <X className="w-4 h-4 text-indigo-300" />
          </button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>
          )}

          {/* Filial ma'lumotlari */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Filial ma&apos;lumotlari</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filial nomi <span className="text-red-500">*</span>
              </label>
              <input
                type="text" value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Masalan: Chilonzor filiali"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Manzil</label>
              <input
                type="text" value={form.address}
                onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                placeholder="Masalan: Toshkent, Chilonzor tumani"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Admin foydalanuvchi */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Filial admin foydalanuvchisi</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">F.I.O</label>
              <input
                type="text" value={form.adminName}
                onChange={e => setForm(p => ({ ...p, adminName: e.target.value }))}
                placeholder="Masalan: Abdullayev Ali"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Login <span className="text-red-500">*</span>
              </label>
              <input
                type="text" value={form.adminLogin}
                onChange={e => setForm(p => ({ ...p, adminLogin: e.target.value.trim() }))}
                placeholder="Masalan: chilonzor_admin"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Parol <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.adminPassword}
                  onChange={e => setForm(p => ({ ...p, adminPassword: e.target.value }))}
                  placeholder="Kamida 4 ta belgi"
                  className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
              Bekor qilish
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50">
              {loading ? 'Yaratilmoqda...' : 'Filial yaratish'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Filial tahrirlash modali ── */
function EditBranchModal({ branch, onClose, onSuccess }: {
  branch: Branch; onClose: () => void; onSuccess: () => void;
}) {
  const [form, setForm] = useState({ name: branch.name, address: branch.address || '' });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Filial nomi kiritilmagan'); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/super-admin/branches/${branch.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Xatolik'); return; }
      onSuccess();
      onClose();
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="bg-indigo-900 px-5 py-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-white">Filialni tahrirlash</h2>
          <button onClick={onClose} className="p-1 hover:bg-indigo-800 rounded-lg">
            <X className="w-4 h-4 text-indigo-300" />
          </button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filial nomi *</label>
            <input type="text" value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Manzil</label>
            <input type="text" value={form.address}
              onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
              Bekor qilish
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50">
              {loading ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── ASOSIY SAHIFA ── */
export default function BranchesPage() {
  const [branches,     setBranches]     = useState<Branch[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [showCreate,   setShowCreate]   = useState(false);
  const [editBranch,   setEditBranch]   = useState<Branch | null>(null);
  const [expandedId,   setExpandedId]   = useState<string | null>(null);

  const fetchBranches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/super-admin/branches');
      if (res.ok) setBranches(await res.json());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchBranches(); }, [fetchBranches]);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Filiallar</h1>
          <p className="text-sm text-gray-500 mt-0.5">{branches.length} ta filial ro&apos;yxatda</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchBranches} disabled={loading}
            className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 active:scale-95 transition-all">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Yangi filial</span>
            <span className="sm:hidden">Qo&apos;shish</span>
          </button>
        </div>
      </div>

      {/* Filiallar ro'yxati */}
      {loading ? (
        <div className="flex justify-center py-16">
          <svg className="animate-spin w-8 h-8 text-indigo-400" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>
      ) : branches.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p>Hali filial yo&apos;q</p>
        </div>
      ) : (
        <div className="space-y-3">
          {branches.map(branch => {
            const isExp = expandedId === branch.id;
            return (
              <div key={branch.id}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-indigo-200 transition-colors">
                {/* Branch card header */}
                <div className="p-4 flex items-start gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Building2 className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-bold text-gray-900 text-base leading-tight">{branch.name}</h3>
                        {branch.address && (
                          <p className="text-xs text-gray-400 mt-0.5">{branch.address}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button onClick={() => setEditBranch(branch)}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setExpandedId(isExp ? null : branch.id)}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                          <Users className={`w-4 h-4 transition-transform ${isExp ? 'text-indigo-600' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {/* Stats qatori */}
                    <div className="flex flex-wrap gap-3 mt-2.5">
                      <StatChip icon={<Users className="w-3.5 h-3.5" />} label={`${branch.usersCount} foydalanuvchi`} />
                      <StatChip icon={<Package className="w-3.5 h-3.5" />} label={`${branch.productsCount} mahsulot`} />
                      <StatChip icon={<ShoppingCart className="w-3.5 h-3.5" />} label={`${branch.salesCount} sotuv`} />
                      {branch.todayAmount > 0 && (
                        <StatChip
                          icon={<TrendingUp className="w-3.5 h-3.5 text-green-500" />}
                          label={`Bugun: ${fmt(branch.todayAmount)} so'm (${branch.todayCount} ta)`}
                          green
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Foydalanuvchilar (expand) */}
                {isExp && (
                  <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Foydalanuvchilar
                    </p>
                    {branch.users.length === 0 ? (
                      <p className="text-sm text-gray-400">Foydalanuvchi yo&apos;q</p>
                    ) : (
                      <div className="space-y-1.5">
                        {branch.users.map(u => (
                          <div key={u.id}
                            className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-100">
                            <div>
                              <span className="text-sm font-medium text-gray-900">{u.name}</span>
                              <span className="text-xs text-gray-400 ml-2 font-mono">{u.login}</span>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                              u.role === 'ADMIN' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {u.role}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <CreateBranchModal onClose={() => setShowCreate(false)} onSuccess={fetchBranches} />
      )}
      {editBranch && (
        <EditBranchModal branch={editBranch} onClose={() => setEditBranch(null)} onSuccess={fetchBranches} />
      )}
    </div>
  );
}

function StatChip({ icon, label, green }: { icon: React.ReactNode; label: string; green?: boolean }) {
  return (
    <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
      green ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
    }`}>
      {icon}{label}
    </span>
  );
}
