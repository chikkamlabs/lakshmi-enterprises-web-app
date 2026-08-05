'use client';

import { useEffect, useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import {
  Users,
  Plus,
  Search,
  ExternalLink,
  Loader2,
  Building2,
  RefreshCw,
  Phone,
  UserCheck,
} from 'lucide-react';
import AdminHeader from '../../header/page';
import AdminSidebar from '../../sidebar/page';
import { getBackorderDealers, BackorderDealerItem } from '../../../../lib/backorderdealers';
import { getStoredCompanies, Company } from '../../../../lib/companiesStore';

function BackorderDealersContent() {
  const [items, setItems] = useState<BackorderDealerItem[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('ALL');

  const loadData = async (showLoadingState = true) => {
    if (showLoadingState) setLoading(true);
    try {
      const [dealersList, compList] = await Promise.all([
        getBackorderDealers(),
        getStoredCompanies(),
      ]);
      setItems(dealersList || []);
      setCompanies(compList || []);
    } catch (err) {
      console.error('Error loading backorder dealers:', err);
    } finally {
      if (showLoadingState) setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const [dealersList, compList] = await Promise.all([
          getBackorderDealers(),
          getStoredCompanies(),
        ]);
        if (isMounted) {
          setItems(dealersList || []);
          setCompanies(compList || []);
        }
      } catch (err) {
        console.error('Error loading backorder dealers:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Company Filter
      if (selectedCompanyId !== 'ALL') {
        const prodCompId = item.order_item?.product?.company_id || item.order_item?.product?.company?.id;
        if (prodCompId !== selectedCompanyId) return false;
      }

      // 2. Search Filter (dealer id, dealer name, mobile, shop name)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const dealerId = item.dealer_id ? item.dealer_id.toLowerCase() : '';
        const itemId = item.id ? item.id.toLowerCase() : '';
        const dealerName = item.dealer?.name ? item.dealer.name.toLowerCase() : '';
        const dealerMobile = item.dealer?.mobile ? item.dealer.mobile.toLowerCase() : '';
        const shopName = item.dealer?.shop_name ? item.dealer.shop_name.toLowerCase() : '';

        const matches =
          dealerId.includes(q) ||
          itemId.includes(q) ||
          dealerName.includes(q) ||
          dealerMobile.includes(q) ||
          shopName.includes(q);

        if (!matches) return false;
      }

      return true;
    });
  }, [items, selectedCompanyId, searchQuery]);

  const totalDealersCount = items.length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <AdminHeader />

      <div className="flex flex-1">
        <AdminSidebar />

        <main className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-6">
          {/* Top Bar: Title & Action Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Users className="w-6 h-6 text-indigo-600" />
                <span>Backorder Dealers Dashboard</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Manage and track pending backorders for registered dealers.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => loadData(true)}
                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                title="Refresh List"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>

              <Link
                href="/admin/addbackorderdealer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add Backorder Dealer</span>
              </Link>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Total Backorder Dealers
                </span>
                <span className="text-2xl font-black text-slate-900 mt-0.5 block">
                  {totalDealersCount}
                </span>
              </div>
            </div>
          </div>

          {/* Controls: Search & Company Filter */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Dealer ID, Name, Mobile, or Shop Name..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>

            {/* Company Select Filter */}
            <div className="flex items-center gap-2 min-w-[220px]">
              <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              >
                <option value="ALL">All Companies</option>
                {companies.map((comp) => (
                  <option key={comp.id} value={comp.id}>
                    {comp.name} ({comp.company_code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table / List of Backorder Dealers */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
            {loading ? (
              <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
                <p className="text-xs font-medium text-slate-500">Loading backorder dealers...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Users className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-700">No Backorder Dealers Found</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Try adjusting your search query or company filter, or create a new backorder dealer entry.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[11px] tracking-wider">
                      <th className="py-3 px-4">Record ID</th>
                      <th className="py-3 px-4">Dealer Name</th>
                      <th className="py-3 px-4">Company</th>
                      <th className="py-3 px-4">Order / Product</th>
                      <th className="py-3 px-4 text-center">Req / Pending Qty</th>
                      <th className="py-3 px-4 text-center">Back Type</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredItems.map((item) => {
                      const dealerName = item.dealer?.name || `Dealer #${item.dealer_id.slice(0, 8)}`;
                      const shopName = item.dealer?.shop_name || '';
                      const mobile = item.dealer?.mobile || '';
                      const compName = item.order_item?.product?.company?.name || 'N/A';
                      const orderNum = item.order?.order_number ? `Order #${item.order.order_number}` : 'N/A';
                      const prodName = item.order_item?.product?.name || '';

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono text-slate-500 text-xs font-semibold">
                            {item.id.length > 8 ? `${item.id.slice(0, 8)}...` : item.id}
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{dealerName}</div>
                            {shopName && (
                              <span className="text-xs text-slate-500 block">
                                {shopName}
                              </span>
                            )}
                            {mobile && (
                              <span className="text-[10px] text-slate-400 font-mono inline-flex items-center gap-1 mt-0.5">
                                <Phone className="w-2.5 h-2.5" />
                                {mobile}
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold">
                              <Building2 className="w-3 h-3 text-slate-500" />
                              {compName}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-800">{orderNum}</div>
                            {prodName && (
                              <div className="text-xs text-indigo-600 font-medium">
                                {prodName}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4 text-center font-extrabold text-indigo-700 text-sm">
                            {item.pending_quantity}
                          </td>

                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border uppercase ${
                                item.back_type === 'admin'
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : 'bg-blue-50 text-blue-700 border-blue-200'
                              }`}
                            >
                              {item.back_type || 'staff'}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <Link
                              href={`/admin/openbackorderdealer?id=${item.id}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-colors cursor-pointer border border-indigo-200"
                            >
                              <span>Open</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function BackorderDealersDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 p-12 text-center flex flex-col items-center justify-center space-y-2">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-xs text-slate-500 font-medium">Loading backorder dealers dashboard...</p>
        </div>
      }
    >
      <BackorderDealersContent />
    </Suspense>
  );
}
