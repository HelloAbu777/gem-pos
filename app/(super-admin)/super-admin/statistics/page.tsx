'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, TrendingUp, TrendingDown, Banknote,
  CreditCard, Building2, RefreshCw, DollarSign, ShoppingCart,
} from 'lucide-react';

const fmt = (n: number) => new Intl.NumberFormat('de-DE').format(Math.round(n));

interface BranchStat {
  branchId: string; branchName: string;
  salesCount: number; totalRevenue: number; netProfit: number; leRevenue: number;
}
interface Stats {
  totalRevenue: number; totalCash: number; totalCard: number;
  netProfit: number; revenueChange: number; salesCount: number;
  leRevenue: number; leCount: number;
  topProducts: { name: string; quantity: number; revenue: number }[];
  branchStats: BranchStat[];
  dailySales: { date: string; amount: number }[];
}

type Range = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

function getRange(r: Range, from?: string, to?: string) {
  const now   = new Date();
  const today = now.toISOString().split('T')[0];
  if (r === 'today')     return { startDate: today, endDate: today };
  if (r === 'yesterday') {
    const y = new Date(now); y.setDate(y.getDate() - 1);
    const ys = y.toISOString().split('T')[0];
    return { startDate: ys, endDate: ys };
  }
  if (r === 'week') {
    const w = new Date(now); w.setDate(w.getDate() - 6);
    return { startDate: w.toISOString().split('T')[0], endDate: today };
  }
  if (r === 'month') {
    const m = new Date(now); m.setDate(m.getDate() - 29);
    return { startDate: m.toISOString().split('T')[0], endDate: today };
  }
  return { startDate: from || today, endDate: to || today };
}

const RANGE_LABELS: Record<Range, string> = {
  today: 'Bugun', yesterday: 'Kecha', week: '7 kun', month: '30 kun', custom: 'Sana',
};

export default function SuperStatistics() {
  const [range,      setRange]      = useState<Range>('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo,   setCustomTo]   = useState('');
  const [branchId,   setBranchId]   = useState<string>('all');
  const [branches,   setBranches]   = useState<{ id: string; name: string }[]>([]);
  const [stats,      setStats]      = useState<Stats | null>(null);
  const [loading,    setLoading]    = useState(true);

  const fetchBranches = useCallback(async () => {
    const res = await fetch('/api/super-admin/branches');
    if (res.ok) {
      const data = await res.json();
      setBranches(data.map((b: { id: string; name: string }) => ({ id: b.id, name: b.name })));
    }
  }, []);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getRange(range, customFrom, customTo);
      if (range === 'custom' && (!customFrom || !customTo)) { setLoading(false); return; }
      const res = await fetch(
        `/api/super-admin/stats?startDate=${startDate}&endDate=${endDate}&branchId=${branchId}`
      );
      if (res.ok) setStats(await res.json());
    } finally { setLoading(false); }
  }, [range, branchId, customFrom, customTo]);

  useEffect(() => { fetchBranches(); }, [fetchBranches]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  // Kunlik max qiymat (grafik uchun)
  const maxDaily = stats?.dailySales.reduce((m, d) => Math.max(m, d.amount), 1) ?? 1;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Statistika</h1>
          <p className="text-sm text-gray-500 mt-0.5">Filial tanlang va davr kiriting</p>
        </div>
        <button onClick={fetchStats} disabled={loading}
          className="self-start sm:self-auto p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filterlar */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        {/* Range */}
        <div className="flex flex-wrap gap-2">
          {(Object.keys(RANGE_LABELS) as Range[]).map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                range === r ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>

        {/* Custom sana */}
        {range === 'custom' && (
          <div className="flex flex-wrap gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Boshlanish</label>
              <input type="date" value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tugash</label>
              <input type="date" value={customTo}
                onChange={e => setCustomTo(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>
        )}

        {/* Filial filtri */}
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <select value={branchId} onChange={e => setBranchId(e.target.value)}
            className="flex-1 max-w-xs px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
            <option value="all">Barcha filiallar</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <svg className="animate-spin w-8 h-8 text-indigo-400" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>
      ) : stats ? (
        <>
          {/* KPI */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KCard label="Daromad" value={`${fmt(stats.totalRevenue)} so'm`}
              icon={<DollarSign className="w-5 h-5 text-indigo-500" />}
              sub={`${stats.revenueChange >= 0 ? '+' : ''}${stats.revenueChange.toFixed(1)}%`}
              subGreen={stats.revenueChange >= 0}
            />
            <KCard label="Sof foyda" value={`${fmt(stats.netProfit)} so'm`}
              icon={<TrendingUp className="w-5 h-5 text-green-500" />}
              sub={`${stats.salesCount} ta sotuv`}
            />
            <KCard label="Naqd" value={`${fmt(stats.totalCash)} so'm`}
              icon={<Banknote className="w-5 h-5 text-yellow-500" />}
              sub={stats.totalRevenue > 0 ? `${Math.round((stats.totalCash / stats.totalRevenue) * 100)}%` : '—'}
            />
            <KCard label="Karta" value={`${fmt(stats.totalCard)} so'm`}
              icon={<CreditCard className="w-5 h-5 text-blue-500" />}
              sub={stats.totalRevenue > 0 ? `${Math.round((stats.totalCard / stats.totalRevenue) * 100)}%` : '—'}
            />
          </div>

          {/* Y/Sh */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="w-4 h-4 text-blue-600" />
                <p className="text-sm font-semibold text-blue-700">Yuridik shaxslar savdosi</p>
              </div>
              <p className="text-2xl font-bold text-blue-800">{fmt(stats.leRevenue)} so&apos;m</p>
              <p className="text-xs text-blue-500 mt-0.5">{stats.leCount} ta sotuv</p>
            </div>
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <ShoppingCart className="w-4 h-4 text-indigo-600" />
                <p className="text-sm font-semibold text-indigo-700">Chakana savdo</p>
              </div>
              <p className="text-2xl font-bold text-indigo-800">{fmt(stats.totalRevenue)} so&apos;m</p>
              <p className="text-xs text-indigo-500 mt-0.5">{stats.salesCount} ta sotuv</p>
            </div>
          </div>

          {/* Kunlik grafik */}
          {stats.dailySales.length > 1 && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-500" />
                Kunlik savdo dinamikasi
              </h2>
              <div className="flex items-end gap-1 h-32">
                {stats.dailySales.map(d => {
                  const pct = Math.max(4, (d.amount / maxDaily) * 100);
                  return (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group min-w-0">
                      <div className="relative w-full">
                        <div
                          className="w-full bg-indigo-500 rounded-sm hover:bg-indigo-600 transition-colors cursor-default"
                          style={{ height: `${pct * 1.2}px` }}
                        />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block
                          bg-gray-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10">
                          {d.date}: {fmt(d.amount)}
                        </div>
                      </div>
                      <span className="text-[9px] text-gray-400 truncate w-full text-center">
                        {d.date.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Filiallar bo'yicha (faqat "barcha" tanlanganda) */}
          {branchId === 'all' && stats.branchStats.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-500" />
                Filiallar bo&apos;yicha taqsimot
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 pr-3 text-gray-500 font-medium">Filial</th>
                      <th className="text-right py-2 pr-3 text-gray-500 font-medium">Sotuvlar</th>
                      <th className="text-right py-2 pr-3 text-gray-500 font-medium">Daromad</th>
                      <th className="text-right py-2 pr-3 text-gray-500 font-medium">Foyda</th>
                      <th className="text-right py-2 text-gray-500 font-medium hidden sm:table-cell">Y/Sh</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {stats.branchStats.map(b => (
                      <tr key={b.branchId} className="hover:bg-gray-50">
                        <td className="py-2.5 pr-3 font-medium text-gray-900">{b.branchName}</td>
                        <td className="py-2.5 pr-3 text-right text-gray-600">{b.salesCount}</td>
                        <td className="py-2.5 pr-3 text-right font-semibold">{fmt(b.totalRevenue)}</td>
                        <td className={`py-2.5 pr-3 text-right font-semibold ${b.netProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {b.netProfit >= 0 ? '+' : ''}{fmt(b.netProfit)}
                        </td>
                        <td className="py-2.5 text-right text-blue-600 hidden sm:table-cell">{fmt(b.leRevenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Top mahsulotlar */}
          {stats.topProducts.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-500" />
                Top 5 mahsulot
              </h2>
              <div className="space-y-3">
                {stats.topProducts.map((p, i) => {
                  const maxQty = stats.topProducts[0].quantity;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-gray-400 w-4 text-center">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium text-gray-900 truncate">{p.name}</span>
                          <span className="text-xs text-gray-500 ml-2 flex-shrink-0">{p.quantity} ta</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full"
                            style={{ width: `${Math.round((p.quantity / maxQty) * 100)}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-bold text-gray-700 w-24 text-right">{fmt(p.revenue)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20 text-gray-400">Ma&apos;lumot yuklanmadi</div>
      )}
    </div>
  );
}

function KCard({ label, value, icon, sub, subGreen }: {
  label: string; value: string; icon: React.ReactNode; sub?: string; subGreen?: boolean;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <div className="p-1.5 bg-gray-50 rounded-lg">{icon}</div>
      </div>
      <p className="text-base sm:text-lg font-bold text-gray-900 leading-tight">{value}</p>
      {sub && (
        <p className={`text-xs mt-1 font-medium flex items-center gap-0.5 ${subGreen !== undefined ? (subGreen ? 'text-green-600' : 'text-red-500') : 'text-gray-400'}`}>
          {subGreen !== undefined && (subGreen
            ? <TrendingUp className="w-3 h-3" />
            : <TrendingDown className="w-3 h-3" />
          )}
          {sub}
        </p>
      )}
    </div>
  );
}
