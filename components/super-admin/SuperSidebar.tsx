'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Building2, BarChart3, LogOut, Shield, Menu, X } from 'lucide-react';
import { useState } from 'react';

const menuItems = [
  { name: 'Dashboard',    href: '/super-admin/dashboard',   icon: LayoutDashboard },
  { name: 'Filiallar',    href: '/super-admin/branches',    icon: Building2 },
  { name: 'Statistika',   href: '/super-admin/statistics',  icon: BarChart3 },
];

export default function SuperSidebar() {
  const pathname    = usePathname();
  const router      = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch { /* silent */ } finally {
      setLoggingOut(false);
    }
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const NavContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="h-14 flex items-center justify-between px-5 border-b border-indigo-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-300" />
          <div>
            <h1 className="text-base font-bold text-white leading-tight">GEM</h1>
            <p className="text-[10px] text-indigo-300 leading-tight">Super Admin</p>
          </div>
        </div>
        <button onClick={() => setMobileOpen(false)} className="md:hidden p-1 text-indigo-300">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {menuItems.map(item => {
          const Icon   = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                active
                  ? 'bg-indigo-700 text-white'
                  : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User & Logout */}
      <div className="p-3 border-t border-indigo-800 flex-shrink-0">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 bg-indigo-700 rounded-full flex items-center justify-center flex-shrink-0">
            <Shield className="w-4 h-4 text-indigo-200" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">Super Admin</p>
            <p className="text-xs text-indigo-300 truncate">gem</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center gap-3 px-3 py-2 text-red-300 hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{loggingOut ? 'Chiqilmoqda...' : 'Chiqish'}</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex h-screen w-56 lg:w-60 bg-indigo-900 flex-col flex-shrink-0">
        {NavContent}
      </div>

      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-indigo-900 h-12 flex items-center px-4 gap-3 border-b border-indigo-800">
        <button onClick={() => setMobileOpen(true)} className="p-1.5 text-indigo-200">
          <Menu className="w-5 h-5" />
        </button>
        <Shield className="w-4 h-4 text-indigo-300" />
        <h1 className="text-sm font-bold text-white">GEM Super Admin</h1>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative w-60 bg-indigo-900 h-full flex flex-col shadow-2xl">
            {NavContent}
          </div>
        </div>
      )}
    </>
  );
}
