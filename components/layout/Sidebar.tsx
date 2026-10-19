'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  BarChart3,
  ShoppingCart,
  Building2,
  UtensilsCrossed,
  Warehouse,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';

const menuItems = [
  { name: 'Dashboard',        href: '/dashboard',       icon: LayoutDashboard },
  { name: 'Mahsulotlar',      href: '/products',        icon: Package },
  { name: 'Taomlar',          href: '/dishes',          icon: UtensilsCrossed },
  { name: 'Ombor',            href: '/warehouse',       icon: Warehouse },
  { name: 'Yuridik Shaxslar', href: '/legal-entities',  icon: Building2 },
  { name: 'Statistika',       href: '/statistics',      icon: BarChart3 },
  { name: 'Kassa (POS)',      href: '/pos',             icon: ShoppingCart },
];

export default function Sidebar() {
  const pathname   = usePathname();
  const router     = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoggingOut(false);
    }
  };

  const isActive = (href: string) =>
    pathname === href ||
    (href !== '/products' && href !== '/warehouse' && pathname?.startsWith(href + '/')) ||
    (href === '/products'  && (pathname === '/products'  || pathname?.startsWith('/products/'))) ||
    (href === '/warehouse' && (pathname === '/warehouse' || pathname?.startsWith('/warehouse/')));

  const NavContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="h-14 flex items-center justify-between px-5 border-b border-gray-200 bg-white flex-shrink-0">
        <h1 className="text-xl font-bold text-gray-900">GEM</h1>
        {/* Mobile yopish tugmasi */}
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden p-1 text-gray-500 hover:text-gray-700"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {menuItems.map((item) => {
          const Icon   = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                active ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium text-sm">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-gray-700">A</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">Admin</p>
            <p className="text-xs text-gray-500 truncate">Administrator</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center gap-3 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <span className="font-medium text-sm">{loggingOut ? 'Chiqilmoqda...' : 'Chiqish'}</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <div className="hidden md:flex h-screen w-56 lg:w-64 bg-gray-50 border-r border-gray-200 flex-col flex-shrink-0">
        {NavContent}
      </div>

      {/* ── Mobile: Top bar + Hamburger ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200 h-12 flex items-center px-4 gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-1.5 text-gray-700 hover:bg-gray-100 rounded-lg"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold text-gray-900">GEM POS</h1>
        {/* Kassa tugmasi — tez kirish */}
        <Link
          href="/pos"
          className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${
            isActive('/pos') ? 'bg-gray-900 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          Kassa
        </Link>
      </div>

      {/* ── Mobile Drawer Overlay ── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          {/* Background overlay */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          {/* Sidebar panel */}
          <div className="relative w-64 bg-gray-50 h-full flex flex-col shadow-2xl">
            {NavContent}
          </div>
        </div>
      )}
    </>
  );
}
