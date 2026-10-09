'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, ShoppingCart, Banknote, CreditCard,
  Building2, Package, BarChart2, Users, Calendar,
  ArrowUpRight, ArrowDownRight, ChevronLeft, ChevronRight,
  X, ChevronDown, ChevronUp,
} from 'lucide-react';

/* ════════════════════════════════════════
   TYPES
════════════════════════════════════════ */
interface Stats {
  totalRevenue: number; totalCash: number; totalCard: number;
  netProfit: number; revenueChange: number; salesCount: number;
  legalEntityRevenue: number; legalEntityCount: number;
  retailRevenue: number; retailCount: number;
}
interface TopProduct { name: string; quantity: number; revenue: number }
interface DailySale  { date: string; revenue: number }

interface SaleItem   { id: string; itemName: string; quantity: number; priceAtSale: number; product: { name: string } | null }
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

/* ════════════════════════════════════════
   HELPERS
════════════════════════════════════════ */
const fmt    = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(n));
const fmtDay = (s: string) => new Date(s).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' });

const OY_NOMLARI = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr'];
const HAFTA_QISQA = ['Ya','Du','Se','Ch','Pa','Ju','Sh'];

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
  if (r === 'yesterday') { const y = new Date(now); y.setDate(y.getDate()-1); const ys = y.toISOString().split('T')[0]; return { startDate: ys, endDate: ys }; }
  if (r === 'week')      { const w = new Date(now); w.setDate(w.getDate()-6); return { startDate: w.toISOString().split('T')[0], endDate: today }; }
  if (r === 'month')     { const m = new Date(now); m.setDate(m.getDate()-29); return { startDate: m.toISOString().split('T')[0], endDate: today }; }
  return { startDate: cs || today, endDate: ce || today };
}

/* ════════════════════════════════════════
   MINI COMPONENTS
════════════════════════════════════════ */
function StatCard({ label, value, sub, icon: Icon, bg, change }: {
  label: string; value: string; sub?: string; icon: React.ElementType; bg: string; change?: number;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
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
          {change >= 0 ? <ArrowUpRight className="w-3.5 h-3.5"/> : <ArrowDownRight className="w-3.5 h-3.5"/>}
          {change >= 0 ? '+' : ''}{change.toFixed(1)}%
          <span className="text-gray-400 font-normal ml-0.5">oldingi davrdan</span>
        </div>
      )}
    </div>
  );
}

function BarChart({ data }: { data: DailySale[] }) {
  if (!data.length) return <div className="flex flex-col items-center py-12 text-gray-300"><BarChart2 className="w-12 h-12 mb-2"/><p className="text-sm">Ma&apos;lumot yo&apos;q</p></div>;
  const max     = Math.max(...data.map(d => d.revenue), 1);
  const avg     = data.reduce((s,d) => s+d.revenue, 0) / data.length;
  const peakDay = data.reduce((a,b) => b.revenue > a.revenue ? b : a, data[0]);
  return (
    <div>
      <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
        <span>Eng yuqori: <b className="text-gray-700">{fmtDay(peakDay.date)} — {fmt(peakDay.revenue)} so&apos;m</b></span>
        <span>O&apos;rtacha: <b className="text-gray-700">{fmt(avg)} so&apos;m</b></span>
      </div>
      <div className="flex items-end gap-1 h-40">
        {data.map((day, i) => {
          const h = max > 0 ? (day.revenue/max)*100 : 0;
          const isPeak = day.date === peakDay.date;
          return (
            <div key={i} className="flex-1 flex flex-col items-center group">
              <div className="relative w-full flex items-end justify-center" style={{height:'136px'}}>
                {day.revenue > 0 && (
                  <div className="absolute bottom-full mb-1 hidden group-hover:block z-10 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                    {fmtDay(day.date)}: {fmt(day.revenue)} so&apos;m
                  </div>
                )}
                <div className={`w-full rounded-t transition-all ${isPeak ? 'bg-gray-900' : day.revenue > 0 ? 'bg-gray-400 group-hover:bg-gray-600' : 'bg-gray-100'}`}
                  style={{height:`${Math.max(h, day.revenue>0?4:2)}%`}}/>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-1 mt-2">
        {data.map((day,i) => {
          const show = data.length<=10 || i%Math.ceil(data.length/10)===0 || i===data.length-1;
          return <div key={i} className="flex-1 text-center">{show && <span className="text-xs text-gray-400">{fmtDay(day.date)}</span>}</div>;
        })}
      </div>
    </div>
  );
}

function Sparkline({ data }: { data: DailySale[] }) {
  if (data.length < 2) return null;
  const max = Math.max(...data.map(d=>d.revenue), 1);
  const w=80, h=28, step=w/(data.length-1);
  const pts = data.map((d,i) => `${(i*step).toFixed(1)},${(h-(d.revenue/max)*(h-4)-2).toFixed(1)}`).join(' ');
  const up  = data[data.length-1].revenue >= data[0].revenue;
  return (
    <svg width={w} height={h} className="mt-1">
      <polyline points={pts} fill="none" stroke={up?'#16a34a':'#dc2626'} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
    </svg>
  );
}

/* ════════════════════════════════════════
   OY TANLASH MODAL
════════════════════════════════════════ */
function MonthPickerModal({ year, month, onSelect, onClose }: {
  year: number; month: number;
  onSelect: (y: number, m: number) => void;
  onClose: () => void;
}) {
  const [viewYear, setViewYear] = useState(year);
  const now = new Date();
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-72 p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setViewYear(v=>v-1)} className="p-1.5 hover:bg-gray-100 rounded-lg"><ChevronLeft className="w-5 h-5 text-gray-600"/></button>
          <span className="font-bold text-gray-900 text-lg">{viewYear}</span>
          <button onClick={() => setViewYear(v=>v+1)} className="p-1.5 hover:bg-gray-100 rounded-lg"><ChevronRight className="w-5 h-5 text-gray-600"/></button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {OY_NOMLARI.map((name, i) => {
            const m = i+1;
            const isCur    = viewYear===year && m===month;
            const isFuture = viewYear > now.getFullYear() || (viewYear===now.getFullYear() && m > now.getMonth()+1);
            return (
              <button key={m} disabled={isFuture}
                onClick={() => { onSelect(viewYear, m); onClose(); }}
                className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isCur    ? 'bg-gray-900 text-white shadow-md' :
                  isFuture ? 'text-gray-300 cursor-not-allowed' :
                             'hover:bg-gray-100 text-gray-700'
                }`}>
                {name}
              </button>
            );
          })}
        </div>
        <button onClick={onClose} className="mt-4 w-full py-2 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50">
          Bekor qilish
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   OY OVERLAY — TO'LIQ EKRAN
════════════════════════════════════════ */
function MonthlyOverlay({ onClose }: { onClose: () => void }) {
  const now = new Date();
  const [year,        setYear]        = useState(now.getFullYear());
  const [month,       setMonth]       = useState(now.getMonth()+1);
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
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, [year, month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const maxDaily = data ? Math.max(...data.days.map(d=>d.total), 1) : 1;

  const prevMonth = () => {
    if (month === 1) { setYear(y=>y-1); setMonth(12); }
    else setMonth(m=>m-1);
  };
  const nextMonth = () => {
    const nxt = month===12 ? {y:year+1,m:1} : {y:year,m:month+1};
    const future = nxt.y > now.getFullYear() || (nxt.y===now.getFullYear() && nxt.m > now.getMonth()+1);
    if (!future) { setYear(nxt.y); setMonth(nxt.m); }
  };
  const isNextDisabled = (() => {
    const nxt = month===12 ? {y:year+1,m:1} : {y:year,m:month+1};
    return nxt.y > now.getFullYear() || (nxt.y===now.getFullYear() && nxt.m > now.getMonth()+1);
  })();

  return (
    <div className="absolute inset-0 z-50 bg-white flex flex-col overflow-hidden">
      {/* ── TOP BAR ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Orqaga */}
          <button onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-700 transition-colors">
            <ChevronLeft className="w-4 h-4"/>
            Orqaga
          </button>
          <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500"/>
            Oylik statistika
          </h2>
        </div>

        {/* Oy navigatsiya */}
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <ChevronLeft className="w-4 h-4 text-gray-600"/>
          </button>
          <button onClick={() => setPickerOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-700 transition-colors">
            <Calendar className="w-4 h-4"/>
            {OY_NOMLARI[month-1]} {year}
          </button>
          <button onClick={nextMonth} disabled={isNextDisabled}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronRight className="w-4 h-4 text-gray-600"/>
          </button>
        </div>
      </div>

      {/* ── SUMMARY KARTALAR ── */}
      {data && !loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-gray-100 flex-shrink-0">
          {[
            { label: 'Jami daromad', value: fmt(data.summary.total)+' so\'m', sub: `${data.summary.salesCount} ta sotuv`, color: 'text-gray-900' },
            { label: 'Naqd',         value: fmt(data.summary.cash)+' so\'m',  sub: data.summary.total>0 ? `${((data.summary.cash/data.summary.total)*100).toFixed(0)}%`:'—', color:'text-green-700' },
            { label: 'Karta',        value: fmt(data.summary.card)+' so\'m',  sub: data.summary.total>0 ? `${((data.summary.card/data.summary.total)*100).toFixed(0)}%`:'—', color:'text-blue-700' },
            { label: 'Faol kunlar',  value: String(data.summary.activeDays), sub: `O'rtacha: ${fmt(data.summary.avgPerDay)} so'm`, color:'text-gray-700' },
          ].map(item => (
            <div key={item.label} className="bg-white px-5 py-3">
              <p className="text-xs text-gray-500 mb-1">{item.label}</p>
              <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{item.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── JADVAL ── */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading ? (
          <div className="flex justify-center py-20">
            <svg className="animate-spin w-8 h-8 text-gray-300" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
          </div>
        ) : !data ? null : (
          <div className="max-w-4xl mx-auto">
            {/* Jadval header */}
            <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider sticky top-0 bg-white border-b border-gray-100 mb-1">
              <div className="col-span-1">Kun</div>
              <div className="col-span-1">Hafta</div>
              <div className="col-span-4">Jami summa</div>
              <div className="col-span-2">Naqd</div>
              <div className="col-span-2">Karta</div>
              <div className="col-span-1 text-center">Sotuv</div>
              <div className="col-span-1"/>
            </div>

            <div className="space-y-0.5">
              {data.days.map(day => {
                const date    = new Date(day.date);
                const weekDay = HAFTA_QISQA[date.getDay()];
                const isToday = day.date === new Date().toISOString().split('T')[0];
                const isEmpty = day.salesCount === 0;
                const isOpen  = expandedDay === day.day;
                const barW    = day.total > 0 ? (day.total/maxDaily)*100 : 0;

                return (
                  <div key={day.day}>
                    {/* ── KUN QATORI ── */}
                    <div
                      onClick={() => !isEmpty && setExpandedDay(prev => prev===day.day ? null : day.day)}
                      className={`grid grid-cols-12 gap-2 px-3 py-3 rounded-xl items-center transition-colors
                        ${isEmpty ? 'opacity-40 cursor-default' : 'cursor-pointer hover:bg-gray-50'}
                        ${isToday ? 'ring-2 ring-gray-900 ring-inset bg-gray-50' : ''}
                        ${isOpen  ? 'bg-gray-50' : ''}`}
                    >
                      <div className="col-span-1">
                        <span className={`text-sm font-bold ${isToday?'text-gray-900':'text-gray-600'}`}>{day.day}</span>
                        {isToday && <span className="block text-xs text-orange-500 font-medium leading-none">bugun</span>}
                      </div>
                      <div className="col-span-1 text-sm text-gray-400">{weekDay}</div>
                      <div className="col-span-4 flex items-center gap-2">
                        <div className="w-20 bg-gray-100 rounded-full h-1.5 flex-shrink-0">
                          <div className="bg-gray-700 h-1.5 rounded-full" style={{width:`${barW}%`}}/>
                        </div>
                        <span className="text-sm font-semibold text-gray-900">{isEmpty ? '—' : fmt(day.total)}</span>
                      </div>
                      <div className="col-span-2 text-sm font-medium text-green-700">{isEmpty?'—':fmt(day.cash)}</div>
                      <div className="col-span-2 text-sm font-medium text-blue-700">{isEmpty?'—':fmt(day.card)}</div>
                      <div className="col-span-1 text-center">
                        {isEmpty
                          ? <span className="text-xs text-gray-300">0</span>
                          : <span className="inline-flex items-center justify-center w-7 h-7 bg-gray-900 text-white text-xs font-bold rounded-full">{day.salesCount}</span>}
                      </div>
                      <div className="col-span-1 flex justify-center">
                        {!isEmpty && (isOpen
                          ? <ChevronUp className="w-4 h-4 text-gray-400"/>
                          : <ChevronDown className="w-4 h-4 text-gray-400"/>)}
                      </div>
                    </div>

                    {/* ── KUN DETALI (qisqa) ── */}
                    {isOpen && (
                      <div className="mx-2 mb-1 bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                        {/* Kun umumiy */}
                        <div className="grid grid-cols-4 gap-px bg-gray-200">
                          {[
                            {label:'Jami', val:day.total, c:'text-gray-900'},
                            {label:'Naqd', val:day.cash,  c:'text-green-700'},
                            {label:'Karta',val:day.card,  c:'text-blue-700'},
                            {label:'Y/Sh', val:day.legalEntity, c:'text-purple-700'},
                          ].map(item=>(
                            <div key={item.label} className="bg-white px-3 py-2">
                              <p className="text-xs text-gray-400">{item.label}</p>
                              <p className={`text-sm font-bold ${item.c}`}>{fmt(item.val)} so'm</p>
                            </div>
                          ))}
                        </div>

                        {/* Sotuvlar — har biri bir qatorda, qisqa */}
                        <div className="divide-y divide-gray-100">
                          {day.sales.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-4">Sotuv yo&apos;q</p>
                          ) : day.sales.map((sale, idx) => {
                            const time = new Date(sale.createdAt).toLocaleTimeString('uz-UZ',{hour:'2-digit',minute:'2-digit'});
                            const isLE = sale.saleType==='LEGAL_ENTITY' || !!sale.legalEntity;
                            const ptLabel = sale.paymentType==='CASH'?'Naqd':sale.paymentType==='CARD'?'Karta':'Aralash';
                            const ptColor = sale.paymentType==='CASH'?'bg-green-100 text-green-700':sale.paymentType==='CARD'?'bg-blue-100 text-blue-700':'bg-orange-100 text-orange-700';
                            return (
                              <div key={sale.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors">
                                {/* Tartib */}
                                <span className="text-xs text-gray-400 w-5 text-right flex-shrink-0">#{idx+1}</span>
                                {/* Vaqt */}
                                <span className="text-xs font-mono text-gray-500 w-10 flex-shrink-0">{time}</span>
                                {/* To'lov turi */}
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${ptColor}`}>{ptLabel}</span>
                                {/* Y/Sh belgisi */}
                                {isLE && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium flex-shrink-0">Y/Sh</span>}
                                {/* Kassir */}
                                <span className="text-xs text-gray-500 flex-shrink-0">👤 {sale.cashier.name}</span>
                                {/* Y/Sh nomi */}
                                {sale.legalEntity && (
                                  <span className="text-xs text-purple-600 font-medium truncate">🏢 {sale.legalEntity.name}</span>
                                )}
                                {/* Mahsulotlar soni */}
                                <span className="text-xs text-gray-400 flex-shrink-0">{sale.saleItems.length} ta mahsulot</span>
                                {/* Summa — o'ng tomonda */}
                                <span className="ml-auto text-sm font-bold text-gray-900 flex-shrink-0">{fmt(sale.totalAmount)} so'm</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Oy picker modal */}
      {pickerOpen && (
        <MonthPickerModal year={year} month={month}
          onSelect={(y,m)=>{setYear(y);setMonth(m);}}
          onClose={() => setPickerOpen(false)}/>
      )}
    </div>
  );
}

/* ════════════════════════════════════════
   ASOSIY STATISTIKA SAHIFASI
════════════════════════════════════════ */
export default function StatisticsPage() {
  const [range,        setRange]        = useState<RangeKey>('week');
  const [customStart,  setCustomStart]  = useState('');
  const [customEnd,    setCustomEnd]    = useState('');
  const [loading,      setLoading]      = useState(false);
  const [stats,        setStats]        = useState<Stats | null>(null);
  const [topProducts,  setTopProducts]  = useState<TopProduct[]>([]);
  const [dailySales,   setDailySales]   = useState<DailySale[]>([]);
  const [showMonthly,  setShowMonthly]  = useState(false);   // ← overlay holati

  const fetchStats = useCallback(async () => {
    setLoading(true); setStats(null);
    try {
      const { startDate, endDate } = getDates(range, customStart, customEnd);
      const res  = await fetch(`/api/dashboard/stats?startDate=${startDate}&endDate=${endDate}`);
      const data = await res.json();
      if (data.stats) { setStats(data.stats); setTopProducts(data.topProducts||[]); setDailySales(data.dailySales||[]); }
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, [range, customStart, customEnd]);

  useEffect(() => { if (range !== 'custom') fetchStats(); }, [range, fetchStats]);

  const rangeLabel = RANGES.find(r=>r.key===range)?.label ?? '';
  const maxProduct = Math.max(...topProducts.map(p=>p.quantity), 1);

  return (
    <>
      {/* ══ OYLIK OVERLAY ══ */}
      {showMonthly && <MonthlyOverlay onClose={() => setShowMonthly(false)}/>}

      <div className="p-5 max-w-6xl mx-auto space-y-5">

        {/* ── HEADER ── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart2 className="w-7 h-7 text-gray-700"/>
              Statistika
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">Savdo tahlili va ko&apos;rsatkichlar</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Oylik statistika tugmasi */}
            <button onClick={() => setShowMonthly(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-700 transition-colors shadow-sm">
              <Calendar className="w-4 h-4"/>
              Oylik statistika
            </button>

            {/* Range selector */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              {RANGES.map(r => (
                <button key={r.key} onClick={() => setRange(r.key)}
                  className={`px-3.5 py-1.5 text-sm rounded-lg font-medium transition-all ${
                    range===r.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}>{r.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Custom date */}
        {range === 'custom' && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Boshlanish sanasi</label>
              <input type="date" value={customStart} onChange={e=>setCustomStart(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tugash sanasi</label>
              <input type="date" value={customEnd} onChange={e=>setCustomEnd(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"/>
            </div>
            <button onClick={fetchStats} className="px-5 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800">
              Ko&apos;rish
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <svg className="animate-spin w-10 h-10 text-gray-300" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
            <p className="text-gray-400 mt-3 text-sm">Yuklanmoqda...</p>
          </div>
        )}

        {/* Stats */}
        {!loading && stats && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Jami daromad" value={`${fmt(stats.totalRevenue)} so'm`} sub={`${stats.salesCount} ta sotuv`} icon={TrendingUp} bg="bg-gray-900" change={stats.revenueChange}/>
              <StatCard label="Sof foyda" value={`${fmt(stats.netProfit)} so'm`} sub={stats.totalRevenue>0?`Marja ${((stats.netProfit/stats.totalRevenue)*100).toFixed(1)}%`:'—'} icon={TrendingUp} bg="bg-green-600"/>
              <StatCard label="Naqd to'lov" value={`${fmt(stats.totalCash)} so'm`} sub={stats.totalRevenue>0?`${((stats.totalCash/stats.totalRevenue)*100).toFixed(0)}% ulush`:'—'} icon={Banknote} bg="bg-blue-600"/>
              <StatCard label="Karta to'lov" value={`${fmt(stats.totalCard)} so'm`} sub={stats.totalRevenue>0?`${((stats.totalCard/stats.totalRevenue)*100).toFixed(0)}% ulush`:'—'} icon={CreditCard} bg="bg-purple-600"/>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Oddiy savdo */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center"><ShoppingCart className="w-4 h-4 text-gray-600"/></div>
                    <p className="font-semibold text-gray-700">Oddiy savdo</p>
                  </div>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium">{stats.retailCount} ta</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{fmt(stats.retailRevenue)}</p>
                <p className="text-xs text-gray-400 mt-0.5">so&apos;m</p>
                {dailySales.length>1 && <Sparkline data={dailySales}/>}
                {stats.totalRevenue>0 && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Jami savdodagi ulushi</span><span>{((stats.retailRevenue/stats.totalRevenue)*100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2"><div className="bg-gray-900 h-2 rounded-full" style={{width:`${(stats.retailRevenue/stats.totalRevenue)*100}%`}}/></div>
                  </div>
                )}
              </div>
              {/* Y/Sh */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center"><Building2 className="w-4 h-4 text-blue-600"/></div>
                    <p className="font-semibold text-blue-700">Yuridik shaxs (Y/Sh)</p>
                  </div>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium">{stats.legalEntityCount} ta</span>
                </div>
                <p className="text-2xl font-bold text-blue-800">{fmt(stats.legalEntityRevenue)}</p>
                <p className="text-xs text-blue-400 mt-0.5">so&apos;m</p>
                {stats.totalRevenue>0 && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-blue-400 mb-1">
                      <span>Jami savdodagi ulushi</span><span>{((stats.legalEntityRevenue/stats.totalRevenue)*100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-blue-100 rounded-full h-2"><div className="bg-blue-500 h-2 rounded-full" style={{width:`${(stats.legalEntityRevenue/stats.totalRevenue)*100}%`}}/></div>
                  </div>
                )}
              </div>
            </div>

            {/* Grafik */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900 flex items-center gap-2"><Calendar className="w-4 h-4 text-gray-500"/>Savdo dinamikasi</h3>
                <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">{rangeLabel}</span>
              </div>
              <BarChart data={dailySales}/>
            </div>

            {/* Top mahsulotlar + To'lov taqsimoti */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Package className="w-4 h-4 text-gray-500"/>Eng ko&apos;p sotilgan <span className="text-xs text-gray-400 font-normal">({rangeLabel})</span></h3>
                {topProducts.length===0 ? (
                  <div className="py-8 text-center text-gray-300"><Users className="w-10 h-10 mx-auto mb-2"/><p className="text-sm">Sotuv yo&apos;q</p></div>
                ) : (
                  <div className="space-y-3">
                    {topProducts.map((p,i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i===0?'bg-yellow-100 text-yellow-700':i===1?'bg-gray-200 text-gray-600':i===2?'bg-orange-100 text-orange-700':'bg-gray-100 text-gray-500'}`}>{i+1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-gray-900 truncate pr-2">{p.name}</span>
                            <span className="text-gray-500 flex-shrink-0">{p.quantity} dona</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full ${i===0?'bg-yellow-400':i===1?'bg-gray-400':i===2?'bg-orange-400':'bg-blue-400'}`} style={{width:`${(p.quantity/maxProduct)*100}%`}}/>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 w-20">
                          <p className="text-sm font-bold text-gray-900">{fmt(p.revenue)}</p>
                          <p className="text-xs text-gray-400">so&apos;m</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><CreditCard className="w-4 h-4 text-gray-500"/>To&apos;lov taqsimoti</h3>
                {stats.totalRevenue===0 ? (
                  <div className="py-8 text-center text-gray-300"><CreditCard className="w-10 h-10 mx-auto mb-2"/><p className="text-sm">Sotuv yo&apos;q</p></div>
                ) : (
                  <div className="space-y-4">
                    {[
                      {label:'Naqd pul', value:stats.totalCash, pct:(stats.totalCash/stats.totalRevenue)*100, color:'bg-green-500', icon:Banknote, tc:'text-green-700'},
                      {label:'Karta',    value:stats.totalCard, pct:(stats.totalCard/stats.totalRevenue)*100, color:'bg-blue-500',  icon:CreditCard, tc:'text-blue-700'},
                    ].map(({label,value,pct,color,icon:Icon,tc}) => (
                      <div key={label}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2"><Icon className={`w-4 h-4 ${tc}`}/><span className="text-sm font-medium text-gray-700">{label}</span></div>
                          <div className="text-right">
                            <span className="text-sm font-bold text-gray-900">{fmt(value)}</span>
                            <span className="text-xs text-gray-400 ml-1">so&apos;m</span>
                            <span className={`ml-2 text-xs font-semibold ${tc}`}>{pct.toFixed(1)}%</span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-3"><div className={`${color} h-3 rounded-full`} style={{width:`${pct}%`}}/></div>
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
                      {stats.salesCount>0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">O&apos;rtacha chek</span>
                          <span className="text-lg font-bold text-gray-900">{fmt(stats.totalRevenue/stats.salesCount)} <span className="text-sm font-normal text-gray-400">so'm</span></span>
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
    </>
  );
}
