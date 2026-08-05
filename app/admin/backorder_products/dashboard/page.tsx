'use client';

import { useEffect, useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import {
  Package,
  Plus,
  Search,
  Filter,
  ExternalLink,
  Loader2,
  Boxes,
  Building2,
  RefreshCw,
} from 'lucide-react';
import AdminHeader from '../../header/page';
import AdminSidebar from '../../sidebar/page';
import { getBackorderItems, BackorderItem } from '../../../../lib/backorderproductStore';
import { getStoredCompanies, Company } from '../../../../lib/companiesStore';

function BackorderProductsContent() {
  const [items, setItems] = useState<BackorderItem[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('ALL');

  // Load data
  const loadData = async (showLoadingState = true) => {
    if (showLoadingState) setLoading(true);
    try {
      const [backordersList, compList] = await Promise.all([
        getBackorderItems(),
        getStoredCompanies(),
      ]);
      setItems(backordersList || []);
      setCompanies(compList || []);
    } catch (err) {
      console.error('Error loading backorder products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const [backordersList, compList] = await Promise.all([
          getBackorderItems(),
          getStoredCompanies(),
        ]);
        if (isMounted) {
          setItems(backordersList || []);
          setCompanies(compList || []);
        }
      } catch (err) {
        console.error('Error loading backorder products:', err);
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
        const itemCompId = item.product?.company_id || item.product?.company?.id;
        if (itemCompId !== selectedCompanyId) return false;
      }

      // 2. Search Filter (id, product name, product code, company name)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const itemId = item.id ? item.id.toLowerCase() : '';
        const prodId = item.product_id ? item.product_id.toLowerCase() : '';
        const prodName = item.product?.name ? item.product.name.toLowerCase() : '';
        const prodCode = item.product?.product_code ? item.product.product_code.toLowerCase() : '';
        const compName = item.product?.company?.name ? item.product.company.name.toLowerCase() : '';

        const matches =
          itemId.includes(q) ||
          prodId.includes(q) ||
          prodName.includes(q) ||
          prodCode.includes(q) ||
          compName.includes(q);

        if (!matches) return false;
      }

      return true;
    });
  }, [items, selectedCompanyId, searchQuery]);

  // Total Products Count Metric
  const totalProductsCount = items.length;

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
                <Boxes className="w-6 h-6 text-indigo-600" />
                <span>Backorder Products Dashboard</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Manage and track products requiring backorder procurement.
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
                href="/admin/addbackorderproduct"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add Backorder Product</span>
              </Link>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Total Backorder Products
                </span>
                <span className="text-2xl font-black text-slate-900 mt-0.5 block">
                  {totalProductsCount}
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
                placeholder="Search by ID, Product Name, Code, or Company..."
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

          {/* Table / List of Items */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
            {loading ? (
              <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
                <p className="text-xs font-medium text-slate-500">Loading backorder products...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Package className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-700">No Backorder Products Found</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Try adjusting your search query or company filter, or add a new backorder product.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[11px] tracking-wider">
                      <th className="py-3 px-4">Item ID</th>
                      <th className="py-3 px-4">Product Name</th>
                      <th className="py-3 px-4">Company</th>
                      <th className="py-3 px-4 text-center">Req. Quantity</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredItems.map((item) => {
                      const compName = item.product?.company?.name || 'N/A';
                      const prodName = item.product?.name || `Product #${item.product_id}`;
                      const prodCode = item.product?.product_code || '';

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono text-slate-500 text-xs font-semibold">
                            {item.id.length > 8 ? `${item.id.slice(0, 8)}...` : item.id}
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{prodName}</div>
                            {prodCode && (
                              <span className="text-[10px] text-slate-400 font-mono block">
                                Code: {prodCode}
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold">
                              <Building2 className="w-3 h-3 text-slate-500" />
                              {compName}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-center font-extrabold text-indigo-700 text-sm">
                            {item.required_quantity}
                          </td>

                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                item.status === 'Completed'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : item.status === 'Ordered'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : item.status === 'Partial'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {item.status || 'Pending'}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <Link
                              href={`/admin/openbackorderproduct?id=${item.id}`}
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

export default function BackorderProductsDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 p-12 text-center flex flex-col items-center justify-center space-y-2">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-xs text-slate-500 font-medium">Loading backorder dashboard...</p>
        </div>
      }
    >
      <BackorderProductsContent />
    </Suspense>
  );
}
