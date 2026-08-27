'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { name: 'Mahsulotlar', href: '/products' },
  { name: 'Kategoriyalar', href: '/products/categories' },
  { name: 'Tovar hisoboti', href: '/products/report' },
];

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div>
      {/* Tabs */}
      <div className="border-b border-gray-200 bg-white px-8">
        <nav className="flex gap-8">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`
                  py-4 border-b-2 font-medium transition-colors
                  ${isActive
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                  }
                `}
              >
                {tab.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      {children}
    </div>
  );
}
