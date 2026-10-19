'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, Building2, ShoppingCart,
  DollarSign, Banknote, CreditCard, BarChart3, RefreshCw,
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

type Range = 'today' | 'yesterday' | 'week' | 'month';

function getRange(r: Range): { startDate: string; endDate: string } {
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
  const m = new Date(now); m.setDate(m.getDate() - 29);
  return { startDate: m.toISOString().split('T')[0], endDate: today };
}

const RANGE_LABELS: Record<Range, string> = {
  today: 'Bugun', yesterday: 'Kecha', week: '7 kun', month: '30 kun',
};

export default function SuperDashboard() {
  const [range,   setRange]   = useState<Range>('today');
  const [stats,   setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getRange(range);
      const res = await fetch(`/api/super-admin/stats?startDate=${startDate}&endDate=${endDate}&branchId=all`);
      if (res.ok) setStats(await res.json());
    } finally { setLoading(false); }
  }, [range]);

  const fetchBranches = useCallback(async () => {
    const res = await fetch('/api/super-admin/branches');
    if (res.ok) {
      const data = await res.json();
      setBranches(data.map((b: { id: string; name: string }) => ({ id: b.id, name: b.name })));
    }
  }, []);

  useEffect(() => { fetchStats(); fetchBranches(); }, [fetchStats, fetchBranches]);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Barcha filiallar umumiy ko&apos;rinishi</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Range tabs */}
          <div className="flex border border-gray-200 rounded-lg overflow-hidden">
            {(Object.keys(RANGE_LABELS) as Range[]).map(r => (
              <button key={r} onClick={() => setRange(r)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${range === r ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                {RANGE_LABELS[r]}
              </button>
            ))}
          </div>
          <button onClick={fetchStats} disabled={loading}
            className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
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
          {/* KPI kartochkalar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <KpiCard
              label="Jami daromad"
              value={`${fmt(stats.totalRevenue)} so'm`}
              change={stats.revenueChange}
              icon={<DollarSign className="w-5 h-5 text-indigo-500" />}
              color="indigo"
            />
            <KpiCard
              label="Sof foyda"
              value={`${fmt(stats.netProfit)} so'm`}
              icon={<TrendingUp className="w-5 h-5 text-green-500" />}
              color="green"
            />
            <KpiCard
              label="Naqd"
              value={`${fmt(stats.totalCash)} so'm`}
              icon={<Banknote className="w-5 h-5 text-yellow-500" />}
              color="yellow"
            />
            <KpiCard
              label="Karta"
              value={`${fmt(stats.totalCard)} so'm`}
              icon={<CreditCard className="w-5 h-5 text-blue-500" />}
              color="blue"
            />
          </div>

          {/* Qo'shimcha */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Jami sotuvlar soni</p>
              <p className="text-2xl font-bold text-gray-900">{stats.salesCount} ta</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Y/Sh savdo</p>
              <p className="text-2xl font-bold text-blue-600">{fmt(stats.leRevenue)} so&apos;m</p>
              <p className="text-xs text-gray-400 mt-0.5">{stats.leCount} ta sotuv</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Faol filiallar</p>
              <p className="text-2xl font-bold text-indigo-600">{branches.length} ta</p>
            </div>
          </div>

          {/* Filiallar bo'yicha taqsimot */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-500" />
              Filiallar bo&apos;yicha natijalar
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 pr-4 text-gray-500 font-medium">Filial</th>
                    <th className="text-right py-2 pr-4 text-gray-500 font-medium">Sotuvlar</th>
                    <th className="text-right py-2 pr-4 text-gray-500 font-medium">Daromad</th>
                    <th className="text-right py-2 pr-4 text-gray-500 font-medium">Foyda</th>
                    <th className="text-right py-2 text-gray-500 font-medium">Y/Sh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {stats.branchStats.map(b => (
                    <tr key={b.branchId} className="hover:bg-gray-50">
                      <td className="py-2.5 pr-4 font-medium text-gray-900">{b.branchName}</td>
                      <td className="py-2.5 pr-4 text-right text-gray-600">{b.salesCount}</td>
                      <td className="py-2.5 pr-4 text-right font-semibold">{fmt(b.totalRevenue)}</td>
                      <td className={`py-2.5 pr-4 text-right font-semibold ${b.netProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {b.netProfit >= 0 ? '+' : ''}{fmt(b.netProfit)}
                      </td>
                      <td className="py-2.5 text-right text-blue-600">{fmt(b.leRevenue)}</td>
                    </tr>
                  ))}
                  {stats.branchStats.length === 0 && (
                    <tr><td colSpan={5} className="py-6 text-center text-gray-400 text-sm">Bu davrda savdo yo&apos;q</td></tr>
                  )}
                </tbody>
                {stats.branchStats.length > 1 && (
                  <tfoot>
                    <tr className="border-t-2 border-gray-200">
                      <td className="py-2.5 font-bold text-gray-900">Jami</td>
                      <td className="py-2.5 pr-4 text-right font-bold">{stats.salesCount}</td>
                      <td className="py-2.5 pr-4 text-right font-bold">{fmt(stats.totalRevenue)}</td>
                      <td className={`py-2.5 pr-4 text-right font-bold ${stats.netProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {fmt(stats.netProfit)}
                      </td>
                      <td className="py-2.5 text-right font-bold text-blue-600">{fmt(stats.leRevenue)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Top mahsulotlar */}
          {stats.topProducts.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-500" />
                Top 5 mahsulot (barcha filiallar)
              </h2>
              <div className="space-y-3">
                {stats.topProducts.map((p, i) => {
                  const maxQty = stats.topProducts[0].quantity;
                  const pct    = Math.round((p.quantity / maxQty) * 100);
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-gray-400 w-4 text-center">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium text-gray-900 truncate">{p.name}</span>
                          <span className="text-xs text-gray-500 ml-2 flex-shrink-0">{p.quantity} dona</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
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

function KpiCard({ label, value, change, icon, color }: {
  label: string; value: string; change?: number; icon: React.ReactNode; color: string;
}) {
  const bg = {
    indigo: 'bg-indigo-50', green: 'bg-green-50',
    yellow: 'bg-yellow-50', blue: 'bg-blue-50',
  }[color] || 'bg-gray-50';

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <div className={`p-1.5 rounded-lg ${bg}`}>{icon}</div>
      </div>
      <p className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">{value}</p>
      {change !== undefined && (
        <div className={`flex items-center gap-1 mt-1.5 text-xs font-medium ${change >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          {change >= 0
            ? <TrendingUp className="w-3 h-3" />
            : <TrendingDown className="w-3 h-3" />}
          {Math.abs(change).toFixed(1)}% oldingi davrga nisbatan
        </div>
      )}
    </div>
  );
}
