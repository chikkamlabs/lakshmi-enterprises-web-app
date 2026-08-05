'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import AdminHeader from '../../header/page';
import AdminSidebar from '../../sidebar/page';
import { getStoredProducts, Product } from '@/lib/productsStore';
import { getStoredCompanies, Company } from '@/lib/companiesStore';
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Building2,
  Tag,
  Boxes,
} from 'lucide-react';

export default function AdminProductsDashboardPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [error, setError] = useState<string>('');

  const loadData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [prodsData, compsData] = await Promise.all([
        getStoredProducts(),
        getStoredCompanies(),
      ]);
      setProducts(prodsData);
      setCompanies(compsData);
    } catch (err: unknown) {
      console.error('Failed to load products data:', err);
      setError('Could not load products from database.');
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    async function initData() {
      setIsLoading(true);
      setError('');
      try {
        const [prodsData, compsData] = await Promise.all([
          getStoredProducts(),
          getStoredCompanies(),
        ]);
        if (isMounted) {
          setProducts(prodsData);
          setCompanies(compsData);
        }
      } catch (err: unknown) {
        console.error('Failed to load products data:', err);
        if (isMounted) {
          setError('Could not load products from database.');
          setProducts([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Compute stats: Total Products count
  const totalProducts = products.length;
  const activeProducts = useMemo(() => products.filter((p) => p.status).length, [products]);
  const lowStockProducts = useMemo(
    () => products.filter((p) => (Number(p.current_stock) || 0) <= (Number(p.low_stock) || 10)).length,
    [products]
  );

  // Filtered Products by company and search query (name, company, code/barcode)
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      // 1. Company Filter
      if (selectedCompanyId !== 'ALL') {
        const prodCompanyId = prod.company_id || (prod.company ? prod.company.id : '');
        if (prodCompanyId !== selectedCompanyId) {
          return false;
        }
      }

      // 2. Search Query (Name, Company, Code / Barcode)
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;

      const pName = (prod.name || '').toLowerCase();
      const pCode = (prod.product_code || '').toLowerCase();
      const pBarcode = (prod.barcode || '').toLowerCase();

      // Company Name or Code check
      let compName = '';
      let compCode = '';
      if (prod.company) {
        compName = (prod.company.name || '').toLowerCase();
        compCode = (prod.company.company_code || '').toLowerCase();
      } else if (prod.company_id) {
        const matchingComp = companies.find((c) => c.id === prod.company_id);
        if (matchingComp) {
          compName = (matchingComp.name || '').toLowerCase();
          compCode = (matchingComp.company_code || '').toLowerCase();
        }
      }

      return (
        pName.includes(q) ||
        pCode.includes(q) ||
        pBarcode.includes(q) ||
        compName.includes(q) ||
        compCode.includes(q)
      );
    });
  }, [products, selectedCompanyId, searchQuery, companies]);

  // Helper to format currency
  const formatINR = (val: number) => {
    return (Number(val) || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <AdminHeader />

      <div className="flex-1 flex flex-col md:flex-row">
        <AdminSidebar />

        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Top Title & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Package className="w-6 h-6 text-indigo-600" />
                <span>Products Management</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Manage product catalog, pricing, barcodes, stock levels, and company associations.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={loadData}
                disabled={isLoading}
                className="btn-base btn-secondary text-xs flex items-center gap-1.5"
                title="Refresh products from database"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>

              {/* Add Product Button */}
              <button
                onClick={() => router.push('/admin/addproduct')}
                className="btn-base btn-primary text-xs sm:text-sm flex items-center gap-2 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Add Product</span>
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm rounded-lg flex items-center justify-between">
              <span>{error}</span>
            </div>
          )}

          {/* Metrics Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Card 1: Total Products (Required Count) */}
            <div className="card-base bg-white border border-slate-200 shadow-xs p-5 flex items-center justify-between rounded-xl">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Total Products
                </p>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                  {isLoading ? '...' : totalProducts}
                </h3>
                <p className="text-xs text-slate-400 mt-1">Total items in database</p>
              </div>
              <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                <Package className="w-6 h-6" />
              </div>
            </div>

            {/* Card 2: Active Products */}
            <div className="card-base bg-white border border-slate-200 shadow-xs p-5 flex items-center justify-between rounded-xl">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Active Items
                </p>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-emerald-600 mt-1">
                  {isLoading ? '...' : activeProducts}
                </h3>
                <p className="text-xs text-slate-400 mt-1">Available for orders</p>
              </div>
              <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>

            {/* Card 3: Low Stock Alerts */}
            <div className="card-base bg-white border border-slate-200 shadow-xs p-5 flex items-center justify-between rounded-xl">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Low Stock Alert
                </p>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-amber-600 mt-1">
                  {isLoading ? '...' : lowStockProducts}
                </h3>
                <p className="text-xs text-slate-400 mt-1">Stock ≤ low stock threshold</p>
              </div>
              <div className="w-12 h-12 bg-amber-50 border border-amber-100 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Filter Option by Companies & Search Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
              {/* Filter by Company */}
              <div className="relative min-w-[200px]">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" />
                </div>
                <select
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  className="form-input pl-9 pr-8 py-2 text-xs sm:text-sm w-full rounded-lg border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-indigo-500 font-medium text-slate-700"
                >
                  <option value="ALL">All Companies ({companies.length})</option>
                  {companies.map((comp) => (
                    <option key={comp.id} value={comp.id}>
                      {comp.name} ({comp.company_code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Next Search Bar with Name, Company, and Code */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by product name, company name/code, or product code/barcode..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-input pl-9 pr-4 py-2 text-xs sm:text-sm w-full rounded-lg border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="text-xs text-slate-500 self-end md:self-center shrink-0">
              Showing <span className="font-semibold text-slate-800">{filteredProducts.length}</span> of{' '}
              <span className="font-semibold text-slate-800">{products.length}</span> products
            </div>
          </div>

          {/* Products Data Table & Mobile Responsive View */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            {isLoading ? (
              <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
                <p className="text-sm font-medium">Loading products from database...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center">
                <Package className="w-12 h-12 text-slate-300 mb-3" />
                <p className="text-base font-semibold text-slate-700">No products found</p>
                <p className="text-xs text-slate-400 max-w-sm mt-1">
                  {searchQuery || selectedCompanyId !== 'ALL'
                    ? 'No products matched your company filter or search terms.'
                    : 'Click "Add Product" to create your first product entry in the catalog.'}
                </p>
                {!(searchQuery || selectedCompanyId !== 'ALL') && (
                  <button
                    onClick={() => router.push('/admin/addproduct')}
                    className="btn-base btn-primary text-xs mt-4 flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Product</span>
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Desktop & Tablet Table View */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        <th className="py-3.5 px-4">Code / Barcode</th>
                        <th className="py-3.5 px-4">Product Name</th>
                        <th className="py-3.5 px-4">Company</th>
                        <th className="py-3.5 px-4">Category</th>
                        <th className="py-3.5 px-4 text-right">Purchase Price</th>
                        <th className="py-3.5 px-4 text-right">Selling Price</th>
                        <th className="py-3.5 px-4 text-right">MRP</th>
                        <th className="py-3.5 px-4 text-center">Stock / Unit</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
                      {filteredProducts.map((prod) => {
                        const companyName =
                          prod.company?.name ||
                          companies.find((c) => c.id === prod.company_id)?.name ||
                          '-';
                        const categoryName = prod.category?.name || '-';
                        const isLowStock =
                          (Number(prod.current_stock) || 0) <= (Number(prod.low_stock) || 10);

                        return (
                          <tr key={prod.id} className="hover:bg-slate-50/80 transition-colors">
                            {/* Product Code & Barcode */}
                            <td className="py-3.5 px-4">
                              <div className="font-mono font-bold text-indigo-700">{prod.product_code}</div>
                              {prod.barcode ? (
                                <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                                  <span>BC:</span> {prod.barcode}
                                </div>
                              ) : (
                                <div className="text-[11px] text-slate-300 italic">No barcode</div>
                              )}
                            </td>

                            {/* Product Name */}
                            <td className="py-3.5 px-4">
                              <div className="font-semibold text-slate-900">{prod.name}</div>
                            </td>

                            {/* Company */}
                            <td className="py-3.5 px-4 text-slate-700">
                              {companyName !== '-' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 font-medium text-slate-800 text-xs">
                                  <Building2 className="w-3 h-3 text-slate-500" />
                                  {companyName}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">Unassigned</span>
                              )}
                            </td>

                            {/* Category */}
                            <td className="py-3.5 px-4 text-slate-600">
                              {categoryName !== '-' ? (
                                <span className="inline-flex items-center gap-1 text-xs text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                                  <Tag className="w-3 h-3 text-slate-400" />
                                  {categoryName}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">-</span>
                              )}
                            </td>

                            {/* Purchase Price */}
                            <td className="py-3.5 px-4 text-right font-medium text-slate-600">
                              ₹{formatINR(prod.purchase_price)}
                            </td>

                            {/* Selling Price */}
                            <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                              ₹{formatINR(prod.selling_price)}
                            </td>

                            {/* MRP */}
                            <td className="py-3.5 px-4 text-right font-medium text-slate-500 line-through">
                              ₹{formatINR(prod.mrp)}
                            </td>

                            {/* Stock & Unit */}
                            <td className="py-3.5 px-4 text-center">
                              <div className="inline-flex flex-col items-center">
                                <span
                                  className={`font-bold px-2 py-0.5 rounded text-xs ${
                                    isLowStock
                                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  }`}
                                >
                                  {prod.current_stock} {prod.unit || 'pcs'}
                                </span>
                                <span className="text-[10px] text-slate-400 mt-0.5">
                                  (Min: {prod.low_stock})
                                </span>
                              </div>
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-4">
                              {prod.status ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                  <XCircle className="w-3 h-3" />
                                  Inactive
                                </span>
                              )}
                            </td>

                            {/* Actions (Edit Button) */}
                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={() => router.push(`/admin/editproduct?id=${prod.id}`)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile & Tablet Card Layout */}
                <div className="lg:hidden divide-y divide-slate-200">
                  {filteredProducts.map((prod) => {
                    const companyName =
                      prod.company?.name ||
                      companies.find((c) => c.id === prod.company_id)?.name ||
                      '-';
                    const categoryName = prod.category?.name || '-';
                    const isLowStock =
                      (Number(prod.current_stock) || 0) <= (Number(prod.low_stock) || 10);

                    return (
                      <div key={prod.id} className="p-4 space-y-3 bg-white">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                {prod.product_code}
                              </span>
                              {prod.barcode && (
                                <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                  BC: {prod.barcode}
                                </span>
                              )}
                            </div>
                            <h4 className="font-bold text-slate-900 text-base mt-1.5">{prod.name}</h4>
                            <div className="flex items-center gap-2 mt-1 flex-wrap text-xs">
                              {companyName !== '-' && (
                                <span className="text-slate-600 font-medium flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded">
                                  <Building2 className="w-3 h-3 text-slate-400" />
                                  {companyName}
                                </span>
                              )}
                              {categoryName !== '-' && (
                                <span className="text-slate-500 flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                                  <Tag className="w-3 h-3 text-slate-400" />
                                  {categoryName}
                                </span>
                              )}
                            </div>
                          </div>

                          {prod.status ? (
                            <span className="px-2.5 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 shrink-0">
                              Active
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 rounded-full border border-slate-200 shrink-0">
                              Inactive
                            </span>
                          )}
                        </div>

                        {/* Prices Grid */}
                        <div className="grid grid-cols-3 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">Purchase</span>
                            <span className="font-semibold text-slate-700">₹{formatINR(prod.purchase_price)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">Selling</span>
                            <span className="font-extrabold text-slate-900">₹{formatINR(prod.selling_price)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">MRP</span>
                            <span className="font-medium text-slate-500 line-through">₹{formatINR(prod.mrp)}</span>
                          </div>
                        </div>

                        {/* Stock & Actions */}
                        <div className="flex items-center justify-between pt-1">
                          <div className="flex items-center gap-2">
                            <Boxes className="w-4 h-4 text-slate-400" />
                            <span
                              className={`text-xs font-bold px-2 py-0.5 rounded ${
                                isLowStock
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              Stock: {prod.current_stock} {prod.unit || 'pcs'}
                            </span>
                            <span className="text-[11px] text-slate-400">(Low: {prod.low_stock})</span>
                          </div>

                          <button
                            onClick={() => router.push(`/admin/editproduct?id=${prod.id}`)}
                            className="btn-base btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Edit</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
