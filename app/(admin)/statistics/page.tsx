'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, ShoppingCart, Banknote,
  CreditCard, Building2, Package, BarChart2, Users,
  Calendar, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';

/* ── Types ── */
interface Stats {
  totalRevenue: number; totalCash: number; totalCard: number;
  netProfit: number; revenueChange: number; salesCount: number;
  legalEntityRevenue: number; legalEntityCount: number;
  retailRevenue: number; retailCount: number;
}
interface TopProduct { name: string; quantity: number; revenue: number }
interface DailySale   { date: string; revenue: number }

const fmt    = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(n));
const fmtDay = (s: string) => {
  const d = new Date(s);
  return d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' });
};
const fmtFull = (s: string) => {
  const d = new Date(s);
  return d.toLocaleDateString('uz-UZ', { weekday: 'short', day: 'numeric', month: 'short' });
};

type RangeKey = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

const RANGES: { key: RangeKey; label: string }[] = [
  { key: 'today',     label: 'Bugun' },
  { key: 'yesterday', label: 'Kecha' },
  { key: 'week',      label: '7 kun' },
  { key: 'month',     label: '30 kun' },
  { key: 'custom',    label: 'Maxsus' },
];

function getDates(r: RangeKey, cs: string, ce: string) {
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
  return { startDate: cs || today, endDate: ce || today };
}

/* ── Stat Card ── */
function StatCard({ label, value, sub, icon: Icon, bg, change, changeLabel }: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; bg: string;
  change?: number; changeLabel?: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${bg}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-0.5">{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
      {change !== undefined && (
        <div className={`flex items-center gap-1 mt-2 text-xs font-semibold ${change >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          {change >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
          {change >= 0 ? '+' : ''}{change.toFixed(1)}%
          <span className="text-gray-400 font-normal ml-0.5">{changeLabel ?? 'oldingi davrdan'}</span>
        </div>
      )}
    </div>
  );
}

/* ── Bar Chart ── */
function BarChart({ data, label }: { data: DailySale[]; label: string }) {
  if (!data.length) return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-300">
      <BarChart2 className="w-12 h-12 mb-2" />
      <p className="text-sm">Ma&apos;lumot yo&apos;q</p>
    </div>
  );

  const max = Math.max(...data.map(d => d.revenue), 1);
  const totalRevenue = data.reduce((s, d) => s + d.revenue, 0);
  const avgRevenue   = totalRevenue / data.length;
  const peakDay      = data.reduce((a, b) => b.revenue > a.revenue ? b : a, data[0]);

  return (
    <div>
      {/* Summary mini cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500 mb-0.5">Jami</p>
          <p className="text-sm font-bold text-gray-900">{fmt(totalRevenue)}</p>
          <p className="text-xs text-gray-400">so&apos;m</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500 mb-0.5">O&apos;rtacha/kun</p>
          <p className="text-sm font-bold text-gray-900">{fmt(avgRevenue)}</p>
          <p className="text-xs text-gray-400">so&apos;m</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500 mb-0.5">Eng yaxshi kun</p>
          <p className="text-sm font-bold text-green-700">{peakDay.revenue > 0 ? fmtDay(peakDay.date) : '—'}</p>
          <p className="text-xs text-gray-400">{fmt(peakDay.revenue)} so&apos;m</p>
        </div>
      </div>

      {/* Chart */}
      <div className="relative">
        <p className="text-xs font-medium text-gray-500 mb-3">{label}</p>

        {/* Y axis labels */}
        <div className="flex gap-2">
          <div className="flex flex-col justify-between text-right w-16 flex-shrink-0 py-1">
            {[max, max * 0.75, max * 0.5, max * 0.25, 0].map((v, i) => (
              <span key={i} className="text-xs text-gray-400">{v > 0 ? (v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : fmt(v)) : '0'}</span>
            ))}
          </div>

          {/* Bars */}
          <div className="flex-1 relative">
            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} className="border-t border-dashed border-gray-100 w-full" />
              ))}
            </div>

            <div className="flex items-end gap-1 h-48 relative">
              {data.map((day, i) => {
                const h    = max > 0 ? (day.revenue / max) * 100 : 0;
                const isPeak = day.date === peakDay.date && day.revenue > 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded-lg px-2.5 py-1.5 opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10 transition-opacity">
                      <p className="font-semibold">{fmtFull(day.date)}</p>
                      <p className="text-green-300">{fmt(day.revenue)} so&apos;m</p>
                    </div>
                    {/* Bar */}
                    <div
                      className={`w-full rounded-t-md transition-all duration-500 ${
                        isPeak ? 'bg-gray-900' : 'bg-blue-400 group-hover:bg-blue-500'
                      }`}
                      style={{ height: `${Math.max(h, day.revenue > 0 ? 2 : 0)}%` }}
                    />
                  </div>
                );
              })}
            </div>

            {/* X axis labels */}
            <div className="flex gap-1 mt-2">
              {data.map((day, i) => {
                const show = data.length <= 10 || i % Math.ceil(data.length / 10) === 0 || i === data.length - 1;
                return (
                  <div key={i} className="flex-1 text-center">
                    {show && <span className="text-xs text-gray-400">{fmtDay(day.date)}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sparkline (mini trend) ── */
function Sparkline({ data }: { data: DailySale[] }) {
  if (data.length < 2) return null;
  const max  = Math.max(...data.map(d => d.revenue), 1);
  const w    = 80;
  const h    = 28;
  const step = w / (data.length - 1);
  const pts  = data.map((d, i) => {
    const x = i * step;
    const y = h - (d.revenue / max) * (h - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const last  = data[data.length - 1].revenue;
  const first = data[0].revenue;
  const up    = last >= first;

  return (
    <svg width={w} height={h} className="mt-1">
      <polyline
        points={pts}
        fill="none"
        stroke={up ? '#16a34a' : '#dc2626'}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ── Main ── */
export default function StatisticsPage() {
  const [range,       setRange]       = useState<RangeKey>('week');
  const [customStart, setCustomStart] = useState('');
  const [customEnd,   setCustomEnd]   = useState('');
  const [loading,     setLoading]     = useState(false);
  const [stats,       setStats]       = useState<Stats | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [dailySales,  setDailySales]  = useState<DailySale[]>([]);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setStats(null);
    try {
      const { startDate, endDate } = getDates(range, customStart, customEnd);
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

  useEffect(() => {
    if (range !== 'custom') fetchStats();
  }, [range, fetchStats]);

  const rangeLabel = RANGES.find(r => r.key === range)?.label ?? '';
  const maxProduct = Math.max(...topProducts.map(p => p.quantity), 1);

  return (
    <div className="p-5 max-w-6xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart2 className="w-7 h-7 text-gray-700" />
            Statistika
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">Savdo tahlili va ko&apos;rsatkichlar</p>
        </div>

        {/* Range selector */}
        <div className="flex gap-1.5 bg-gray-100 rounded-xl p-1">
          {RANGES.map(r => (
            <button key={r.key} onClick={() => setRange(r.key)}
              className={`px-3.5 py-1.5 text-sm rounded-lg font-medium transition-all ${
                range === r.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom date range */}
      {range === 'custom' && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Boshlanish sanasi</label>
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tugash sanasi</label>
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <button onClick={fetchStats}
            className="px-5 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800">
            Ko&apos;rish
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <svg className="animate-spin w-10 h-10 text-gray-300" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
          <p className="text-gray-400 mt-3 text-sm">Yuklanmoqda...</p>
        </div>
      ) : !stats ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <BarChart2 className="w-14 h-14 mb-3 text-gray-200" />
          <p>Ma&apos;lumot topilmadi</p>
        </div>
      ) : (
        <>
          {/* ── Stat Cards (2 rows) ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Jami daromad" value={`${fmt(stats.totalRevenue)} so'm`}
              sub={`${stats.salesCount} ta sotuv`} icon={TrendingUp} bg="bg-gray-900"
              change={stats.revenueChange} />
            <StatCard label="Sof foyda" value={`${fmt(stats.netProfit)} so'm`}
              sub={stats.totalRevenue > 0 ? `Marja ${((stats.netProfit/stats.totalRevenue)*100).toFixed(1)}%` : '—'}
              icon={TrendingUp} bg="bg-green-600" />
            <StatCard label="Naqd to'lov" value={`${fmt(stats.totalCash)} so'm`}
              sub={stats.totalRevenue > 0 ? `${((stats.totalCash/stats.totalRevenue)*100).toFixed(0)}% ulush` : '—'}
              icon={Banknote} bg="bg-blue-600" />
            <StatCard label="Karta to'lov" value={`${fmt(stats.totalCard)} so'm`}
              sub={stats.totalRevenue > 0 ? `${((stats.totalCard/stats.totalRevenue)*100).toFixed(0)}% ulush` : '—'}
              icon={CreditCard} bg="bg-purple-600" />
          </div>

          {/* ── Oddiy / Y/Sh ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <ShoppingCart className="w-4 h-4 text-gray-600" />
                  </div>
                  <p className="font-semibold text-gray-700">Oddiy savdo</p>
                </div>
                <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium">
                  {stats.retailCount} ta
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{fmt(stats.retailRevenue)}</p>
              <p className="text-xs text-gray-400 mt-0.5">so&apos;m</p>
              {dailySales.length > 1 && <Sparkline data={dailySales} />}
              {/* Progress bar vs total */}
              {stats.totalRevenue > 0 && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Jami savdodagi ulushi</span>
                    <span>{((stats.retailRevenue/stats.totalRevenue)*100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-gray-900 h-2 rounded-full transition-all"
                      style={{ width: `${(stats.retailRevenue/stats.totalRevenue)*100}%` }} />
                  </div>
                </div>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="font-semibold text-blue-700">Yuridik shaxs (Y/Sh)</p>
                </div>
                <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium">
                  {stats.legalEntityCount} ta
                </span>
              </div>
              <p className="text-2xl font-bold text-blue-800">{fmt(stats.legalEntityRevenue)}</p>
              <p className="text-xs text-blue-400 mt-0.5">so&apos;m</p>
              {stats.totalRevenue > 0 && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-blue-400 mb-1">
                    <span>Jami savdodagi ulushi</span>
                    <span>{((stats.legalEntityRevenue/stats.totalRevenue)*100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-blue-100 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${(stats.legalEntityRevenue/stats.totalRevenue)*100}%` }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Grafik ── */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                Savdo dinamikasi
              </h3>
              <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
                {rangeLabel}
              </span>
            </div>
            <BarChart data={dailySales} label={`${rangeLabel} savdo grafigi`} />
          </div>

          {/* ── Top mahsulotlar + To'lov taqsimoti ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Top mahsulotlar */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Package className="w-4 h-4 text-gray-500" />
                Eng ko&apos;p sotilgan
                <span className="text-xs text-gray-400 font-normal ml-1">({rangeLabel})</span>
              </h3>
              {topProducts.length === 0 ? (
                <div className="py-8 text-center text-gray-300">
                  <Users className="w-10 h-10 mx-auto mb-2" />
                  <p className="text-sm">Sotuv yo&apos;q</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {topProducts.map((p, i) => {
                    const pct = (p.quantity / maxProduct) * 100;
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          i === 0 ? 'bg-yellow-100 text-yellow-700' :
                          i === 1 ? 'bg-gray-200 text-gray-600' :
                          i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'
                        }`}>{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-gray-900 truncate pr-2">{p.name}</span>
                            <span className="text-gray-500 flex-shrink-0">{p.quantity} dona</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full transition-all ${
                              i === 0 ? 'bg-yellow-400' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-orange-400' : 'bg-blue-400'
                            }`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 w-20">
                          <p className="text-sm font-bold text-gray-900">{fmt(p.revenue)}</p>
                          <p className="text-xs text-gray-400">so&apos;m</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* To'lov taqsimoti */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-gray-500" />
                To&apos;lov taqsimoti
              </h3>
              {stats.totalRevenue === 0 ? (
                <div className="py-8 text-center text-gray-300">
                  <CreditCard className="w-10 h-10 mx-auto mb-2" />
                  <p className="text-sm">Sotuv yo&apos;q</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {[
                    { label: 'Naqd pul', value: stats.totalCash,  pct: stats.totalRevenue > 0 ? (stats.totalCash/stats.totalRevenue)*100 : 0,  color: 'bg-green-500', icon: Banknote, tc: 'text-green-700' },
                    { label: 'Karta',    value: stats.totalCard,  pct: stats.totalRevenue > 0 ? (stats.totalCard/stats.totalRevenue)*100 : 0,  color: 'bg-blue-500',  icon: CreditCard, tc: 'text-blue-700' },
                  ].map(({ label, value, pct, color, icon: Icon, tc }) => (
                    <div key={label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${tc}`} />
                          <span className="text-sm font-medium text-gray-700">{label}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-gray-900">{fmt(value)}</span>
                          <span className="text-xs text-gray-400 ml-1">so&apos;m</span>
                          <span className={`ml-2 text-xs font-semibold ${tc}`}>{pct.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-3">
                        <div className={`${color} h-3 rounded-full transition-all duration-700`}
                          style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  ))}

                  {/* Donut-style summary */}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-500">Jami daromad</span>
                      <div>
                        <span className="text-lg font-bold text-gray-900">{fmt(stats.totalRevenue)}</span>
                        <span className="text-sm text-gray-400 ml-1">so&apos;m</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm font-medium text-gray-500">Sotuvlar soni</span>
                      <span className="text-lg font-bold text-gray-900">{stats.salesCount}</span>
                    </div>
                    {stats.salesCount > 0 && (
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-sm font-medium text-gray-500">O&apos;rtacha chek</span>
                        <div>
                          <span className="text-lg font-bold text-gray-900">{fmt(stats.totalRevenue / stats.salesCount)}</span>
                          <span className="text-sm text-gray-400 ml-1">so&apos;m</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
