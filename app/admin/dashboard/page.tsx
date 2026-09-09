'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminHeader from '../header/page';
import AdminSidebar from '../sidebar/page';
import { supabase } from '@/lib/supabase';
import { getOrders, Order } from '@/lib/ordersStore';
import { getStoredProducts, Product } from '@/lib/productsStore';
import { getBackorderItems, BackorderItem } from '@/lib/backorderproductStore';
import { getStoredAssociates, Associate } from '@/lib/associatesStore';
import {
  ShoppingBag,
  Package,
  Layers,
  Users,
  Loader2,
  ArrowRight,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [totalOrdersWeek, setTotalOrdersWeek] = useState<number>(0);
  const [totalProducts, setTotalProducts] = useState<number>(0);
  const [totalBackorderProducts, setTotalBackorderProducts] = useState<number>(0);
  const [totalAssociates, setTotalAssociates] = useState<number>(0);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardStats() {
      if (isMounted) setLoading(true);
      try {
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        // 1. Total Orders (last 1 week)
        let ordersWeekCount = 0;
        try {
          const { count, error } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', oneWeekAgo);

          if (!error && count !== null) {
            ordersWeekCount = count;
          } else {
            const allOrders = await getOrders();
            const oneWeekAgoMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
            ordersWeekCount = allOrders.filter(
              (o: Order) => o.created_at && new Date(o.created_at).getTime() >= oneWeekAgoMs
            ).length;
          }
        } catch {
          const allOrders = await getOrders();
          const oneWeekAgoMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
          ordersWeekCount = allOrders.filter(
            (o: Order) => o.created_at && new Date(o.created_at).getTime() >= oneWeekAgoMs
          ).length;
        }
        if (isMounted) setTotalOrdersWeek(ordersWeekCount);

        // 2. Total Products
        let prodCount = 0;
        try {
          const { count, error } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true });

          if (!error && count !== null) {
            prodCount = count;
          } else {
            const prods = await getStoredProducts();
            prodCount = prods.length;
          }
        } catch {
          const prods = await getStoredProducts();
          prodCount = prods.length;
        }
        if (isMounted) setTotalProducts(prodCount);

        // 3. Total Backorder Products
        let backorderCount = 0;
        try {
          const { count, error } = await supabase
            .from('backorder_items')
            .select('*', { count: 'exact', head: true });

          if (!error && count !== null) {
            backorderCount = count;
          } else {
            const boItems = await getBackorderItems();
            backorderCount = boItems.length;
          }
        } catch {
          const boItems = await getBackorderItems();
          backorderCount = boItems.length;
        }
        if (isMounted) setTotalBackorderProducts(backorderCount);

        // 4. Total Associates
        let assocCount = 0;
        try {
          const { count, error } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'associate');

          if (!error && count !== null) {
            assocCount = count;
          } else {
            const assocs = await getStoredAssociates();
            assocCount = assocs.length;
          }
        } catch {
          const assocs = await getStoredAssociates();
          assocCount = assocs.length;
        }
        if (isMounted) setTotalAssociates(assocCount);
      } catch (err) {
        console.error('Error loading dashboard stats:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadDashboardStats();

    return () => {
      isMounted = false;
    };
  }, [refreshTrigger]);

  const stats = [
    {
      id: 'stat-orders-week',
      title: 'Total Orders (Last 1 Week)',
      value: totalOrdersWeek,
      icon: ShoppingBag,
      color: 'indigo',
      href: '/admin/orders/dashboard',
      bgClass: 'bg-indigo-50 border-indigo-200 text-indigo-700',
      badgeClass: 'bg-indigo-100 text-indigo-800',
      iconBg: 'bg-indigo-600 text-white',
    },
    {
      id: 'stat-products',
      title: 'Total Products',
      value: totalProducts,
      icon: Package,
      color: 'emerald',
      href: '/admin/products/dashboard',
      bgClass: 'bg-emerald-50 border-emerald-200 text-emerald-700',
      badgeClass: 'bg-emerald-100 text-emerald-800',
      iconBg: 'bg-emerald-600 text-white',
    },
    {
      id: 'stat-backorder-products',
      title: 'Total Backorder Products',
      value: totalBackorderProducts,
      icon: Layers,
      color: 'amber',
      href: '/admin/backorder_products/dashboard',
      bgClass: 'bg-amber-50 border-amber-200 text-amber-700',
      badgeClass: 'bg-amber-100 text-amber-800',
      iconBg: 'bg-amber-600 text-white',
    },
    {
      id: 'stat-associates',
      title: 'Total Associates',
      value: totalAssociates,
      icon: Users,
      color: 'purple',
      href: '/admin/associates/dashboard',
      bgClass: 'bg-purple-50 border-purple-200 text-purple-700',
      badgeClass: 'bg-purple-100 text-purple-800',
      iconBg: 'bg-purple-600 text-white',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Header Component */}
      <AdminHeader />

      {/* Main Layout: Sidebar & Content Area */}
      <div className="flex-1 flex flex-col md:flex-row min-h-[calc(100vh-4rem)]">
        {/* Sidebar Component */}
        <AdminSidebar />

        {/* Dashboard Workspace */}
        <main className="flex-1 bg-slate-50 p-4 sm:p-6 md:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Admin Dashboard
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                  Overview of key operational metrics and inventory statistics
                </p>
              </div>

              <button
                type="button"
                id="refresh-stats-button"
                onClick={() => setRefreshTrigger((prev) => prev + 1)}
                disabled={loading}
                className="self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh Data</span>
              </button>
            </div>

            {/* Metrics Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {stats.map((stat) => {
                const IconComponent = stat.icon;
                return (
                  <div
                    key={stat.id}
                    id={stat.id}
                    className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          {stat.title}
                        </span>
                        <div className={`p-2.5 rounded-lg ${stat.iconBg} shadow-2xs`}>
                          <IconComponent className="w-5 h-5 stroke-[2.2]" />
                        </div>
                      </div>

                      <div className="mt-4 flex items-baseline gap-2">
                        {loading ? (
                          <div className="h-9 w-20 bg-slate-100 animate-pulse rounded-md" />
                        ) : (
                          <span className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                            {stat.value.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <Link
                        href={stat.href}
                        className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors group cursor-pointer"
                      >
                        <span>View Details</span>
                        <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                      <span className="text-[11px] font-semibold text-slate-400">Live</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
