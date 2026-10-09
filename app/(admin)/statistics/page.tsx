'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, ShoppingCart, Banknote,
  CreditCard, Building2, Package, BarChart2, Users,
  Calendar, ArrowUpRight, ArrowDownRight, ChevronLeft,
  ChevronRight, X, ChevronDown, ChevronUp,
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

interface SaleItem {
  id: string; itemName: string; quantity: number; priceAtSale: number;
  product: { name: string } | null;
}
interface SaleDetail {
  id: string; totalAmount: number; paymentType: string;
  cashAmount: number | null; cardAmount: number | null;
  saleType: string; createdAt: string;
  cashier: { id: string; name: string };
  legalEntity: { id: string; name: string; phone: string } | null;
  saleItems: SaleItem[];
}
interface DayData {
  date: string; day: number;
  total: number; cash: number; card: number;
  salesCount: number; retail: number; legalEntity: number;
  sales: SaleDetail[];
}
interface MonthlySummary {
  total: number; cash: number; card: number;
  salesCount: number; retail: number; legalEntity: number;
  activeDays: number; avgPerDay: number;
}
interface MonthlyData {
  year: number; month: number; daysInMonth: number;
  summary: MonthlySummary;
  days: DayData[];
}

const fmt    = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(n));
const fmtDay = (s: string) => {
  const d = new Date(s);
  return d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' });
};

const OY_NOMLARI = [
  'Yanvar','Fevral','Mart','Aprel','May','Iyun',
  'Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr',
];
const HAFTA = ['Ya','Du','Se','Ch','Pa','Ju','Sh'];

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
function BarChart({ data }: { data: DailySale[] }) {
  if (!data.length) return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-300">
      <BarChart2 className="w-12 h-12 mb-2" />
      <p className="text-sm">Ma&apos;lumot yo&apos;q</p>
    </div>
  );
  const max        = Math.max(...data.map(d => d.revenue), 1);
  const totalRev   = data.reduce((s, d) => s + d.revenue, 0);
  const avgRev     = totalRev / data.length;
  const peakDay    = data.reduce((a, b) => b.revenue > a.revenue ? b : a, data[0]);

  return (
    <div>
      <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
        <span>Eng yuqori: <b className="text-gray-700">{fmtDay(peakDay.date)} — {fmt(peakDay.revenue)} so'm</b></span>
        <span>O'rtacha: <b className="text-gray-700">{fmt(avgRev)} so'm</b></span>
      </div>
      <div className="flex items-end gap-1 h-40">
        {data.map((day, i) => {
          const h = max > 0 ? (day.revenue / max) * 100 : 0;
          const isPeak = day.date === peakDay.date;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
              <div className="relative w-full flex items-end justify-center" style={{ height: '136px' }}>
                {day.revenue > 0 && (
                  <div className="absolute bottom-full mb-1 hidden group-hover:block z-10 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                    {fmtDay(day.date)}: {fmt(day.revenue)} so'm
                  </div>
                )}
                <div
                  className={`w-full rounded-t transition-all ${isPeak ? 'bg-gray-900' : day.revenue > 0 ? 'bg-gray-400 group-hover:bg-gray-600' : 'bg-gray-100'}`}
                  style={{ height: `${Math.max(h, day.revenue > 0 ? 4 : 2)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
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
  );
}

/* ── Sparkline ── */
function Sparkline({ data }: { data: DailySale[] }) {
  if (data.length < 2) return null;
  const max  = Math.max(...data.map(d => d.revenue), 1);
  const w = 80; const h = 28;
  const step = w / (data.length - 1);
  const pts  = data.map((d, i) => {
    const x = i * step;
    const y = h - (d.revenue / max) * (h - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const up = data[data.length - 1].revenue >= data[0].revenue;
  return (
    <svg width={w} height={h} className="mt-1">
      <polyline points={pts} fill="none"
        stroke={up ? '#16a34a' : '#dc2626'}
        strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/* ══════════════════════════════════════════════════════
   OY BO'YICHA 30 KUNLIK JADVAL KOMPONENTI
══════════════════════════════════════════════════════ */

/* Oy tanlash modal */
function MonthPickerModal({
  year, month, onSelect, onClose,
}: {
  year: number; month: number;
  onSelect: (y: number, m: number) => void;
  onClose: () => void;
}) {
  const [viewYear, setViewYear] = useState(year);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-80 p-5" onClick={e => e.stopPropagation()}>
        {/* Yil navigatsiya */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setViewYear(v => v - 1)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <span className="font-bold text-gray-900 text-lg">{viewYear}</span>
          <button onClick={() => setViewYear(v => v + 1)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Oylar grid */}
        <div className="grid grid-cols-3 gap-2">
          {OY_NOMLARI.map((name, i) => {
            const m        = i + 1;
            const isCur    = viewYear === year && m === month;
            const now      = new Date();
            const isFuture = viewYear > now.getFullYear() ||
              (viewYear === now.getFullYear() && m > now.getMonth() + 1);
            return (
              <button key={m}
                disabled={isFuture}
                onClick={() => { onSelect(viewYear, m); onClose(); }}
                className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isCur
                    ? 'bg-gray-900 text-white shadow-md'
                    : isFuture
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'hover:bg-gray-100 text-gray-700'
                }`}>
                {name}
              </button>
            );
          })}
        </div>

        <button onClick={onClose}
          className="mt-4 w-full py-2 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50">
          Bekor qilish
        </button>
      </div>
    </div>
  );
}

/* Kun detali panel */
function DayDetailPanel({ day, onClose }: { day: DayData; onClose: () => void }) {
  const date = new Date(day.date);
  const weekDay = HAFTA[date.getDay()];
  const hasLE = day.sales.some(s => s.legalEntity);

  return (
    <div className="border border-gray-200 rounded-xl bg-gray-50 p-4 mt-1 animate-in fade-in slide-in-from-top-2 duration-200">
      {/* Panel header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="font-bold text-gray-900">
            {weekDay}, {day.day} {OY_NOMLARI[date.getMonth()]}
          </span>
          <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
            {day.salesCount} ta sotuv
          </span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-lg transition-colors">
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Umumiy raqamlar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        {[
          { label: 'Jami', value: day.total, color: 'bg-gray-900 text-white' },
          { label: 'Naqd', value: day.cash,  color: 'bg-green-50 text-green-800 border border-green-200' },
          { label: 'Karta', value: day.card, color: 'bg-blue-50 text-blue-800 border border-blue-200' },
          { label: 'Y/Sh', value: day.legalEntity, color: 'bg-purple-50 text-purple-800 border border-purple-200' },
        ].map(item => (
          <div key={item.label} className={`rounded-xl p-3 ${item.color}`}>
            <p className="text-xs opacity-70 mb-0.5">{item.label}</p>
            <p className="font-bold text-sm">{fmt(item.value)} so'm</p>
          </div>
        ))}
      </div>

      {/* Sotuvlar ro'yxati */}
      {day.sales.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">Bu kunda sotuv yo&apos;q</p>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {day.sales.map((sale, idx) => {
            const time = new Date(sale.createdAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
            const isLE = sale.saleType === 'LEGAL_ENTITY' || !!sale.legalEntity;
            return (
              <div key={sale.id} className="bg-white rounded-xl border border-gray-200 p-3">
                {/* Sotuv header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 font-mono">#{idx + 1}</span>
                    <span className="text-xs text-gray-400">{time}</span>
                    {/* To'lov turi */}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      sale.paymentType === 'CASH'  ? 'bg-green-100 text-green-700' :
                      sale.paymentType === 'CARD'  ? 'bg-blue-100 text-blue-700' :
                                                      'bg-orange-100 text-orange-700'
                    }`}>
                      {sale.paymentType === 'CASH' ? 'Naqd' : sale.paymentType === 'CARD' ? 'Karta' : 'Aralash'}
                    </span>
                    {/* Y/Sh belgisi */}
                    {isLE && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">
                        Y/Sh
                      </span>
                    )}
                  </div>
                  <span className="font-bold text-gray-900 text-sm">{fmt(sale.totalAmount)} so'm</span>
                </div>

                {/* Kassir va Y/Sh */}
                <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-2">
                  <span>👤 {sale.cashier.name}</span>
                  {sale.legalEntity && (
                    <span className="text-purple-600 font-medium">
                      🏢 {sale.legalEntity.name} — {sale.legalEntity.phone}
                    </span>
                  )}
                  {sale.paymentType === 'MIXED' && (
                    <span>
                      Naqd: {fmt(sale.cashAmount ?? 0)} | Karta: {fmt(sale.cardAmount ?? 0)}
                    </span>
                  )}
                </div>

                {/* Mahsulotlar */}
                <div className="space-y-1">
                  {sale.saleItems.map((item, ii) => (
                    <div key={ii} className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 rounded-lg px-2 py-1">
                      <span className="truncate max-w-[60%]">{item.product?.name || item.itemName}</span>
                      <span className="text-gray-400">{item.quantity} × {fmt(item.priceAtSale)}</span>
                      <span className="font-medium text-gray-700">{fmt(item.quantity * item.priceAtSale)}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* Asosiy oy statistikasi komponenti */
function MonthlyStatsSection() {
  const now = new Date();
  const [year,        setYear]        = useState(now.getFullYear());
  const [month,       setMonth]       = useState(now.getMonth() + 1);
  const [pickerOpen,  setPickerOpen]  = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [data,        setData]        = useState<MonthlyData | null>(null);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setExpandedDay(null);
    try {
      const res  = await fetch(`/api/dashboard/daily-sales?year=${year}&month=${month}`);
      const json = await res.json();
      if (!json.error) setData(json);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [year, month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDayClick = (day: number) => {
    setExpandedDay(prev => prev === day ? null : day);
  };

  const maxDaily = data ? Math.max(...data.days.map(d => d.total), 1) : 1;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-500" />
          Oylik statistika
        </h3>

        {/* Oy tanlash tugmasi */}
        <button
          onClick={() => setPickerOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-semibold text-gray-800 transition-colors"
        >
          <Calendar className="w-4 h-4" />
          {OY_NOMLARI[month - 1]} {year}
          <ChevronDown className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Oy summary kartalar */}
      {data && !loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-gray-100">
          {[
            { label: 'Jami daromad',   value: data.summary.total,      sub: `${data.summary.salesCount} ta sotuv`, color: 'text-gray-900' },
            { label: 'Naqd',           value: data.summary.cash,       sub: data.summary.total > 0 ? `${((data.summary.cash/data.summary.total)*100).toFixed(0)}%` : '—', color: 'text-green-700' },
            { label: 'Karta',          value: data.summary.card,       sub: data.summary.total > 0 ? `${((data.summary.card/data.summary.total)*100).toFixed(0)}%` : '—', color: 'text-blue-700' },
            { label: 'Faol kunlar',    value: data.summary.activeDays, sub: `O'rtacha: ${fmt(data.summary.avgPerDay)} so'm`, color: 'text-gray-700', isCount: true },
          ].map(item => (
            <div key={item.label} className="bg-white px-4 py-3">
              <p className="text-xs text-gray-500 mb-1">{item.label}</p>
              <p className={`text-xl font-bold ${item.color}`}>
                {item.isCount ? item.value : fmt(item.value as number)}
                {!item.isCount && <span className="text-xs font-normal text-gray-400 ml-1">so'm</span>}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{item.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Jadval */}
      <div className="p-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <svg className="animate-spin w-8 h-8 text-gray-300" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
          </div>
        ) : !data ? null : (
          <div className="space-y-1">
            {/* Jadval sarlavhasi */}
            <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              <div className="col-span-1">Kun</div>
              <div className="col-span-2">Hafta</div>
              <div className="col-span-3">Jami summa</div>
              <div className="col-span-2">Naqd</div>
              <div className="col-span-2">Karta</div>
              <div className="col-span-1 text-center">Sotuv</div>
              <div className="col-span-1 text-center">↕</div>
            </div>

            {data.days.map(day => {
              const date     = new Date(day.date);
              const weekDay  = HAFTA[date.getDay()];
              const isToday  = day.date === new Date().toISOString().split('T')[0];
              const isEmpty  = day.salesCount === 0;
              const isOpen   = expandedDay === day.day;
              const barWidth = day.total > 0 ? (day.total / maxDaily) * 100 : 0;

              return (
                <div key={day.day}>
                  <div
                    onClick={() => !isEmpty && handleDayClick(day.day)}
                    className={`grid grid-cols-12 gap-2 px-3 py-2.5 rounded-xl transition-colors items-center ${
                      isEmpty
                        ? 'opacity-40 cursor-default'
                        : 'cursor-pointer hover:bg-gray-50 active:bg-gray-100'
                    } ${isToday ? 'ring-2 ring-gray-900 ring-inset bg-gray-50' : ''}
                      ${isOpen ? 'bg-gray-50' : ''}`}
                  >
                    {/* Kun raqami */}
                    <div className="col-span-1">
                      <span className={`text-sm font-bold ${isToday ? 'text-gray-900' : 'text-gray-600'}`}>
                        {day.day}
                      </span>
                      {isToday && <span className="block text-xs text-orange-500 font-medium leading-none">bugun</span>}
                    </div>

                    {/* Hafta kuni */}
                    <div className="col-span-2 text-sm text-gray-500">{weekDay}</div>

                    {/* Jami — progress bar bilan */}
                    <div className="col-span-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5 max-w-16">
                          <div className="bg-gray-700 h-1.5 rounded-full" style={{ width: `${barWidth}%` }} />
                        </div>
                        <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                          {isEmpty ? '—' : `${fmt(day.total)}`}
                        </span>
                      </div>
                    </div>

                    {/* Naqd */}
                    <div className="col-span-2 text-sm text-green-700 font-medium">
                      {isEmpty ? '—' : fmt(day.cash)}
                    </div>

                    {/* Karta */}
                    <div className="col-span-2 text-sm text-blue-700 font-medium">
                      {isEmpty ? '—' : fmt(day.card)}
                    </div>

                    {/* Sotuv soni */}
                    <div className="col-span-1 text-center">
                      {isEmpty ? (
                        <span className="text-xs text-gray-300">0</span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-gray-900 text-white text-xs font-bold rounded-full">
                          {day.salesCount}
                        </span>
                      )}
                    </div>

                    {/* Ochish/yopish */}
                    <div className="col-span-1 text-center">
                      {!isEmpty && (
                        isOpen
                          ? <ChevronUp className="w-4 h-4 text-gray-400 mx-auto" />
                          : <ChevronDown className="w-4 h-4 text-gray-400 mx-auto" />
                      )}
                    </div>
                  </div>

                  {/* Kun detali */}
                  {isOpen && (
                    <DayDetailPanel
                      day={day}
                      onClose={() => setExpandedDay(null)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Oy tanlash modal */}
      {pickerOpen && (
        <MonthPickerModal
          year={year} month={month}
          onSelect={(y, m) => { setYear(y); setMonth(m); }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   ASOSIY SAHIFA
══════════════════════════════════════════════════════ */
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
        <div className="flex gap-1.5 bg-gray-100 rounded-xl p-1">
          {RANGES.map(r => (
            <button key={r.key} onClick={() => setRange(r.key)}
              className={`px-3.5 py-1.5 text-sm rounded-lg font-medium transition-all ${
                range === r.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom date */}
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

      {/* ══ OYLIK JADVAL (har doim ko'rsatiladi) ══ */}
      <MonthlyStatsSection />

      {/* ══ QISQA DAVR STATISTIKASI ══ */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <svg className="animate-spin w-10 h-10 text-gray-300" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
          <p className="text-gray-400 mt-3 text-sm">Yuklanmoqda...</p>
        </div>
      ) : !stats ? null : (
        <>
          {/* Stat Cards */}
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

          {/* Oddiy / Y/Sh */}
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
              {stats.totalRevenue > 0 && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Jami savdodagi ulushi</span>
                    <span>{((stats.retailRevenue/stats.totalRevenue)*100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-gray-900 h-2 rounded-full"
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
                    <div className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${(stats.legalEntityRevenue/stats.totalRevenue)*100}%` }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Grafik */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                Savdo dinamikasi
              </h3>
              <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">{rangeLabel}</span>
            </div>
            <BarChart data={dailySales} />
          </div>

          {/* Top mahsulotlar + To'lov taqsimoti */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Package className="w-4 h-4 text-gray-500" />
                Eng ko&apos;p sotilgan
                <span className="text-xs text-gray-400 font-normal ml-1">({rangeLabel})</span>
              </h3>
              {topProducts.length === 0 ? (
                <div className="py-8 text-center text-gray-300">
                  <Users className="w-10 h-10 mx-auto mb-2" /><p className="text-sm">Sotuv yo&apos;q</p>
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
                            <div className={`h-1.5 rounded-full ${
                              i === 0 ? 'bg-yellow-400' : i === 1 ? 'bg-gray-400' :
                              i === 2 ? 'bg-orange-400' : 'bg-blue-400'
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
                  <CreditCard className="w-10 h-10 mx-auto mb-2" /><p className="text-sm">Sotuv yo&apos;q</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {[
                    { label: 'Naqd pul', value: stats.totalCash, pct: (stats.totalCash/stats.totalRevenue)*100, color: 'bg-green-500', icon: Banknote, tc: 'text-green-700' },
                    { label: 'Karta',    value: stats.totalCard, pct: (stats.totalCard/stats.totalRevenue)*100, color: 'bg-blue-500',  icon: CreditCard, tc: 'text-blue-700' },
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
                        <div className={`${color} h-3 rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  ))}
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Jami daromad</span>
                      <span className="text-lg font-bold text-gray-900">{fmt(stats.totalRevenue)} <span className="text-sm font-normal text-gray-400">so'm</span></span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Sotuvlar soni</span>
                      <span className="text-lg font-bold text-gray-900">{stats.salesCount}</span>
                    </div>
                    {stats.salesCount > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">O&apos;rtacha chek</span>
                        <span className="text-lg font-bold text-gray-900">{fmt(stats.totalRevenue / stats.salesCount)} <span className="text-sm font-normal text-gray-400">so'm</span></span>
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
