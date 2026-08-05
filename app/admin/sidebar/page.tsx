'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  ShoppingCart,
  Clock,
  Package,
  Store,
  Users,
  UserCheck,
  Building2,
  ChevronDown,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';

export default function AdminSidebar() {
  const pathname = usePathname();
  const [backOrdersOpen, setBackOrdersOpen] = useState<boolean>(true);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  // Determine selected item based on current pathname
  const getCurrentSelected = (): string => {
    if (pathname?.includes('/backorder_dealers') || pathname?.includes('/addbackorderdealer') || pathname?.includes('/openbackorderdealer')) return 'back-dealers';
    if (pathname?.includes('/backorder_products') || pathname?.includes('/addbackorderproduct') || pathname?.includes('/openbackorderproduct')) return 'back-products';
    if (pathname?.includes('/orders') || pathname?.includes('/openOrder')) return 'orders';
    if (pathname === '/admin/dashboard' || pathname === '/admin') return 'home';
    if (pathname?.includes('/staff')) return 'staff';
    if (pathname?.includes('/addstaff')) return 'staff';
    if (pathname?.includes('/associates')) return 'associates';
    if (pathname?.includes('/addassociate')) return 'associates';
    if (pathname?.includes('/products')) return 'products';
    if (pathname?.includes('/addproduct')) return 'products';
    if (pathname?.includes('/editproduct')) return 'products';
    if (pathname?.includes('/dealers')) return 'dealers';
    if (pathname?.includes('/adddealer')) return 'dealers';
    if (pathname?.includes('/editdealer')) return 'dealers';
    if (pathname?.includes('/companies')) return 'companies';
    if (pathname?.includes('/addcompany')) return 'companies';
    if (pathname?.includes('/companyedit')) return 'companies';
    if (pathname?.includes('/dashboard')) return 'home';
    return 'home';
  };

  const selected = getCurrentSelected();

  const navItems = (
    <div className="w-full flex flex-col h-full bg-slate-900 text-slate-300 border-r border-slate-800 select-none">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Admin Menu
        </h2>
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden p-1 text-slate-400 hover:text-white rounded-md"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {/* Home */}
        <Link
          href="/admin/dashboard"
          onClick={() => setMobileOpen(false)}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            selected === 'home'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Home className="w-4 h-4 shrink-0" />
          <span>Home</span>
        </Link>

        {/* 1. Orders */}
        <Link
          href="/admin/orders/dashboard"
          onClick={() => setMobileOpen(false)}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            selected === 'orders'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <ShoppingCart className="w-4 h-4 shrink-0" />
          <span>Orders</span>
        </Link>

        {/* 2. Companies */}
        <Link
          href="/admin/companies/dashbaord"
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            selected === 'companies'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Building2 className="w-4 h-4 shrink-0" />
          <span>Companies</span>
        </Link>

        {/* 3. Back orders (products, dealers) */}
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setBackOrdersOpen(!backOrdersOpen)}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              selected.startsWith('back-orders')
                ? 'bg-slate-800 text-indigo-400 font-semibold'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 shrink-0" />
              <span>Back orders</span>
            </div>
            {backOrdersOpen ? (
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            )}
          </button>

          {backOrdersOpen && (
            <div className="ml-7 space-y-1 pl-2.5 border-l border-slate-800">
              <Link
                href="/admin/backorder_products/dashboard"
                onClick={() => setMobileOpen(false)}
                className={`w-full text-left px-3 py-2 rounded-md text-xs font-medium transition-colors block ${
                  selected === 'back-products'
                    ? 'text-white bg-indigo-600 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                Products
              </Link>
              <Link
                href="/admin/backorder_dealers/dashboard"
                onClick={() => setMobileOpen(false)}
                className={`w-full text-left px-3 py-2 rounded-md text-xs font-medium transition-colors block ${
                  selected === 'back-dealers'
                    ? 'text-white bg-indigo-600 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                Dealers
              </Link>
            </div>
          )}
        </div>

        {/* 4. Products */}
        <Link
          href="/admin/products/dashboard"
          onClick={() => setMobileOpen(false)}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            selected === 'products'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Package className="w-4 h-4 shrink-0" />
          <span>Products</span>
        </Link>

        {/* 5. Dealers */}
        <Link
          href="/admin/dealers/dashboard"
          onClick={() => setMobileOpen(false)}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            selected === 'dealers'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Store className="w-4 h-4 shrink-0" />
          <span>Dealers</span>
        </Link>

        {/* 6. Associates */}
        <Link
          href="/admin/associates/dashboard"
          onClick={() => setMobileOpen(false)}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            selected === 'associates'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4 shrink-0" />
          <span>Associates</span>
        </Link>

        {/* 7. Staff */}
        <Link
          href="/admin/staff/dashboard"
          onClick={() => setMobileOpen(false)}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            selected === 'staff'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <UserCheck className="w-4 h-4 shrink-0" />
          <span>Staff</span>
        </Link>
      </nav>
    </div>
  );

  return (
    <>
      {/* Responsive Navigation Topbar for Mobile */}
      <div className="md:hidden bg-slate-900 text-white px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Menu</span>
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 bg-slate-800 rounded-md text-slate-300 hover:text-white flex items-center gap-2 text-xs font-medium"
        >
          <Menu className="w-4 h-4" />
          <span>Navigation</span>
        </button>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 h-[calc(100vh-4rem)] sticky top-16 shrink-0 overflow-y-auto">
        {navItems}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-64 max-w-xs h-full bg-slate-900 z-50">
            {navItems}
          </aside>
        </div>
      )}
    </>
  );
}
