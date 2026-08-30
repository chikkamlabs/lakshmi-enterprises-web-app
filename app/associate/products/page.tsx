'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Search,
  Package,
  Building2,
  Tag,
  Loader2,
  RefreshCw,
  IndianRupee,
} from 'lucide-react';
import { getStoredProducts, Product } from '../../../lib/productsStore';
import { getStoredCompanies, Company } from '../../../lib/companiesStore';
import AssociateHeader from '../header/page';
import AssociateBottomNavigation from '../buttomnavigation/page';

export default function AssociateProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('ALL');

  // Load Products and Companies
  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      try {
        const [productsData, companiesData] = await Promise.all([
          getStoredProducts(),
          getStoredCompanies(),
        ]);
        if (isMounted) {
          setProducts(productsData);
          setCompanies(companiesData);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching products or companies:', err);
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const [productsData, companiesData] = await Promise.all([
        getStoredProducts(),
        getStoredCompanies(),
      ]);
      setProducts(productsData);
      setCompanies(companiesData);
    } catch (err) {
      console.error('Error refreshing products or companies:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter products by company and search query (name or ID/code)
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Company Filter
      if (selectedCompanyId !== 'ALL') {
        const matchesCompany =
          p.company_id === selectedCompanyId ||
          p.company?.id === selectedCompanyId;
        if (!matchesCompany) return false;
      }

      // Search Filter (by name, product_code, id, or barcode)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          p.name?.toLowerCase().includes(q) ||
          p.product_code?.toLowerCase().includes(q) ||
          p.id?.toLowerCase().includes(q) ||
          p.barcode?.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [products, selectedCompanyId, searchQuery]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 pb-20">
      {/* Header */}
      <AssociateHeader />

      {/* Sticky Top Bar with Title */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 py-2.5 shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-600" />
            <div>
              <h1 className="text-sm font-bold text-slate-900 leading-tight">Products Directory</h1>
              <p className="text-[11px] text-slate-500">View available products and company brands</p>
            </div>
            <span className="badge badge-info text-[10px] font-bold px-2 py-0.5 ml-1">
              {filteredProducts.length} {filteredProducts.length === 1 ? 'Product' : 'Products'}
            </span>
          </div>

          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            title="Refresh Products"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-3 space-y-3">
        {/* Search Bar & Company Filter Controls */}
        <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-xs space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Search Input (Name or ID/Code) */}
            <div className="sm:col-span-2 input-group">
              <Search className="input-icon-left w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, ID or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field has-left-icon text-xs py-1.5"
              />
            </div>

            {/* Company Filter */}
            <div>
              <div className="relative">
                <select
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-md text-xs px-2 py-1.5 focus:outline-none focus:border-indigo-500 font-medium"
                >
                  <option value="ALL">All Companies</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.company_code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Active Filter Summary / Reset */}
          {(searchQuery || selectedCompanyId !== 'ALL') && (
            <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 border-t border-slate-100">
              <span>
                Showing filtered results ({filteredProducts.length} of {products.length})
              </span>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCompanyId('ALL');
                }}
                className="text-indigo-600 hover:underline font-semibold"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>

        {/* Products List */}
        {loading ? (
          <div className="p-8 text-center bg-white rounded-lg border border-slate-200 shadow-xs space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto" />
            <p className="text-xs text-slate-500">Loading products list...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-lg border border-slate-200 shadow-xs space-y-3">
            <Package className="w-10 h-10 text-slate-300 mx-auto" />
            <div>
              <p className="text-sm font-bold text-slate-700">No products found</p>
              <p className="text-xs text-slate-500 mt-0.5">Try searching with a different name, ID or company filter</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {filteredProducts.map((p) => {
              const companyName = p.company?.name || (companies.find(c => c.id === p.company_id)?.name);
              const companyCode = p.company?.company_code || (companies.find(c => c.id === p.company_id)?.company_code);

              return (
                <div
                  key={p.id}
                  className="bg-white rounded-lg border border-slate-200 p-3 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-2"
                >
                  <div className="space-y-1">
                    {/* Top Row: Name and Code */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 truncate">{p.name}</h3>
                        {p.unit && (
                          <span className="text-[10px] text-slate-500">
                            Unit: {p.unit}
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                        {p.product_code || p.id.slice(0, 8)}
                      </span>
                    </div>

                    {/* Company Badge */}
                    <div className="pt-1.5 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span className="text-[11px] font-semibold text-slate-600">Company:</span>
                      {companyName ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {companyName} {companyCode ? `(${companyCode})` : ''}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500">
                          No Company
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Pricing / Discount / Stock row */}
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-slate-600 text-[11px]">
                        MRP: <strong className="text-slate-800 font-mono">₹{Number(p.mrp ?? 0).toFixed(2)}</strong>
                      </span>
                      <span className="text-indigo-700 text-[11px]">
                        AD Disc: <strong className="font-mono text-indigo-900">{p.ad_disc ?? 0}</strong>
                      </span>
                      {p.selling_price !== undefined && (
                        <span className="text-emerald-700 font-semibold text-[11px]">
                          SP: <strong className="font-mono">₹{Number(p.selling_price).toFixed(2)}</strong>
                        </span>
                      )}
                    </div>

                    {p.current_stock !== undefined && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          Number(p.current_stock) <= Number(p.low_stock || 0)
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        Stock: {p.current_stock}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <AssociateBottomNavigation />
    </div>
  );
}
