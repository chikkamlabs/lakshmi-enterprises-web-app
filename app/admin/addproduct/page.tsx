'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminHeader from '../header/page';
import AdminSidebar from '../sidebar/page';
import { addProduct, getStoredProducts } from '@/lib/productsStore';
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

export default function AddProductPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dropdown options loaded from Supabase
  const [companies, setCompanies] = useState<Company[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(true);

  // Form state - all fields in schemas.sql
  const [productCode, setProductCode] = useState('PRD-10001');
  const [barcode, setBarcode] = useState('');
  const [name, setName] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('0.00');
  const [sellingPrice, setSellingPrice] = useState('0.00');
  const [mrp, setMrp] = useState('0.00');
  const [currentStock, setCurrentStock] = useState('0');
  const [lowStock, setLowStock] = useState('10');
  const [unit, setUnit] = useState('pcs');
  const [status, setStatus] = useState(true);

  // Load existing products count (to suggest next code) and company/category dropdown options
  useEffect(() => {
    let isMounted = true;
    Promise.all([getStoredProducts(), getStoredCompanies(), getStoredCategories()])
      .then(([existingProducts, comps, cats]) => {
        if (!isMounted) return;
        setCompanies(comps);
        setCategories(cats);
        setIsLoadingDropdowns(false);

        if (existingProducts.length > 0) {
          setProductCode(`PRD-${10001 + existingProducts.length}`);
        }
      })
      .catch((err) => {
        console.error('Error initializing add product page:', err);
        if (isMounted) setIsLoadingDropdowns(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

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
      const created = await addProduct({
        product_code: productCode.trim(),
        barcode: barcode.trim() || null,
        name: name.trim(),
        company_id: companyId || null,
        category_id: categoryId || null,
        purchase_price: Number(purchasePrice) || 0,
        selling_price: Number(sellingPrice) || 0,
        mrp: Number(mrp) || 0,
        current_stock: Math.max(0, parseInt(currentStock, 10) || 0),
        low_stock: Math.max(0, parseInt(lowStock, 10) || 10),
        unit: unit.trim() || 'pcs',
        status: status,
      });

      if (created) {
        setSuccess(`Product "${created.name}" added successfully! Redirecting...`);
        setTimeout(() => {
          router.push('/admin/products/dashboard');
        }, 800);
      }
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Failed to save product to Supabase.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <AdminHeader />

      <div className="flex-1 flex flex-col md:flex-row">
        <AdminSidebar />

        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-4xl w-full mx-auto space-y-6">
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
                <span>Add New Product</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Fill in all product specifications as defined in database schema.
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
                <span>Product Information Form (All Schema Fields)</span>
              </h2>
              {isLoadingDropdowns && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Loading companies & categories...
                </span>
              )}
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 text-xs sm:text-sm">
              {/* SECTION 1: Identifiers & Name */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">
                  Basic Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="productCode" className="form-label font-semibold text-slate-700 block mb-1">
                      Product Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="productCode"
                      type="text"
                      required
                      value={productCode}
                      onChange={(e) => setProductCode(e.target.value)}
                      className="form-input w-full rounded-lg border-slate-300 font-mono"
                      placeholder="e.g. PRD-10001"
                    />
                  </div>

                  <div>
                    <label htmlFor="barcode" className="form-label font-semibold text-slate-700 block mb-1">
                      Barcode
                    </label>
                    <div className="relative">
                      <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="barcode"
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
                  <label htmlFor="productName" className="form-label font-semibold text-slate-700 block mb-1">
                    Product Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="productName"
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
                    <label htmlFor="companyId" className="form-label font-semibold text-slate-700 block mb-1">
                      Company / Manufacturer
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <select
                        id="companyId"
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
                    <label htmlFor="categoryId" className="form-label font-semibold text-slate-700 block mb-1">
                      Category
                    </label>
                    <div className="relative">
                      <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <select
                        id="categoryId"
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

              {/* SECTION 3: Pricing (Purchase Price, Selling Price, MRP) */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">
                  Pricing Information (₹)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="purchasePrice" className="form-label font-semibold text-slate-700 block mb-1">
                      Purchase Price (₹)
                    </label>
                    <div className="relative">
                      <IndianRupee className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="purchasePrice"
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
                    <label htmlFor="sellingPrice" className="form-label font-semibold text-slate-700 block mb-1">
                      Selling Price (₹) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <IndianRupee className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="sellingPrice"
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
                    <label htmlFor="mrp" className="form-label font-semibold text-slate-700 block mb-1">
                      MRP (₹)
                    </label>
                    <div className="relative">
                      <IndianRupee className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="mrp"
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
                </div>
              </div>

              {/* SECTION 4: Inventory & Units (Current Stock, Low Stock, Unit, Status) */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">
                  Inventory & Status
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <label htmlFor="currentStock" className="form-label font-semibold text-slate-700 block mb-1">
                      Current Stock
                    </label>
                    <input
                      id="currentStock"
                      type="number"
                      min="0"
                      value={currentStock}
                      onChange={(e) => setCurrentStock(e.target.value)}
                      className="form-input w-full rounded-lg border-slate-300 font-bold"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label htmlFor="lowStock" className="form-label font-semibold text-slate-700 block mb-1">
                      Low Stock Alert
                    </label>
                    <input
                      id="lowStock"
                      type="number"
                      min="0"
                      value={lowStock}
                      onChange={(e) => setLowStock(e.target.value)}
                      className="form-input w-full rounded-lg border-slate-300 text-amber-700 font-medium"
                      placeholder="10"
                    />
                  </div>

                  <div>
                    <label htmlFor="unit" className="form-label font-semibold text-slate-700 block mb-1">
                      Unit
                    </label>
                    <select
                      id="unit"
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
                    <label htmlFor="status" className="form-label font-semibold text-slate-700 block mb-1">
                      Status
                    </label>
                    <select
                      id="status"
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

              {/* Form Actions */}
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
                      <span>Saving Product...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Product</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
