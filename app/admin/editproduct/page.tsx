'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AdminHeader from '../header/page';
import AdminSidebar from '../sidebar/page';
import { getProductById, updateProduct } from '@/lib/productsStore';
import { getStoredCompanies, Company } from '@/lib/companiesStore';
import { getStoredCategories, Category } from '@/lib/categoriesStore';
import {
  Package,
  ArrowLeft,
  Loader2,
  Save,
  X,
  AlertCircle,
  CheckCircle2,
  Building2,
  Tag,
  Barcode,
  Layers,
  IndianRupee,
} from 'lucide-react';

function EditProductFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams?.get('id') || '';

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dropdown options
  const [companies, setCompanies] = useState<Company[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Form state - matching schemas.sql fields
  const [productCode, setProductCode] = useState('');
  const [barcode, setBarcode] = useState('');
  const [name, setName] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('0.00');
  const [sellingPrice, setSellingPrice] = useState('0.00');
  const [mrp, setMrp] = useState('0.00');
  const [adDisc, setAdDisc] = useState('0.00');
  const [currentStock, setCurrentStock] = useState('0');
  const [lowStock, setLowStock] = useState('10');
  const [unit, setUnit] = useState('pcs');
  const [status, setStatus] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      if (!productId) {
        if (isMounted) {
          setError('No product ID provided in URL.');
          setIsLoading(false);
        }
        return;
      }

      try {
        const [prod, comps, cats] = await Promise.all([
          getProductById(productId),
          getStoredCompanies(),
          getStoredCategories(),
        ]);

        if (!isMounted) return;

        setCompanies(comps);
        setCategories(cats);

        if (!prod) {
          setError('Product not found in database.');
        } else {
          setProductCode(prod.product_code || '');
          setBarcode(prod.barcode || '');
          setName(prod.name || '');
          setCompanyId(prod.company_id || (prod.company ? prod.company.id : ''));
          setCategoryId(prod.category_id || (prod.category ? prod.category.id : ''));
          setPurchasePrice(String(prod.purchase_price ?? 0));
          setSellingPrice(String(prod.selling_price ?? 0));
          setMrp(String(prod.mrp ?? 0));
          setAdDisc(String(prod.ad_disc ?? 0));
          setCurrentStock(String(prod.current_stock ?? 0));
          setLowStock(String(prod.low_stock ?? 10));
          setUnit(prod.unit || 'pcs');
          setStatus(prod.status ?? true);
        }
      } catch (err) {
        console.error('Failed to load product for editing:', err);
        if (isMounted) setError('Error loading product details.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!productId) {
      setError('Invalid Product ID.');
      return;
    }
    if (!name.trim()) {
      setError('Product Name is required.');
      return;
    }
    if (!productCode.trim()) {
      setError('Product Code is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = await updateProduct(productId, {
        product_code: productCode.trim(),
        barcode: barcode.trim() || null,
        name: name.trim(),
        company_id: companyId || null,
        category_id: categoryId || null,
        purchase_price: Number(purchasePrice) || 0,
        selling_price: Number(sellingPrice) || 0,
        mrp: Number(mrp) || 0,
        ad_disc: Number(adDisc) || 0,
        current_stock: Math.max(0, parseInt(currentStock, 10) || 0),
        low_stock: Math.max(0, parseInt(lowStock, 10) || 10),
        unit: unit.trim() || 'pcs',
        status: status,
      });

      if (updated) {
        setSuccess(`Product "${updated.name}" updated successfully! Redirecting...`);
        setTimeout(() => {
          router.push('/admin/products/dashboard');
        }, 800);
      }
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Failed to update product in Supabase.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-12 text-center text-slate-500 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
        <p className="text-sm font-medium">Loading product details from database...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <button
            onClick={() => router.push('/admin/products/dashboard')}
            className="text-xs font-semibold text-slate-500 hover:text-indigo-600 flex items-center gap-1 mb-1 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Products List</span>
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-indigo-600" />
            <span>Edit Product</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Modify product details, pricing, and stock settings.
          </p>
        </div>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm rounded-xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {success && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs sm:text-sm rounded-xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>{success}</span>
          </div>
        </div>
      )}

      {/* Form Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Update Product Record</span>
          </h2>
          <span className="text-xs font-mono text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded border border-indigo-100 font-bold">
            {productCode}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 text-xs sm:text-sm">
          {/* SECTION 1: Identifiers & Name */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">
              Basic Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="editProductCode" className="form-label font-semibold text-slate-700 block mb-1">
                  Product Code <span className="text-red-500">*</span>
                </label>
                <input
                  id="editProductCode"
                  type="text"
                  required
                  value={productCode}
                  onChange={(e) => setProductCode(e.target.value)}
                  className="form-input w-full rounded-lg border-slate-300 font-mono"
                  placeholder="e.g. PRD-101"
                />
              </div>

              <div>
                <label htmlFor="editBarcode" className="form-label font-semibold text-slate-700 block mb-1">
                  Barcode
                </label>
                <div className="relative">
                  <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="editBarcode"
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    className="form-input w-full pl-9 rounded-lg border-slate-300 font-mono"
                    placeholder="e.g. 8901234567890"
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="editProductName" className="form-label font-semibold text-slate-700 block mb-1">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                id="editProductName"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="form-input w-full rounded-lg border-slate-300 font-medium"
                placeholder="Enter complete product title/description"
              />
            </div>
          </div>

          {/* SECTION 2: Relations (Company & Category) */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">
              Associations
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="editCompanyId" className="form-label font-semibold text-slate-700 block mb-1">
                  Company / Manufacturer
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    id="editCompanyId"
                    value={companyId}
                    onChange={(e) => setCompanyId(e.target.value)}
                    className="form-input w-full pl-9 rounded-lg border-slate-300 bg-white"
                  >
                    <option value="">-- Select Company (Optional) --</option>
                    {companies.map((comp) => (
                      <option key={comp.id} value={comp.id}>
                        {comp.name} ({comp.company_code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="editCategoryId" className="form-label font-semibold text-slate-700 block mb-1">
                  Category
                </label>
                <div className="relative">
                  <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    id="editCategoryId"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="form-input w-full pl-9 rounded-lg border-slate-300 bg-white"
                  >
                    <option value="">-- Select Category (Optional) --</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} ({cat.category_code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: Pricing */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">
              Pricing Information (₹)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label htmlFor="editPurchasePrice" className="form-label font-semibold text-slate-700 block mb-1">
                  Purchase Price (₹)
                </label>
                <div className="relative">
                  <IndianRupee className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="editPurchasePrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    className="form-input w-full pl-8 rounded-lg border-slate-300 font-medium"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="editSellingPrice" className="form-label font-semibold text-slate-700 block mb-1">
                  Selling Price (₹) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <IndianRupee className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="editSellingPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    className="form-input w-full pl-8 rounded-lg border-slate-300 font-bold text-slate-900"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="editMrp" className="form-label font-semibold text-slate-700 block mb-1">
                  MRP (₹)
                </label>
                <div className="relative">
                  <IndianRupee className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="editMrp"
                    type="number"
                    step="0.01"
                    min="0"
                    value={mrp}
                    onChange={(e) => setMrp(e.target.value)}
                    className="form-input w-full pl-8 rounded-lg border-slate-300 font-medium"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="editAdDisc" className="form-label font-semibold text-slate-700 block mb-1">
                  AD Disc (₹/%)
                </label>
                <div className="relative">
                  <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="editAdDisc"
                    type="number"
                    step="0.01"
                    min="0"
                    value={adDisc}
                    onChange={(e) => setAdDisc(e.target.value)}
                    className="form-input w-full pl-8 rounded-lg border-slate-300 font-medium"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 4: Inventory & Status */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">
              Inventory & Status
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label htmlFor="editCurrentStock" className="form-label font-semibold text-slate-700 block mb-1">
                  Current Stock
                </label>
                <input
                  id="editCurrentStock"
                  type="number"
                  min="0"
                  value={currentStock}
                  onChange={(e) => setCurrentStock(e.target.value)}
                  className="form-input w-full rounded-lg border-slate-300 font-bold"
                  placeholder="0"
                />
              </div>

              <div>
                <label htmlFor="editLowStock" className="form-label font-semibold text-slate-700 block mb-1">
                  Low Stock Alert
                </label>
                <input
                  id="editLowStock"
                  type="number"
                  min="0"
                  value={lowStock}
                  onChange={(e) => setLowStock(e.target.value)}
                  className="form-input w-full rounded-lg border-slate-300 text-amber-700 font-medium"
                  placeholder="10"
                />
              </div>

              <div>
                <label htmlFor="editUnit" className="form-label font-semibold text-slate-700 block mb-1">
                  Unit
                </label>
                <select
                  id="editUnit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="form-input w-full rounded-lg border-slate-300 bg-white"
                >
                  <option value="pcs">pcs (Pieces)</option>
                  <option value="box">box (Box)</option>
                  <option value="set">set (Set)</option>
                  <option value="kg">kg (Kilogram)</option>
                  <option value="ltr">ltr (Liter)</option>
                  <option value="meter">meter (Meter)</option>
                  <option value="packet">packet (Packet)</option>
                </select>
              </div>

              <div>
                <label htmlFor="editStatus" className="form-label font-semibold text-slate-700 block mb-1">
                  Status
                </label>
                <select
                  id="editStatus"
                  value={status ? 'true' : 'false'}
                  onChange={(e) => setStatus(e.target.value === 'true')}
                  className="form-input w-full rounded-lg border-slate-300 bg-white font-medium"
                >
                  <option value="true">Active Product</option>
                  <option value="false">Inactive Product</option>
                </select>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => router.push('/admin/products/dashboard')}
              className="btn-base btn-secondary text-xs sm:text-sm px-4 py-2 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-base btn-primary text-xs sm:text-sm px-5 py-2 flex items-center gap-2 shadow-sm cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Updating Product...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Update Product</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EditProductPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <AdminHeader />

      <div className="flex-1 flex flex-col md:flex-row">
        <AdminSidebar />

        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-4xl w-full mx-auto">
          <Suspense
            fallback={
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                Loading form...
              </div>
            }
          >
            <EditProductFormContent />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
