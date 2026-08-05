'use client';

import { useEffect, useState, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Package,
  Plus,
  Loader2,
  CheckCircle2,
  Building2,
  Search,
} from 'lucide-react';
import AdminHeader from '../header/page';
import AdminSidebar from '../sidebar/page';
import { createBackorderItem } from '../../../lib/backorderproductStore';
import { getStoredProducts, Product } from '../../../lib/productsStore';

function AddBackorderProductContent() {
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Search filter for product dropdown/selector
  const [productSearchQuery, setProductSearchQuery] = useState<string>('');

  // Form State
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [requiredQuantity, setRequiredQuantity] = useState<number>(1);
  const [orderedQuantity, setOrderedQuantity] = useState<number>(0);
  const [status, setStatus] = useState<'Pending' | 'Ordered' | 'Partial' | 'Completed'>('Pending');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    async function loadProducts() {
      setLoadingProducts(true);
      try {
        const prods = await getStoredProducts();
        setProducts(prods || []);
        if (prods && prods.length > 0) {
          setSelectedProductId(prods[0].id);
        }
      } catch (err) {
        console.error('Error loading products:', err);
      } finally {
        setLoadingProducts(false);
      }
    }
    loadProducts();
  }, []);

  // Filtered products list for product search
  const filteredProducts = useMemo(() => {
    if (!productSearchQuery.trim()) return products;
    const q = productSearchQuery.toLowerCase().trim();
    return products.filter((p) => {
      const nameMatch = p.name?.toLowerCase().includes(q);
      const codeMatch = p.product_code?.toLowerCase().includes(q);
      const compMatch = p.company?.name?.toLowerCase().includes(q);
      return nameMatch || codeMatch || compMatch;
    });
  }, [products, productSearchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      setErrorMsg('Please select a product.');
      return;
    }

    if (requiredQuantity <= 0) {
      setErrorMsg('Required quantity must be greater than 0.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const result = await createBackorderItem({
        product_id: selectedProductId,
        required_quantity: Number(requiredQuantity),
        ordered_quantity: Number(orderedQuantity),
        status,
        notes: notes.trim() || null,
      });

      if (result) {
        router.push('/admin/backorder_products/dashboard');
      } else {
        setErrorMsg('Failed to create backorder product record.');
        setSubmitting(false);
      }
    } catch (err) {
      console.error('Error submitting backorder product:', err);
      setErrorMsg('An unexpected error occurred while saving.');
      setSubmitting(false);
    }
  };

  const selectedProductObj = products.find((p) => p.id === selectedProductId);
  const calculatedPendingQty = Math.max(0, (Number(requiredQuantity) || 0) - (Number(orderedQuantity) || 0));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <AdminHeader />

      <div className="flex flex-1">
        <AdminSidebar />

        <main className="flex-1 p-4 sm:p-6 max-w-3xl mx-auto w-full space-y-6">
          {/* Top Bar */}
          <div className="flex items-center justify-between gap-2">
            <Link
              href="/admin/backorder_products/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500" />
              <span>Back to Dashboard</span>
            </Link>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-2xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                <span>Add Backorder Product</span>
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Search product and enter complete procurement requirements from scratch.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-700">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Product Search & Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 block">
                  Select Product <span className="text-red-500">*</span>
                </label>

                {loadingProducts ? (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                    <span>Loading products list...</span>
                  </div>
                ) : products.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                    No products found. Please add products first.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Search Input Filter for Product */}
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={productSearchQuery}
                        onChange={(e) => setProductSearchQuery(e.target.value)}
                        placeholder="Type to search product by name, code, or company..."
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                      />
                    </div>

                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                    >
                      {filteredProducts.length === 0 ? (
                        <option value="" disabled>
                          No products matching &quot;{productSearchQuery}&quot;
                        </option>
                      ) : (
                        filteredProducts.map((prod) => (
                          <option key={prod.id} value={prod.id}>
                            {prod.name} ({prod.product_code}) {prod.company?.name ? `- ${prod.company.name}` : ''}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                )}
              </div>

              {selectedProductObj && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-1 text-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">{selectedProductObj.name}</span>
                    <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold text-[11px] border border-indigo-100">
                      Stock: {selectedProductObj.current_stock} {selectedProductObj.unit || 'pcs'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-slate-500 font-mono text-[11px] pt-1">
                    <span>Code: <b>{selectedProductObj.product_code}</b></span>
                    <span>Company: <b>{selectedProductObj.company?.name || 'N/A'}</b></span>
                    <span>Selling Price: <b>₹{selectedProductObj.selling_price}</b></span>
                  </div>
                </div>
              )}

              {/* Required, Ordered & Calculated Pending Quantities */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 block">
                    Required Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={requiredQuantity}
                    onChange={(e) => setRequiredQuantity(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 block">
                    Ordered Quantity
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={orderedQuantity}
                    onChange={(e) => setOrderedQuantity(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 block">
                    Pending Quantity (Calculated)
                  </label>
                  <input
                    type="number"
                    readOnly
                    value={calculatedPendingQty}
                    className="w-full bg-indigo-50/60 border border-indigo-200 rounded-lg p-2.5 text-xs sm:text-sm font-black text-indigo-700 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 block">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                >
                  <option value="Pending">Pending</option>
                  <option value="Ordered">Ordered</option>
                  <option value="Partial">Partial</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 block">Notes / Remarks</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional details regarding backorder requirement..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting || loadingProducts || products.length === 0}
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold text-sm rounded-lg shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Saving Backorder Product...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Create Backorder Item</span>
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

export default function AddBackorderProductPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 p-12 text-center flex flex-col items-center justify-center space-y-2">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-xs text-slate-500 font-medium">Loading form...</p>
        </div>
      }
    >
      <AddBackorderProductContent />
    </Suspense>
  );
}

