'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle, Clock, Package, RefreshCw,
  TrendingUp, Tag, ShoppingCart, Wallet, BarChart2,
} from 'lucide-react';

/* ── Types ── */
interface Summary {
  totalSkus:           number;
  totalUnits:          number;
  totalCostValue:      number;
  totalSaleValue:      number;
  totalPotentialProfit: number;
}
interface CategoryStat {
  name:      string;
  skus:      number;
  units:     number;
  costValue: number;
  saleValue: number;
}
interface TopItem  { name: string; qty: number; revenue: number }
interface LowItem  { id: string; name: string; quantity: number; minQuantity: number; unit: string }
interface ExpItem  { id: string; name: string; expiryDate: string; quantity: number; unit: string; daysLeft: number }

const fmt     = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(n));
const fmtDate = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

/* ── Summary Card ── */
function SCard({ label, value, sub, icon: Icon, bg }: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; bg: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bg}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

/* ── Main ── */
export default function ReportPage() {
  const [summary,     setSummary]     = useState<Summary | null>(null);
  const [byCategory,  setByCategory]  = useState<CategoryStat[]>([]);
  const [topSelling,  setTopSelling]  = useState<TopItem[]>([]);
  const [lowStock,    setLowStock]    = useState<LowItem[]>([]);
  const [expiringSoon,setExpiringSoon]= useState<ExpItem[]>([]);
  const [loading,     setLoading]     = useState(true);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/products/report');
      const data = await res.json();
      setSummary(data.summary     ?? null);
      setByCategory(data.byCategory ?? []);
      setTopSelling(data.topSelling ?? []);
      setLowStock(data.lowStock     ?? []);
      setExpiringSoon(data.expiringSoon ?? []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const maxQty     = Math.max(...topSelling.map(t => t.qty), 1);
  const expiredCnt = expiringSoon.filter(i => i.daysLeft <= 0).length;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart2 className="w-7 h-7 text-gray-700" />
            Tovar hisoboti
          </h1>
          <p className="text-sm text-gray-500 mt-1">Zaxira holati va savdo tahlili</p>
        </div>
        <button onClick={fetchReport} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Yangilash
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <svg className="animate-spin w-10 h-10 text-gray-300" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
        </div>
      ) : (
        <>
          {/* ── Umumiy ko'rsatkichlar ── */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <SCard label="Tovar turlari"     value={`${fmt(summary.totalSkus)} tur`}
                sub="SKU soni" icon={Tag} bg="bg-gray-700" />
              <SCard label="Jami zaxira"       value={`${fmt(summary.totalUnits)} dona`}
                sub="Barcha mahsulotlar" icon={Package} bg="bg-blue-600" />
              <SCard label="Sotib olish qiymati" value={`${fmt(summary.totalCostValue)} so'm`}
                sub="Investitsiya" icon={Wallet} bg="bg-red-500" />
              <SCard label="Sotish qiymati"    value={`${fmt(summary.totalSaleValue)} so'm`}
                sub="Zaxira narxi" icon={ShoppingCart} bg="bg-green-600" />
              <SCard label="Potensial foyda"   value={`${fmt(summary.totalPotentialProfit)} so'm`}
                sub={summary.totalSaleValue > 0
                  ? `${((summary.totalPotentialProfit / summary.totalSaleValue) * 100).toFixed(1)}% marja`
                  : undefined}
                icon={TrendingUp} bg="bg-purple-600" />
            </div>
          )}

          {/* ── Kategoriya bo'yicha ── */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
              <Tag className="w-4 h-4 text-gray-500" />
              <h2 className="font-semibold text-gray-800">Kategoriya bo'yicha tahlil</h2>
              <span className="ml-auto text-xs text-gray-400">{byCategory.length} ta kategoriya</span>
            </div>
            {byCategory.length === 0 ? (
              <p className="text-center text-gray-400 py-10 text-sm">Ma'lumot yo'q</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="text-left px-5 py-3">Kategoriya</th>
                    <th className="text-right px-5 py-3">Turlar</th>
                    <th className="text-right px-5 py-3">Jami soni</th>
                    <th className="text-right px-5 py-3">Sotib olish</th>
                    <th className="text-right px-5 py-3">Sotish qiymati</th>
                    <th className="text-right px-5 py-3">Foyda</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {byCategory.map((cat, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-gray-400" />
                          <span className="font-medium text-gray-900">{cat.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right text-sm text-gray-600">{cat.skus} tur</td>
                      <td className="px-5 py-3.5 text-right text-sm text-gray-600">{fmt(cat.units)} dona</td>
                      <td className="px-5 py-3.5 text-right text-sm text-gray-500">{fmt(cat.costValue)} so'm</td>
                      <td className="px-5 py-3.5 text-right text-sm font-semibold text-gray-900">{fmt(cat.saleValue)} so'm</td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="text-sm font-bold text-green-600">+{fmt(cat.saleValue - cat.costValue)} so'm</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Jami */}
                {summary && (
                  <tfoot>
                    <tr className="bg-gray-900 text-white text-sm font-semibold">
                      <td className="px-5 py-3">Jami</td>
                      <td className="px-5 py-3 text-right">{summary.totalSkus} tur</td>
                      <td className="px-5 py-3 text-right">{fmt(summary.totalUnits)} dona</td>
                      <td className="px-5 py-3 text-right">{fmt(summary.totalCostValue)} so'm</td>
                      <td className="px-5 py-3 text-right">{fmt(summary.totalSaleValue)} so'm</td>
                      <td className="px-5 py-3 text-right text-green-400">+{fmt(summary.totalPotentialProfit)} so'm</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            )}
          </div>

          {/* ── Eng ko'p sotilganlar (30 kun) ── */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <h2 className="font-semibold text-gray-800">Eng ko'p sotilgan tovarlar</h2>
              <span className="ml-auto text-xs text-gray-400">So'nggi 30 kun</span>
            </div>
            {topSelling.length === 0 ? (
              <div className="py-10 text-center text-gray-400">
                <ShoppingCart className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                <p className="text-sm">So'nggi 30 kunda sotuv yo'q</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {topSelling.map((item, i) => {
                  const pct = (item.qty / maxQty) * 100;
                  return (
                    <div key={i} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50">
                      {/* Rank */}
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        i === 0 ? 'bg-yellow-100 text-yellow-700' :
                        i === 1 ? 'bg-gray-200 text-gray-600' :
                        i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'
                      }`}>{i + 1}</span>
                      {/* Nom + bar */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                            <div className="bg-gray-900 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-gray-500 flex-shrink-0">{fmt(item.qty)} dona</span>
                        </div>
                      </div>
                      {/* Daromad */}
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-gray-900">{fmt(item.revenue)}</p>
                        <p className="text-xs text-gray-400">so'm</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Kam qolgan + Muddati o'tayotgan ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Kam qolgan */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-red-50 px-5 py-3 border-b border-red-100 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <h2 className="font-semibold text-red-700">Kam qolgan</h2>
                <span className="ml-auto bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">
                  {lowStock.length}
                </span>
              </div>
              {lowStock.length === 0 ? (
                <div className="py-10 text-center text-gray-400">
                  <Package className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                  <p className="text-sm">Barcha mahsulotlar yetarli</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
                  {lowStock.map(item => {
                    const pct     = Math.min((item.quantity / item.minQuantity) * 100, 100);
                    const deficit = item.minQuantity - item.quantity;
                    return (
                      <div key={item.id} className={`px-5 py-3 ${item.quantity === 0 ? 'bg-red-50' : ''}`}>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-semibold text-gray-900 truncate pr-2">{item.name}</p>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className={`text-sm font-bold ${item.quantity === 0 ? 'text-red-600' : 'text-orange-600'}`}>
                              {fmt(item.quantity)}
                            </span>
                            <span className="text-xs text-gray-400">/ {fmt(item.minQuantity)} {item.unit}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full ${item.quantity === 0 ? 'bg-red-500' : 'bg-orange-400'}`}
                              style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-red-500 flex-shrink-0">-{fmt(deficit)} {item.unit}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Muddati o'tayotgan */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-orange-50 px-5 py-3 border-b border-orange-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-500" />
                <h2 className="font-semibold text-orange-700">Muddati yaqin / o'tgan</h2>
                <div className="ml-auto flex items-center gap-1.5">
                  {expiredCnt > 0 && (
                    <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">
                      {expiredCnt} o'tgan
                    </span>
                  )}
                  <span className="bg-orange-100 text-orange-600 text-xs font-bold px-2 py-0.5 rounded-full">
                    {expiringSoon.length}
                  </span>
                </div>
              </div>
              {expiringSoon.length === 0 ? (
                <div className="py-10 text-center text-gray-400">
                  <Clock className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                  <p className="text-sm">Muddati yaqin mahsulot yo'q</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
                  {expiringSoon.map(item => (
                    <div key={item.id} className={`px-5 py-3 flex items-center justify-between ${item.daysLeft <= 0 ? 'bg-red-50' : ''}`}>
                      <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          item.daysLeft <= 0 ? 'bg-red-500' :
                          item.daysLeft <= 3 ? 'bg-orange-500' : 'bg-yellow-400'
                        }`} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                          <p className="text-xs text-gray-400">{fmt(item.quantity)} {item.unit}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-gray-500">{fmtDate(item.expiryDate)}</p>
                        <span className={`text-xs font-bold ${
                          item.daysLeft <= 0 ? 'text-red-600' :
                          item.daysLeft <= 3 ? 'text-orange-600' : 'text-yellow-600'
                        }`}>
                          {item.daysLeft <= 0 ? 'Muddati o\'tgan' : `${item.daysLeft} kun`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
