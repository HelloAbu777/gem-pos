'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, X, Package, Tag, Truck, Calendar,
  AlertTriangle, ChevronRight, Barcode,
} from 'lucide-react';

/* ── Types ── */
interface Product {
  id: string;
  name: string;
  barcode?: string;
  unit: string;
  quantity: number;
  minQuantity: number;
  purchasePrice: number;
  salePrice: number;
  margin: number;
  vatType: string;
  expiryDate?: string | null;
  category:  { id: string; name: string };
  supplier:  { id: string; name: string };
  createdAt: string;
}

const fmt     = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(n));
const fmtDate = (s: string) => new Date(s).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
const VAT_LABELS: Record<string, string> = {
  NO_VAT:   'Soliqsiz',
  STANDARD: 'Standart',
  ZERO_VAT: 'Soliq 0%',
};

/* ── Detail Modal ── */
function ProductDetailModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const marginPct = product.purchasePrice > 0
    ? ((product.salePrice - product.purchasePrice) / product.purchasePrice * 100).toFixed(1)
    : '0';
  const isLow     = product.quantity <= product.minQuantity;
  const isOut     = product.quantity === 0;
  const expiryDays = product.expiryDate
    ? Math.ceil((new Date(product.expiryDate).getTime() - Date.now()) / 86400000)
    : null;

  const statusColor = isOut ? 'text-red-600 bg-red-50 border-red-200'
    : isLow ? 'text-orange-600 bg-orange-50 border-orange-200'
    : 'text-green-600 bg-green-50 border-green-200';
  const statusText = isOut ? 'Tugagan' : isLow ? 'Kam qolgan' : 'Yetarli';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="bg-gray-900 text-white px-6 py-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight">{product.name}</h2>
              <p className="text-gray-400 text-sm mt-0.5">{product.category.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white mt-0.5">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">

          {/* Holat badge */}
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border ${statusColor}`}>
              {isLow && <AlertTriangle className="w-3.5 h-3.5" />}
              {statusText}
            </span>
            {expiryDays !== null && (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border ${
                expiryDays <= 0 ? 'text-red-600 bg-red-50 border-red-200' :
                expiryDays <= 7 ? 'text-orange-600 bg-orange-50 border-orange-200' :
                'text-gray-600 bg-gray-50 border-gray-200'
              }`}>
                <Calendar className="w-3.5 h-3.5" />
                {expiryDays <= 0 ? 'Muddati o\'tgan' : `${expiryDays} kun qoldi`}
              </span>
            )}
          </div>

          {/* Asosiy ma'lumotlar */}
          <div className="grid grid-cols-2 gap-3">
            {/* Kelish narxi */}
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Kelish narxi</p>
              <p className="text-xl font-bold text-gray-900">{fmt(product.purchasePrice)}</p>
              <p className="text-xs text-gray-400">so'm</p>
            </div>
            {/* Sotish narxi */}
            <div className="bg-green-50 border border-green-100 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Sotish narxi</p>
              <p className="text-xl font-bold text-green-700">{fmt(product.salePrice)}</p>
              <p className="text-xs text-gray-400">so'm</p>
            </div>
            {/* Marja */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Marja (foyda)</p>
              <p className="text-xl font-bold text-blue-700">+{fmt(product.salePrice - product.purchasePrice)}</p>
              <p className="text-xs text-blue-400">{marginPct}% markup</p>
            </div>
            {/* Zaxira */}
            <div className={`rounded-xl p-4 border ${isOut ? 'bg-red-50 border-red-100' : isLow ? 'bg-orange-50 border-orange-100' : 'bg-white border-gray-200'}`}>
              <p className="text-xs text-gray-500 mb-1">Zaxira</p>
              <p className={`text-xl font-bold ${isOut ? 'text-red-600' : isLow ? 'text-orange-600' : 'text-gray-900'}`}>
                {fmt(product.quantity)}
              </p>
              <p className="text-xs text-gray-400">{product.unit} (min: {fmt(product.minQuantity)})</p>
            </div>
          </div>

          {/* Qo'shimcha ma'lumotlar */}
          <div className="border border-gray-200 rounded-xl divide-y divide-gray-100">
            {/* Barcode */}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Barcode className="w-4 h-4" />
                Shtrix kod
              </div>
              <span className="font-mono text-sm text-gray-800 bg-gray-100 px-2.5 py-1 rounded-md">
                {product.barcode || '—'}
              </span>
            </div>
            {/* Kategoriya */}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Tag className="w-4 h-4" />
                Kategoriya
              </div>
              <span className="text-sm font-medium text-gray-800">{product.category.name}</span>
            </div>
            {/* Ta'minotchi */}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Truck className="w-4 h-4" />
                Ta'minotchi
              </div>
              <span className="text-sm font-medium text-gray-800">{product.supplier.name}</span>
            </div>
            {/* O'lchov birligi */}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Package className="w-4 h-4" />
                O'lchov birligi
              </div>
              <span className="text-sm font-medium text-gray-800">{product.unit}</span>
            </div>
            {/* Soliq */}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <ChevronRight className="w-4 h-4" />
                Soliq turi
              </div>
              <span className="text-sm font-medium text-gray-800">{VAT_LABELS[product.vatType] ?? product.vatType}</span>
            </div>
            {/* Muddat */}
            {product.expiryDate && (
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Calendar className="w-4 h-4" />
                  Yaroqlilik muddati
                </div>
                <span className={`text-sm font-semibold ${expiryDays !== null && expiryDays <= 0 ? 'text-red-600' : expiryDays !== null && expiryDays <= 7 ? 'text-orange-600' : 'text-gray-800'}`}>
                  {fmtDate(product.expiryDate)}
                </span>
              </div>
            )}
            {/* Qo'shilgan sana */}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar className="w-4 h-4" />
                Qo'shilgan
              </div>
              <span className="text-sm text-gray-600">{fmtDate(product.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5">
          <button onClick={onClose}
            className="w-full py-2.5 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 text-sm">
            Yopish
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function ProductsPage() {
  const [products,     setProducts]     = useState<Product[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [searchQuery,  setSearchQuery]  = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selected,     setSelected]     = useState<Product | null>(null);

  const fetchProducts = useCallback(async () => {
    try {
      const res  = await fetch('/api/products');
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const filtered = products.filter(p => {
    const matchSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.barcode ?? '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'low' && p.quantity <= p.minQuantity && p.quantity > 0) ||
      (statusFilter === 'out' && p.quantity === 0);
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mahsulotlar</h1>
          <p className="text-sm text-gray-500 mt-1">{filtered.length} ta mahsulot</p>
        </div>
        <button className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-lg hover:bg-gray-800 text-sm font-medium">
          <Plus className="w-4 h-4" />
          Yangi mahsulot
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input type="text" placeholder="Nomi yoki shtrix kod..." value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 outline-none" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 outline-none bg-white">
          <option value="all">Barchasi</option>
          <option value="low">Kam qolgan</option>
          <option value="out">Tugagan</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20">
            <svg className="animate-spin w-8 h-8 text-gray-300" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Mahsulot</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Kategoriya</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Kelish narxi</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sotish narxi</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Marja</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Zaxira</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-gray-400">
                    <Package className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                    Mahsulot topilmadi
                  </td>
                </tr>
              ) : filtered.map(p => {
                const isLow  = p.quantity <= p.minQuantity && p.quantity > 0;
                const isOut  = p.quantity === 0;
                const margin = p.salePrice - p.purchasePrice;
                const marginPct = p.purchasePrice > 0
                  ? ((margin / p.purchasePrice) * 100).toFixed(0) : '0';

                // Expiry
                const expiryDays = p.expiryDate
                  ? Math.ceil((new Date(p.expiryDate).getTime() - Date.now()) / 86400000)
                  : null;
                const isExpiringSoon = expiryDays !== null && expiryDays <= 7 && expiryDays > 0;
                const isExpired      = expiryDays !== null && expiryDays <= 0;

                return (
                  <tr key={p.id}
                    onClick={() => setSelected(p)}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
                    {/* Nomi */}
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-gray-900">{p.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {p.expiryDate && (
                          <span className={`text-xs ${isExpired ? 'text-red-500 font-semibold' : isExpiringSoon ? 'text-orange-500' : 'text-gray-400'}`}>
                            {isExpired ? '⚠ Muddati o\'tgan' : isExpiringSoon ? `⏰ ${expiryDays} kun qoldi` : `📅 ${fmtDate(p.expiryDate)}`}
                          </span>
                        )}
                        {p.barcode && (
                          <span className="text-xs text-gray-400 font-mono">{p.barcode}</span>
                        )}
                      </div>
                    </td>
                    {/* Kategoriya */}
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
                        {p.category.name}
                      </span>
                    </td>
                    {/* Kelish narxi */}
                    <td className="px-5 py-3.5 text-right">
                      <span className="text-sm text-gray-600">{fmt(p.purchasePrice)}</span>
                      <span className="text-xs text-gray-400 ml-0.5">so'm</span>
                    </td>
                    {/* Sotish narxi */}
                    <td className="px-5 py-3.5 text-right">
                      <span className="text-sm font-bold text-gray-900">{fmt(p.salePrice)}</span>
                      <span className="text-xs text-gray-400 ml-0.5">so'm</span>
                    </td>
                    {/* Marja */}
                    <td className="px-5 py-3.5 text-right hidden lg:table-cell">
                      <span className="text-sm font-semibold text-green-600">+{fmt(margin)}</span>
                      <span className="text-xs text-gray-400 ml-1">({marginPct}%)</span>
                    </td>
                    {/* Zaxira */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {(isLow || isOut) && <AlertTriangle className={`w-3.5 h-3.5 ${isOut ? 'text-red-500' : 'text-orange-500'}`} />}
                        <span className={`font-bold text-sm ${isOut ? 'text-red-600' : isLow ? 'text-orange-600' : 'text-gray-900'}`}>
                          {fmt(p.quantity)}
                        </span>
                        <span className="text-xs text-gray-400">{p.unit}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <ProductDetailModal product={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
