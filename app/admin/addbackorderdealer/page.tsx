'use client';

import { useEffect, useState, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Users,
  Plus,
  Loader2,
  CheckCircle2,
  Building2,
  Search,
  Package,
} from 'lucide-react';
import AdminHeader from '../header/page';
import AdminSidebar from '../sidebar/page';
import { createBackorderDealer } from '../../../lib/backorderdealers';
import { getStoredDealers, Dealer } from '../../../lib/dealersStore';
import { getStoredProducts, Product } from '../../../lib/productsStore';

function AddBackorderDealerContent() {
  const router = useRouter();

  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Search filter states
  const [dealerSearchQuery, setDealerSearchQuery] = useState<string>('');
  const [productSearchQuery, setProductSearchQuery] = useState<string>('');

  // Form State
  const [selectedDealerId, setSelectedDealerId] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [pendingQuantity, setPendingQuantity] = useState<number>(1);
  const [fulfilledQuantity, setFulfilledQuantity] = useState<number>(0);
  const [status, setStatus] = useState<'Pending' | 'Fulfilled'>('Pending');
  const [backType, setBackType] = useState<'admin' | 'staff'>('admin');

  useEffect(() => {
    async function loadInitialData() {
      setLoadingData(true);
      try {
        const [dList, pList] = await Promise.all([
          getStoredDealers(),
          getStoredProducts(),
        ]);
        setDealers(dList || []);
        setProducts(pList || []);

        if (dList && dList.length > 0) {
          setSelectedDealerId(dList[0].id);
        }
        if (pList && pList.length > 0) {
          setSelectedProductId(pList[0].id);
        }
      } catch (err) {
        console.error('Error loading data for add backorder dealer:', err);
      } finally {
        setLoadingData(false);
      }
    }
    loadInitialData();
  }, []);

  // Filtered Dealers
  const filteredDealers = useMemo(() => {
    if (!dealerSearchQuery.trim()) return dealers;
    const q = dealerSearchQuery.toLowerCase().trim();
    return dealers.filter((d) => {
      const nameMatch = d.name?.toLowerCase().includes(q);
      const codeMatch = d.dealer_code?.toLowerCase().includes(q);
      const shopMatch = d.shop_name?.toLowerCase().includes(q);
      const mobileMatch = d.mobile?.toLowerCase().includes(q);
      return nameMatch || codeMatch || shopMatch || mobileMatch;
    });
  }, [dealers, dealerSearchQuery]);

  // Filtered Products
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
    if (!selectedDealerId) {
      setErrorMsg('Please select a dealer.');
      return;
    }

    if (pendingQuantity <= 0) {
      setErrorMsg('Pending quantity must be greater than 0.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const result = await createBackorderDealer({
        dealer_id: selectedDealerId,
        pending_quantity: Number(pendingQuantity),
        fulfilled_quantity: Number(fulfilledQuantity),
        status,
        back_type: backType,
      });

      if (result) {
        router.push('/admin/backorder_dealers/dashboard');
      } else {
        setErrorMsg('Failed to create backorder dealer record.');
        setSubmitting(false);
      }
    } catch (err) {
      console.error('Error submitting backorder dealer:', err);
      setErrorMsg('An unexpected error occurred while saving.');
      setSubmitting(false);
    }
  };

  const selectedDealerObj = dealers.find((d) => d.id === selectedDealerId);
  const selectedProductObj = products.find((p) => p.id === selectedProductId);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <AdminHeader />

      <div className="flex flex-1">
        <AdminSidebar />

        <main className="flex-1 p-4 sm:p-6 max-w-3xl mx-auto w-full space-y-6">
          {/* Top Navigation */}
          <div className="flex items-center justify-between gap-2">
            <Link
              href="/admin/backorder_dealers/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500" />
              <span>Back to Backorder Dealers</span>
            </Link>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-2xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                <span>Add Backorder Dealer</span>
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Record a dealer backorder requirement manually with full control over all details.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-700">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Dealer Search & Select */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 block">
                  Select Dealer <span className="text-red-500">*</span>
                </label>

                {loadingData ? (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                    <span>Loading dealers list...</span>
                  </div>
                ) : dealers.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                    No dealers found. Please add dealers first.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={dealerSearchQuery}
                        onChange={(e) => setDealerSearchQuery(e.target.value)}
                        placeholder="Search dealer by name, shop, code, or mobile..."
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                      />
                    </div>

                    <select
                      value={selectedDealerId}
                      onChange={(e) => setSelectedDealerId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                    >
                      {filteredDealers.length === 0 ? (
                        <option value="" disabled>
                          No dealers matching &quot;{dealerSearchQuery}&quot;
                        </option>
                      ) : (
                        filteredDealers.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.dealer_code}) {d.shop_name ? `- ${d.shop_name}` : ''}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                )}
              </div>

              {selectedDealerObj && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1 text-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{selectedDealerObj.name}</span>
                    <span className="text-[11px] font-mono text-indigo-600 font-bold">
                      {selectedDealerObj.dealer_code}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Shop: {selectedDealerObj.shop_name || 'N/A'} | Mobile: {selectedDealerObj.mobile || 'N/A'}
                  </div>
                </div>
              )}

              {/* Product Search & Select (Optional reference) */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 block">
                  Product Requirement (Optional)
                </label>
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={productSearchQuery}
                      onChange={(e) => setProductSearchQuery(e.target.value)}
                      placeholder="Search product by name, code, or company..."
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                    />
                  </div>

                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  >
                    <option value="">-- No specific product attached --</option>
                    {filteredProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.product_code}) {p.company?.name ? `- ${p.company.name}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedProductObj && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1 text-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{selectedProductObj.name}</span>
                    <span className="text-[11px] font-mono text-slate-500">
                      Company: {selectedProductObj.company?.name || 'N/A'}
                    </span>
                  </div>
                </div>
              )}

              {/* Quantities Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 block">
                    Pending Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={pendingQuantity}
                    onChange={(e) => setPendingQuantity(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 block">
                    Fulfilled Quantity
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={fulfilledQuantity}
                    onChange={(e) => setFulfilledQuantity(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Back Type & Status Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 block">Back Type</label>
                  <select
                    value={backType}
                    onChange={(e) => setBackType(e.target.value as 'admin' | 'staff')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  >
                    <option value="admin">admin (Created by Admin)</option>
                    <option value="staff">staff (Created by Staff Order Approval)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 block">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'Pending' | 'Fulfilled')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Fulfilled">Fulfilled</option>
                  </select>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting || loadingData || dealers.length === 0}
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold text-sm rounded-lg shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Saving Backorder Dealer...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Create Backorder Dealer</span>
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

export default function AddBackorderDealerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 p-12 text-center flex flex-col items-center justify-center space-y-2">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-xs text-slate-500 font-medium">Loading form...</p>
        </div>
      }
    >
      <AddBackorderDealerContent />
    </Suspense>
  );
}
