'use client';

import { useState, useEffect } from 'react';

type DateRange = '7days' | '1month' | '1year' | 'custom';

interface Stats {
  totalRevenue: number;
  totalCash: number;
  totalCard: number;
  netProfit: number;
  revenueChange: number;
  salesCount: number;
}

interface TopProduct {
  name: string;
  quantity: number;
  revenue: number;
}

interface DailySale {
  date: string;
  revenue: number;
}

// Simple Icons as SVG
const TrendingUpIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
    <polyline points="17 6 23 6 23 12"></polyline>
  </svg>
);

const TrendingDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline>
    <polyline points="17 18 23 18 23 12"></polyline>
  </svg>
);

const CalendarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
);

const LoaderIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
    <line x1="12" y1="2" x2="12" y2="6"></line>
    <line x1="12" y1="18" x2="12" y2="22"></line>
    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
    <line x1="2" y1="12" x2="6" y2="12"></line>
    <line x1="18" y1="12" x2="22" y2="12"></line>
    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
  </svg>
);

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState<DateRange>('7days');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [dailySales, setDailySales] = useState<DailySale[]>([]);
  const [loading, setLoading] = useState(true);
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);

  const getDateRangeParams = () => {
    const end = new Date();
    let start = new Date();

    switch (dateRange) {
      case '7days':
        start.setDate(end.getDate() - 7);
        break;
      case '1month':
        start.setMonth(end.getMonth() - 1);
        break;
      case '1year':
        start.setFullYear(end.getFullYear() - 1);
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          return {
            startDate: customStartDate,
            endDate: customEndDate,
          };
        }
        break;
    }

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRangeParams();
      const response = await fetch(
        `/api/dashboard/stats?startDate=${startDate}&endDate=${endDate}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const data = await response.json();
      setStats(data.stats);
      setTopProducts(data.topProducts || []);
      setDailySales(data.dailySales || []);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats(null);
      setTopProducts([]);
      setDailySales([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [dateRange, customStartDate, customEndDate]);

  const handleClearHistory = async () => {
    setClearingHistory(true);
    try {
      const response = await fetch('/api/dashboard/clear-history', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Xatolik yuz berdi');
        return;
      }

      alert(data.message || "Tarix muvaffaqiyatli o'chirildi");
      setShowClearModal(false);
      await fetchStats();
    } catch (error) {
      console.error('Error clearing history:', error);
      alert('Xatolik yuz berdi');
    } finally {
      setClearingHistory(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('uz-UZ').format(Math.round(num));
  };

  const getDateRangeLabel = () => {
    switch (dateRange) {
      case '7days':
        return "So'nggi 7 kun";
      case '1month':
        return "So'nggi 1 oy";
      case '1year':
        return "So'nggi 1 yil";
      case 'custom':
        return 'Maxsus sana';
    }
  };

  return (
    <div className="p-8 max-w-screen-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500 mt-1">{getDateRangeLabel()} savdo ko&apos;rsatkichlari</p>
          </div>

          <button
            onClick={() => setShowClearModal(true)}
            className="self-start lg:self-auto px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center gap-2 shadow-sm"
          >
            <TrashIcon />
            Tarixni o&apos;chirish
          </button>
        </div>

        {/* Date Range Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setDateRange('7days')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              dateRange === '7days'
                ? 'bg-gray-900 text-white shadow-md'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            7 kun
          </button>
          <button
            onClick={() => setDateRange('1month')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              dateRange === '1month'
                ? 'bg-gray-900 text-white shadow-md'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            1 oy
          </button>
          <button
            onClick={() => setDateRange('1year')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              dateRange === '1year'
                ? 'bg-gray-900 text-white shadow-md'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            1 yil
          </button>
          <button
            onClick={() => setDateRange('custom')}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
              dateRange === 'custom'
                ? 'bg-gray-900 text-white shadow-md'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <CalendarIcon />
            Maxsus sana
          </button>
        </div>
      </div>

      {/* Custom Date Picker */}
      {dateRange === 'custom' && (
        <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-700 mb-3">Sana oralig&apos;ini tanlang</p>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Boshlanish sanasi
              </label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Tugash sanasi
              </label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <LoaderIcon />
          <p className="text-gray-500 mt-4">Ma&apos;lumotlar yuklanmoqda...</p>
        </div>
      )}

      {/* Stats Cards */}
      {!loading && stats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Jami Daromad */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <p className="text-sm font-medium text-gray-600 mb-2">Jami daromad</p>
              <div className="flex items-baseline gap-2 mb-3">
                <h2 className="text-3xl font-bold text-gray-900">
                  {formatNumber(stats.totalRevenue)}
                </h2>
                <span className="text-sm text-gray-500">so&apos;m</span>
              </div>
              <div className="flex items-center gap-1">
                {stats.revenueChange >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
                <span
                  className={`text-sm font-medium ${
                    stats.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {stats.revenueChange >= 0 ? '+' : ''}
                  {stats.revenueChange.toFixed(1)}%
                </span>
                <span className="text-sm text-gray-500 ml-1">oldingi davrdan</span>
              </div>
            </div>

            {/* Naqd */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <p className="text-sm font-medium text-gray-600 mb-2">Naqd</p>
              <div className="flex items-baseline gap-2 mb-3">
                <h2 className="text-3xl font-bold text-gray-900">
                  {formatNumber(stats.totalCash)}
                </h2>
                <span className="text-sm text-gray-500">so&apos;m</span>
              </div>
              <p className="text-sm text-gray-500">{stats.salesCount} ta sotuv</p>
            </div>

            {/* Karta */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <p className="text-sm font-medium text-gray-600 mb-2">Karta</p>
              <div className="flex items-baseline gap-2 mb-3">
                <h2 className="text-3xl font-bold text-gray-900">
                  {formatNumber(stats.totalCard)}
                </h2>
                <span className="text-sm text-gray-500">so&apos;m</span>
              </div>
              <p className="text-sm text-gray-500">
                {stats.totalRevenue > 0
                  ? ((stats.totalCard / stats.totalRevenue) * 100).toFixed(1)
                  : '0'}
                % jami daromaddan
              </p>
            </div>

            {/* Sof Foyda */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <p className="text-sm font-medium text-gray-200 mb-2">Sof foyda</p>
              <div className="flex items-baseline gap-2 mb-3">
                <h2 className="text-3xl font-bold">
                  {formatNumber(stats.netProfit)}
                </h2>
                <span className="text-sm text-gray-300">so&apos;m</span>
              </div>
              <p className="text-sm text-gray-300">
                Marja:{' '}
                {stats.totalRevenue > 0
                  ? ((stats.netProfit / stats.totalRevenue) * 100).toFixed(1)
                  : '0'}
                %
              </p>
            </div>
          </div>

          {/* Charts and Top Products */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Savdo Dinamikasi */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Savdo dinamikasi
              </h3>
              {dailySales.length > 0 ? (
                <div className="space-y-3">
                  {dailySales.slice(-7).map((day, index) => {
                    const maxRevenue = Math.max(...dailySales.map((d) => d.revenue), 1);
                    const widthPercent = (day.revenue / maxRevenue) * 100;

                    return (
                      <div key={index} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 font-medium">
                            {new Date(day.date).toLocaleDateString('uz-UZ', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </span>
                          <span className="font-semibold text-gray-900">
                            {formatNumber(day.revenue)} so&apos;m
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                          <div
                            className="bg-gray-900 h-3 rounded-full transition-all duration-500"
                            style={{ width: `${widthPercent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-400">Ma&apos;lumot topilmadi</p>
                </div>
              )}
            </div>

            {/* Top Products */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Eng ko&apos;p sotilgan mahsulotlar
              </h3>
              {topProducts.length > 0 ? (
                <div className="space-y-3">
                  {topProducts.map((product, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                          {index + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {product.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatNumber(product.revenue)} so&apos;m
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <p className="font-semibold text-gray-900">{product.quantity}</p>
                        <p className="text-xs text-gray-500">dona</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-400">Ma&apos;lumot topilmadi</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                ⚠️ Kam qolgan mahsulotlar
              </h3>
              <p className="text-yellow-700">
                Minimal zaxira darajasiga yetgan mahsulotlar
              </p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-red-900 mb-2">
                🕒 Muddati tugayotgan mahsulotlar
              </h3>
              <p className="text-red-700">
                Yaroqlilik muddati tugashiga yaqin mahsulotlar
              </p>
            </div>
          </div>
        </>
      )}

      {/* No Data State */}
      {!loading && !stats && (
        <div className="text-center py-20">
          <p className="text-gray-500 text-lg">Ma&apos;lumotlarni yuklashda xatolik yuz berdi</p>
          <button
            onClick={fetchStats}
            className="mt-4 px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Qayta urinib ko&apos;rish
          </button>
        </div>
      )}

      {/* Clear History Modal */}
      {showClearModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <TrashIcon />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Tarixni o&apos;chirish
              </h3>
              <p className="text-gray-600">
                Barcha sotuvlar tarixi o&apos;chiriladi. Bu amalni qaytarib bo&apos;lmaydi. Davom
                etmoqchimisiz?
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearModal(false)}
                disabled={clearingHistory}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleClearHistory}
                disabled={clearingHistory}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {clearingHistory ? "O'chirilmoqda..." : "O'chirish"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
