'use client';

import { useState, useEffect } from 'react';
import { Plus, Grid, List, Search, Filter } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  barcode?: string;
  quantity: number;
  minQuantity: number;
  salePrice: number;
  purchasePrice: number;
  category: { name: string };
  supplier: { name: string };
  expiryDate?: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const filteredProducts = products.filter((product) => {
    const matchesSearch = 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.barcode?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'low' && product.quantity <= product.minQuantity) ||
      (statusFilter === 'out' && product.quantity === 0);

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mahsulotlar</h1>
          <p className="text-gray-500 mt-1">{filteredProducts.length} ta mahsulot</p>
        </div>
        <button className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800">
          <Plus className="w-5 h-5" />
          Yangi mahsulot
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Mahsulot nomi yoki shtrix kod..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
              />
            </div>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 outline-none"
          >
            <option value="all">Barcha mahsulotlar</option>
            <option value="low">Kam qolgan</option>
            <option value="out">Tugagan</option>
          </select>

          <div className="flex gap-2 border border-gray-300 rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded ${viewMode === 'table' ? 'bg-gray-100' : ''}`}
            >
              <List className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-gray-100' : ''}`}
            >
              <Grid className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">Nomi</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">Shtrix kod</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">Kategoriya</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-900">Miqdor</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-900">Narx</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-900">Marja</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => {
                const margin = product.salePrice - product.purchasePrice;
                const marginPercent = ((margin / product.purchasePrice) * 100).toFixed(1);
                const isLow = product.quantity <= product.minQuantity;
                
                return (
                  <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{product.name}</div>
                      <div className="text-sm text-gray-500">{product.supplier.name}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-mono text-sm">
                      {product.barcode || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                        {product.category.name}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-semibold ${isLow ? 'text-red-600' : 'text-gray-900'}`}>
                        {product.quantity}
                      </span>
                      {isLow && <span className="ml-2 text-xs text-red-600">⚠️ Kam</span>}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-gray-900">
                      {product.salePrice.toLocaleString()} so'm
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="font-semibold text-green-600">
                        +{margin.toLocaleString()} so'm
                      </div>
                      <div className="text-xs text-gray-500">{marginPercent}%</div>
                    </td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Mahsulotlar topilmadi
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => {
            const isLow = product.quantity <= product.minQuantity;
            return (
              <div key={product.id} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                <div className="h-32 bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
                  <span className="text-4xl text-gray-400">📦</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{product.name}</h3>
                <p className="text-sm text-gray-500 mb-3">{product.category.name}</p>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {product.salePrice.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">so'm</p>
                  </div>
                  <div className={`text-right ${isLow ? 'text-red-600' : 'text-gray-600'}`}>
                    <p className="font-semibold">{product.quantity}</p>
                    <p className="text-xs">{isLow ? '⚠️ Kam' : 'dona'}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
