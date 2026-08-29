'use client';

import { useState, useEffect } from 'react';

type DateRange = 'today' | 'yesterday';

interface Stats {
  totalRevenue: number; totalCash: number; totalCard: number;
  netProfit: number; revenueChange: number; salesCount: number;
  legalEntityRevenue: number; legalEntityCount: number;
  retailRevenue: number; retailCount: number;
}
interface TopProduct { name: string; quantity: number; revenue: number }
interface DailySale   { date: string; revenue: number }
interface LowStockItem {
  id: string; name: string; quantity: number; minQuantity: number; unit: string;
}
interface ExpiringItem {
  id: string; name: string; expiryDate: string; quantity: number; unit: string; daysLeft: number;
}

/* ── Icons ── */
const TrendUp = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
  </svg>
);
const TrendDown = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>
  </svg>
);
const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
);
const Loader = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
    <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/>
    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
    <line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>
    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
  </svg>
);

/* ── Helpers ── */
function fmt(n: number) { return new Intl.NumberFormat('uz-UZ').format(Math.round(n)); }

function getDates(range: DateRange) {
  const now   = new Date();
  const today = now.toISOString().split('T')[0];
  const yest  = new Date(now); yest.setDate(yest.getDate() - 1);
  return range === 'today'
    ? { startDate: today,                       endDate: today }
    : { startDate: yest.toISOString().split('T')[0], endDate: yest.toISOString().split('T')[0] };
}

export default function DashboardPage() {
  const [dateRange,       setDateRange]       = useState<DateRange>('today');
  const [stats,           setStats]           = useState<Stats | null>(null);
  const [topProducts,     setTopProducts]     = useState<TopProduct[]>([]);
  const [dailySales,      setDailySales]      = useState<DailySale[]>([]);
  const [lowStock,        setLowStock]        = useState<LowStockItem[]>([]);
  const [expiringSoon,    setExpiringSoon]    = useState<ExpiringItem[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [showClearModal,  setShowClearModal]  = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);

  /* fetch stats */
  const fetchStats = async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getDates(dateRange);
      const [statsRes, reportRes] = await Promise.all([
        fetch(`/api/dashboard/stats?startDate=${startDate}&endDate=${endDate}`),
        fetch('/api/products/report'),
      ]);
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats);
        setTopProducts(data.topProducts || []);
        setDailySales(data.dailySales || []);
      }
      if (reportRes.ok) {
        const rep = await reportRes.json();
        setLowStock(rep.lowStock || []);
        setExpiringSoon(rep.expiringSoon || []);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchStats(); }, [dateRange]);

  /* clear history */
  const handleClearHistory = async () => {
    setClearingHistory(true);
    try {
      const r    = await fetch('/api/dashboard/clear-history', { method: 'DELETE' });
      const data = await r.json();
      if (!r.ok) { alert(data.error || 'Xatolik'); return; }
      alert(data.message || "Tarix o'chirildi");
      setShowClearModal(false);
      fetchStats();
    } catch { alert('Xatolik'); }
    finally  { setClearingHistory(false); }
  };

  const label = dateRange === 'today' ? 'Bugungi kun' : 'Kechagi kun';

  return (
    <div className="p-6 max-w-screen-2xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500 mt-1">{label} savdo ko&apos;rsatkichlari</p>
          </div>
          <button onClick={() => setShowClearModal(true)}
            className="self-start lg:self-auto px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center gap-2 shadow-sm">
            <TrashIcon /> Tarixni o&apos;chirish
          </button>
        </div>

        {/* Bugun | Kecha */}
        <div className="flex gap-2">
          {(['today', 'yesterday'] as DateRange[]).map(r => (
            <button key={r} onClick={() => setDateRange(r)}
              className={`px-5 py-2.5 rounded-lg font-medium transition-all ${
                dateRange === r
                  ? 'bg-gray-900 text-white shadow-md'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}>
              {r === 'today' ? 'Bugun' : 'Kecha'}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader />
          <p className="text-gray-500 mt-4">Yuklanmoqda...</p>
        </div>
      )}

      {/* Stats */}
      {!loading && stats && (
        <>
          {/* 4 karta */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Jami daromad */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <p className="text-sm font-medium text-gray-600 mb-2">Jami daromad</p>
              <div className="flex items-baseline gap-2 mb-3">
                <h2 className="text-3xl font-bold text-gray-900">{fmt(stats.totalRevenue)}</h2>
                <span className="text-sm text-gray-500">so&apos;m</span>
              </div>
              <div className="flex items-center gap-1">
                {stats.revenueChange >= 0 ? <TrendUp /> : <TrendDown />}
                <span className={`text-sm font-medium ${stats.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.revenueChange >= 0 ? '+' : ''}{stats.revenueChange.toFixed(1)}%
                </span>
                <span className="text-sm text-gray-500 ml-1">oldingi davrdan</span>
              </div>
            </div>

            {/* Naqd */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <p className="text-sm font-medium text-gray-600 mb-2">Naqd</p>
              <div className="flex items-baseline gap-2 mb-3">
                <h2 className="text-3xl font-bold text-gray-900">{fmt(stats.totalCash)}</h2>
                <span className="text-sm text-gray-500">so&apos;m</span>
              </div>
              <p className="text-sm text-gray-500">{stats.salesCount} ta sotuv</p>
            </div>

            {/* Karta */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <p className="text-sm font-medium text-gray-600 mb-2">Karta</p>
              <div className="flex items-baseline gap-2 mb-3">
                <h2 className="text-3xl font-bold text-gray-900">{fmt(stats.totalCard)}</h2>
                <span className="text-sm text-gray-500">so&apos;m</span>
              </div>
              <p className="text-sm text-gray-500">
                {stats.totalRevenue > 0
                  ? ((stats.totalCard / stats.totalRevenue) * 100).toFixed(1)
                  : '0'}% jami daromaddan
              </p>
            </div>

            {/* Sof foyda */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <p className="text-sm font-medium text-gray-200 mb-2">Sof foyda</p>
              <div className="flex items-baseline gap-2 mb-3">
                <h2 className="text-3xl font-bold">{fmt(stats.netProfit)}</h2>
                <span className="text-sm text-gray-300">so&apos;m</span>
              </div>
              <p className="text-sm text-gray-300">
                Marja: {stats.totalRevenue > 0 ? ((stats.netProfit / stats.totalRevenue) * 100).toFixed(1) : '0'}%
              </p>
            </div>
          </div>

          {/* Y/Sh va Savdo bo'limi */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Oddiy savdo */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                </div>
                <p className="text-sm font-semibold text-gray-700">Oddiy savdo</p>
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-2xl font-bold text-gray-900">{fmt(stats.retailRevenue)}</span>
                <span className="text-sm text-gray-400">so&apos;m</span>
              </div>
              <p className="text-sm text-gray-500">{stats.retailCount} ta sotuv</p>
            </div>

            {/* Y/Sh savdo */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                </div>
                <p className="text-sm font-semibold text-blue-700">Y/Sh savdo</p>
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-2xl font-bold text-blue-800">{fmt(stats.legalEntityRevenue)}</span>
                <span className="text-sm text-blue-400">so&apos;m</span>
              </div>
              <p className="text-sm text-blue-600">{stats.legalEntityCount} ta sotuv</p>
            </div>
          </div>

          {/* Grafik + Top mahsulotlar */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Savdo dinamikasi */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Savdo dinamikasi</h3>
              {dailySales.length > 0 ? (
                <div className="space-y-3">
                  {dailySales.map((day, i) => {
                    const max = Math.max(...dailySales.map(d => d.revenue), 1);
                    const w   = (day.revenue / max) * 100;
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 font-medium">
                            {new Date(day.date).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' })}
                          </span>
                          <span className="font-semibold text-gray-900">{fmt(day.revenue)} so&apos;m</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                          <div className="bg-gray-900 h-3 rounded-full transition-all duration-500" style={{ width: `${w}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">Ma&apos;lumot topilmadi</div>
              )}
            </div>

            {/* Top mahsulotlar */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Eng ko&apos;p sotilgan</h3>
              {topProducts.length > 0 ? (
                <div className="space-y-3">
                  {topProducts.map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                          {i + 1}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 truncate">{p.name}</p>
                          <p className="text-sm text-gray-500">{fmt(p.revenue)} so&apos;m</p>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-semibold text-gray-900">{p.quantity}</p>
                        <p className="text-xs text-gray-500">dona</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">Ma&apos;lumot topilmadi</div>
              )}
            </div>
          </div>

          {/* Ogohlantirishlar — REAL MA'LUMOTLAR */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Kam qolgan mahsulotlar */}
            <div className={`rounded-xl p-6 border ${
              lowStock.length > 0
                ? 'bg-orange-50 border-orange-200'
                : 'bg-green-50 border-green-200'
            }`}>
              <h3 className={`text-lg font-semibold mb-3 flex items-center gap-2 ${
                lowStock.length > 0 ? 'text-orange-900' : 'text-green-900'
              }`}>
                {lowStock.length > 0 ? '⚠️' : '✅'} Kam qolgan mahsulotlar
                {lowStock.length > 0 && (
                  <span className="bg-orange-200 text-orange-800 text-xs font-bold px-2 py-0.5 rounded-full">
                    {lowStock.length} ta
                  </span>
                )}
              </h3>
              {lowStock.length === 0 ? (
                <p className="text-green-700 text-sm">Barcha mahsulotlar normada</p>
              ) : (
                <div className="space-y-2">
                  {lowStock.slice(0, 5).map(item => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span className="text-orange-800 font-medium truncate flex-1">{item.name}</span>
                      <span className={`flex-shrink-0 ml-2 font-bold ${item.quantity === 0 ? 'text-red-600' : 'text-orange-600'}`}>
                        {item.quantity === 0 ? 'Tugagan' : `${item.quantity} ${item.unit}`}
                      </span>
                    </div>
                  ))}
                  {lowStock.length > 5 && (
                    <p className="text-orange-600 text-xs mt-1">+{lowStock.length - 5} ta mahsulot</p>
                  )}
                </div>
              )}
            </div>

            {/* Muddati tugayotganlar */}
            <div className={`rounded-xl p-6 border ${
              expiringSoon.length > 0
                ? 'bg-red-50 border-red-200'
                : 'bg-green-50 border-green-200'
            }`}>
              <h3 className={`text-lg font-semibold mb-3 flex items-center gap-2 ${
                expiringSoon.length > 0 ? 'text-red-900' : 'text-green-900'
              }`}>
                {expiringSoon.length > 0 ? '🕒' : '✅'} Muddati tugayotgan mahsulotlar
                {expiringSoon.length > 0 && (
                  <span className="bg-red-200 text-red-800 text-xs font-bold px-2 py-0.5 rounded-full">
                    {expiringSoon.length} ta
                  </span>
                )}
              </h3>
              {expiringSoon.length === 0 ? (
                <p className="text-green-700 text-sm">Muddati tugayotgan mahsulot yo&apos;q</p>
              ) : (
                <div className="space-y-2">
                  {expiringSoon.slice(0, 5).map(item => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span className="text-red-800 font-medium truncate flex-1">{item.name}</span>
                      <span className={`flex-shrink-0 ml-2 font-bold text-xs px-2 py-0.5 rounded-full ${
                        item.daysLeft < 0 ? 'bg-red-200 text-red-800' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {item.daysLeft < 0 ? "O'tgan" : `${item.daysLeft} kun`}
                      </span>
                    </div>
                  ))}
                  {expiringSoon.length > 5 && (
                    <p className="text-red-600 text-xs mt-1">+{expiringSoon.length - 5} ta mahsulot</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Xato */}
      {!loading && !stats && (
        <div className="text-center py-20">
          <p className="text-gray-500 text-lg">Ma&apos;lumotlarni yuklashda xatolik yuz berdi</p>
          <button onClick={fetchStats}
            className="mt-4 px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors">
            Qayta urinib ko&apos;rish
          </button>
        </div>
      )}

      {/* Clear Modal */}
      {showClearModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <TrashIcon />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Tarixni o&apos;chirish</h3>
            <p className="text-gray-600 mb-6">
              Barcha sotuvlar tarixi o&apos;chiriladi. Bu amalni qaytarib bo&apos;lmaydi.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowClearModal(false)} disabled={clearingHistory}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50">
                Bekor qilish
              </button>
              <button onClick={handleClearHistory} disabled={clearingHistory}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50">
                {clearingHistory ? "O'chirilmoqda..." : "O'chirish"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
