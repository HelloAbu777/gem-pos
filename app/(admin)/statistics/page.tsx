'use client';

import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, ShoppingCart, Banknote, CreditCard, Building2, Package, BarChart3 } from 'lucide-react';

/* ── Types ── */
interface Stats {
  totalRevenue: number;
  totalCash: number;
  totalCard: number;
  netProfit: number;
  revenueChange: number;
  salesCount: number;
  legalEntityRevenue: number;
  legalEntityCount: number;
  retailRevenue: number;
  retailCount: number;
}
interface TopProduct { name: string; quantity: number; revenue: number }
interface DailySale   { date: string; revenue: number }

const fmt    = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(n));
const fmtDay = (s: string) => new Date(s).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' });

type Range = 'today' | 'week' | 'month' | 'custom';

function getRange(r: Range, customStart?: string, customEnd?: string) {
  const now   = new Date();
  const today = now.toISOString().split('T')[0];
  if (r === 'today')  return { startDate: today, endDate: today };
  if (r === 'week') {
    const d = new Date(now); d.setDate(d.getDate() - 6);
    return { startDate: d.toISOString().split('T')[0], endDate: today };
  }
  if (r === 'month') {
    const d = new Date(now); d.setDate(1);
    return { startDate: d.toISOString().split('T')[0], endDate: today };
  }
  return { startDate: customStart || today, endDate: customEnd || today };
}

/* ── Stat Card ── */
function StatCard({ label, value, sub, icon: Icon, color, change }: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; color: string; change?: number;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
      {sub && <p className="text-xs text-gray-500">{sub}</p>}
      {change !== undefined && (
        <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {change >= 0 ? '+' : ''}{change.toFixed(1)}% oldingi davrdan
        </div>
      )}
    </div>
  );
}

/* ── Main ── */
export default function StatisticsPage() {
  const [range,       setRange]       = useState<Range>('week');
  const [customStart, setCustomStart] = useState('');
  const [customEnd,   setCustomEnd]   = useState('');
  const [loading,     setLoading]     = useState(false);
  const [stats,       setStats]       = useState<Stats | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [dailySales,  setDailySales]  = useState<DailySale[]>([]);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getRange(range, customStart, customEnd);
      const res  = await fetch(`/api/dashboard/stats?startDate=${startDate}&endDate=${endDate}`);
      const data = await res.json();
      if (data.stats) {
        setStats(data.stats);
        setTopProducts(data.topProducts || []);
        setDailySales(data.dailySales   || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [range, customStart, customEnd]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const maxRevenue = Math.max(...dailySales.map(d => d.revenue), 1);

  const rangeLabels: Record<Range, string> = {
    today: 'Bugun', week: 'Oxirgi 7 kun', month: 'Bu oy', custom: 'Ixtiyoriy',
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-7 h-7" />
            Statistika
          </h1>
          <p className="text-sm text-gray-500 mt-1">Savdo hisoboti va tahlil</p>
        </div>

        {/* Range selector */}
        <div className="flex items-center gap-2">
          {(['today','week','month','custom'] as Range[]).map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                range === r ? 'bg-gray-900 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}>
              {rangeLabels[r]}
            </button>
          ))}
        </div>
      </div>

      {/* Custom date range */}
      {range === 'custom' && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Dan:</label>
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Gacha:</label>
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <button onClick={fetchStats}
            className="px-4 py-1.5 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800">
            Ko'rish
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <svg className="animate-spin w-10 h-10 text-gray-300" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>
      ) : stats ? (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Jami daromad" value={`${fmt(stats.totalRevenue)} so'm`}
              sub={`${stats.salesCount} ta sotuv`} icon={TrendingUp}
              color="bg-gray-900" change={stats.revenueChange} />
            <StatCard label="Sof foyda" value={`${fmt(stats.netProfit)} so'm`}
              sub={stats.totalRevenue > 0 ? `Marja: ${((stats.netProfit/stats.totalRevenue)*100).toFixed(1)}%` : undefined}
              icon={TrendingUp} color="bg-green-600" />
            <StatCard label="Naqd to'lov" value={`${fmt(stats.totalCash)} so'm`}
              sub={stats.totalRevenue > 0 ? `${((stats.totalCash/stats.totalRevenue)*100).toFixed(0)}% ulush` : undefined}
              icon={Banknote} color="bg-blue-600" />
            <StatCard label="Karta to'lov" value={`${fmt(stats.totalCard)} so'm`}
              sub={stats.totalRevenue > 0 ? `${((stats.totalCard/stats.totalRevenue)*100).toFixed(0)}% ulush` : undefined}
              icon={CreditCard} color="bg-purple-600" />
          </div>

          {/* Oddiy savdo vs Y/Sh */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <ShoppingCart className="w-5 h-5 text-gray-500" />
                <p className="font-semibold text-gray-700">Oddiy savdo</p>
              </div>
              <p className="text-2xl font-bold text-gray-900 mb-1">{fmt(stats.retailRevenue)} <span className="text-sm font-normal text-gray-400">so'm</span></p>
              <p className="text-sm text-gray-500">{stats.retailCount} ta sotuv</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-5 h-5 text-blue-600" />
                <p className="font-semibold text-blue-700">Yuridik shaxs savdo (Y/Sh)</p>
              </div>
              <p className="text-2xl font-bold text-blue-800 mb-1">{fmt(stats.legalEntityRevenue)} <span className="text-sm font-normal text-blue-400">so'm</span></p>
              <p className="text-sm text-blue-600">{stats.legalEntityCount} ta sotuv</p>
            </div>
          </div>

          {/* Grafik + Top mahsulotlar */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Kunlik grafik */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Savdo dinamikasi</h3>
              {dailySales.length === 0 ? (
                <p className="text-gray-400 text-center py-8">Ma'lumot yo'q</p>
              ) : (
                <div className="space-y-2.5">
                  {dailySales.map((day, i) => {
                    const pct = (day.revenue / maxRevenue) * 100;
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-16 flex-shrink-0">{fmtDay(day.date)}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                          <div className="bg-gray-900 h-3 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-gray-700 w-24 text-right">
                          {fmt(day.revenue)} so'm
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Top mahsulotlar */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Top 5 mahsulot</h3>
              {topProducts.length === 0 ? (
                <p className="text-gray-400 text-center py-8">Ma'lumot yo'q</p>
              ) : (
                <div className="space-y-3">
                  {topProducts.map((p, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        i === 0 ? 'bg-yellow-100 text-yellow-700' :
                        i === 1 ? 'bg-gray-200 text-gray-700' :
                        i === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                        <p className="text-xs text-gray-500">{p.quantity} ta sotildi</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-gray-900">{fmt(p.revenue)}</p>
                        <p className="text-xs text-gray-400">so'm</p>
                      </div>
                      <Package className="w-4 h-4 text-gray-300 flex-shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-20 text-gray-400">
          <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p>Ma'lumot yuklanmadi</p>
        </div>
      )}
    </div>
  );
}
