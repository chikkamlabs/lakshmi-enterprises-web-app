'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ShoppingCart, Store, Package } from 'lucide-react';

export default function AssociateBottomNavigation() {
  const pathname = usePathname();

  const navItems = [
    {
      label: 'Home',
      href: '/associate/dashboard',
      icon: Home,
      isActive: pathname === '/associate' || pathname === '/associate/dashboard',
    },
    {
      label: 'Orders',
      href: '/associate/orders',
      icon: ShoppingCart,
      isActive: pathname === '/associate/orders' || pathname.startsWith('/associate/orders'),
    },
    {
      label: 'Dealers',
      href: '/associate/dealers',
      icon: Store,
      isActive: pathname === '/associate/dealers' || pathname.startsWith('/associate/dealers'),
    },
    {
      label: 'Products',
      href: '/associate/products',
      icon: Package,
      isActive: pathname === '/associate/products' || pathname.startsWith('/associate/products'),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 py-2 px-4 shadow-lg">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors min-w-[64px] ${
                item.isActive
                  ? 'text-indigo-600 font-semibold bg-indigo-50'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 font-medium'
              }`}
            >
              <Icon className={`w-5 h-5 mb-1 ${item.isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span className="text-xs leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
