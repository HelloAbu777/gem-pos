'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  BarChart3, 
  ShoppingCart,
  Building2,
  LogOut 
} from 'lucide-react';
import { useState } from 'react';

const menuItems = [
  { name: 'Dashboard',        href: '/dashboard',       icon: LayoutDashboard },
  { name: 'Mahsulotlar',      href: '/products',        icon: Package },
  { name: 'Taminotchilar',    href: '/suppliers',       icon: Users },
  { name: 'Yuridik Shaxslar', href: '/legal-entities',  icon: Building2 },
  { name: 'Statistika',       href: '/statistics',      icon: BarChart3 },
  { name: 'Kassa (POS)',      href: '/pos',             icon: ShoppingCart },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

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

  return (
    <div className="h-screen w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center justify-center border-b border-gray-200 bg-white">
        <h1 className="text-2xl font-bold text-gray-900">GEM</h1>
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                ${isActive 
                  ? 'bg-gray-900 text-white' 
                  : 'text-gray-700 hover:bg-gray-100'
                }
              `}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User & Logout */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3 px-4 py-2 mb-2">
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
            <span className="text-sm font-bold text-gray-700">A</span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Admin</p>
            <p className="text-xs text-gray-500">Administrator</p>
          </div>
        </div>
        
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">{loggingOut ? 'Chiqilmoqda...' : 'Chiqish'}</span>
        </button>
      </div>
    </div>
  );
}
