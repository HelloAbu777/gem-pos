'use client';

import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Clock, Package, RefreshCw, TrendingDown } from 'lucide-react';

interface LowStockItem {
  id: string;
  name: string;
  quantity: number;
  minQuantity: number;
  unit: string;
}
interface ExpiringItem {
  id: string;
  name: string;
  expiryDate: string;
  quantity: number;
  unit: string;
  daysLeft: number;
}

const fmt     = (n: number) => new Intl.NumberFormat('uz-UZ').format(n);
const fmtDate = (s: string) => new Date(s).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' });

export default function ReportPage() {
  const [lowStock,     setLowStock]     = useState<LowStockItem[]>([]);
  const [expiringSoon, setExpiringSoon] = useState<ExpiringItem[]>([]);
  const [loading,      setLoading]      = useState(true);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/products/report');
      const data = await res.json();
      setLowStock(Array.isArray(data.lowStock) ? data.lowStock : []);
      setExpiringSoon(Array.isArray(data.expiringSoon) ? data.expiringSoon : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const expiredItems   = expiringSoon.filter(i => i.daysLeft <= 0);
  const expiringItems  = expiringSoon.filter(i => i.daysLeft > 0);

  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingDown className="w-7 h-7 text-red-500" />
            Tovar hisoboti
          </h1>
          <p className="text-sm text-gray-500 mt-1">Kam qolgan va muddati o'tayotgan mahsulotlar</p>
        </div>
        <button onClick={fetchReport} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Yangilash
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <p className="text-xs font-semibold text-red-600">Kam qolgan</p>
          </div>
          <p className="text-2xl font-bold text-red-700">{lowStock.length}</p>
          <p className="text-xs text-red-500 mt-0.5">ta mahsulot</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-orange-500" />
            <p className="text-xs font-semibold text-orange-600">Muddati yaqin</p>
          </div>
          <p className="text-2xl font-bold text-orange-700">{expiringItems.length}</p>
          <p className="text-xs text-orange-500 mt-0.5">7 kun ichida</p>
        </div>
        <div className="bg-gray-100 border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-4 h-4 text-gray-500" />
            <p className="text-xs font-semibold text-gray-600">Muddati o'tgan</p>
          </div>
          <p className="text-2xl font-bold text-gray-700">{expiredItems.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">ta mahsulot</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <svg className="animate-spin w-8 h-8 text-gray-300" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
        </div>
      ) : (
        <div className="space-y-6">

          {/* Kam qolgan mahsulotlar */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-red-50 px-5 py-3 border-b border-red-100 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <h2 className="font-semibold text-red-700">Kam qolgan mahsulotlar</h2>
              <span className="ml-auto bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">{lowStock.length}</span>
            </div>
            {lowStock.length === 0 ? (
              <div className="py-10 text-center text-gray-400">
                <Package className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                <p className="text-sm">Barcha mahsulotlar yetarli miqdorda</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase px-5 py-3">Mahsulot nomi</th>
                    <th className="text-right text-xs font-semibold text-gray-500 uppercase px-5 py-3">Mavjud</th>
                    <th className="text-right text-xs font-semibold text-gray-500 uppercase px-5 py-3">Minimal</th>
                    <th className="text-right text-xs font-semibold text-gray-500 uppercase px-5 py-3">Kamomad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lowStock.map(item => {
                    const deficit = item.minQuantity - item.quantity;
                    const pct     = Math.min((item.quantity / item.minQuantity) * 100, 100);
                    return (
                      <tr key={item.id} className={`hover:bg-gray-50 ${item.quantity === 0 ? 'bg-red-50' : ''}`}>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-8 rounded-full ${item.quantity === 0 ? 'bg-red-500' : 'bg-orange-400'}`} />
                            <div>
                              <p className="font-medium text-gray-900">{item.name}</p>
                              {/* Progress bar */}
                              <div className="w-32 bg-gray-200 rounded-full h-1.5 mt-1">
                                <div className={`h-1.5 rounded-full ${item.quantity === 0 ? 'bg-red-500' : 'bg-orange-400'}`}
                                  style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className={`font-bold ${item.quantity === 0 ? 'text-red-600' : 'text-orange-600'}`}>
                            {fmt(item.quantity)}
                          </span>
                          <span className="text-gray-400 text-xs ml-1">{item.unit}</span>
                        </td>
                        <td className="px-5 py-3.5 text-right text-gray-500 text-sm">{fmt(item.minQuantity)} {item.unit}</td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="text-red-600 font-semibold">-{fmt(deficit)}</span>
                          <span className="text-gray-400 text-xs ml-1">{item.unit}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Muddati o'tayotgan mahsulotlar */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-orange-50 px-5 py-3 border-b border-orange-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" />
              <h2 className="font-semibold text-orange-700">Muddati yaqin / o'tgan mahsulotlar</h2>
              <span className="ml-auto bg-orange-100 text-orange-600 text-xs font-bold px-2 py-0.5 rounded-full">{expiringSoon.length}</span>
            </div>
            {expiringSoon.length === 0 ? (
              <div className="py-10 text-center text-gray-400">
                <Clock className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                <p className="text-sm">Muddati yaqin mahsulotlar yo'q</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase px-5 py-3">Mahsulot nomi</th>
                    <th className="text-right text-xs font-semibold text-gray-500 uppercase px-5 py-3">Miqdor</th>
                    <th className="text-center text-xs font-semibold text-gray-500 uppercase px-5 py-3">Muddati</th>
                    <th className="text-center text-xs font-semibold text-gray-500 uppercase px-5 py-3">Holat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {expiringSoon.map(item => (
                    <tr key={item.id} className={`hover:bg-gray-50 ${item.daysLeft <= 0 ? 'bg-red-50' : ''}`}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-8 rounded-full ${item.daysLeft <= 0 ? 'bg-red-500' : item.daysLeft <= 3 ? 'bg-orange-500' : 'bg-yellow-400'}`} />
                          <p className="font-medium text-gray-900">{item.name}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right text-sm text-gray-600">
                        {fmt(item.quantity)} <span className="text-gray-400">{item.unit}</span>
                      </td>
                      <td className="px-5 py-3.5 text-center text-sm text-gray-600">{fmtDate(item.expiryDate)}</td>
                      <td className="px-5 py-3.5 text-center">
                        {item.daysLeft <= 0 ? (
                          <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full">
                            Muddati o'tgan
                          </span>
                        ) : item.daysLeft <= 3 ? (
                          <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 text-xs font-bold px-2.5 py-1 rounded-full">
                            {item.daysLeft} kun qoldi
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-700 text-xs font-bold px-2.5 py-1 rounded-full">
                            {item.daysLeft} kun qoldi
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
