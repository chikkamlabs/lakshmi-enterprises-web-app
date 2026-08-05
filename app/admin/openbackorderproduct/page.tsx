'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Package,
  Save,
  Trash2,
  Loader2,
  Building2,
  Clock,
  CheckCircle,
} from 'lucide-react';
import AdminHeader from '../header/page';
import AdminSidebar from '../sidebar/page';
import {
  getBackorderItemById,
  updateBackorderItem,
  deleteBackorderItem,
  BackorderItem,
} from '../../../lib/backorderproductStore';

function OpenBackorderProductContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const itemId = searchParams.get('id');

  const [item, setItem] = useState<BackorderItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form Fields
  const [requiredQty, setRequiredQty] = useState<number>(0);
  const [orderedQty, setOrderedQty] = useState<number>(0);
  const [status, setStatus] = useState<'Pending' | 'Ordered' | 'Partial' | 'Completed'>('Pending');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    async function loadItem() {
      if (!itemId) {
        setErrorMsg('Missing backorder item ID.');
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const found = await getBackorderItemById(itemId);
        if (found) {
          setItem(found);
          setRequiredQty(Number(found.required_quantity || 0));
          setOrderedQty(Number(found.ordered_quantity || 0));
          setStatus(found.status || 'Pending');
          setNotes(found.notes || '');
        } else {
          setErrorMsg('Backorder product record not found.');
        }
      } catch (err) {
        console.error('Error fetching backorder item:', err);
        setErrorMsg('Failed to fetch record.');
      } finally {
        setLoading(false);
      }
    }

    loadItem();
  }, [itemId]);

  // Compute pending quantity
  const pendingQty = Math.max(0, requiredQty - orderedQty);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemId) return;

    if (requiredQty <= 0) {
      setErrorMsg('Required quantity must be greater than 0.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const ok = await updateBackorderItem(itemId, {
        required_quantity: Number(requiredQty),
        ordered_quantity: Number(orderedQty),
        status,
        notes: notes.trim() || null,
      });

      if (ok) {
        setSuccessMsg('Backorder product record updated successfully!');
        setTimeout(() => {
          router.push('/admin/backorder_products/dashboard');
        }, 800);
      } else {
        setErrorMsg('Failed to update record. Please try again.');
        setSaving(false);
      }
    } catch (err) {
      console.error('Error updating backorder item:', err);
      setErrorMsg('An unexpected error occurred while saving.');
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!itemId) return;
    if (!confirm('Are you sure you want to delete this backorder product record?')) {
      return;
    }

    setDeleting(true);
    setErrorMsg(null);

    try {
      const ok = await deleteBackorderItem(itemId);
      if (ok) {
        router.push('/admin/backorder_products/dashboard');
      } else {
        setErrorMsg('Failed to delete record.');
        setDeleting(false);
      }
    } catch (err) {
      console.error('Error deleting backorder item:', err);
      setErrorMsg('An unexpected error occurred while deleting.');
      setDeleting(false);
    }
  };

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

            {item && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting || saving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 hover:bg-red-100 text-red-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Record</span>
              </button>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-2xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-600" />
                <span>Edit Backorder Product Record</span>
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                View and modify required, ordered, and pending quantities for this backorder item.
              </p>
            </div>

            {loading ? (
              <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
                <p className="text-xs text-slate-500 font-medium">Loading item details...</p>
              </div>
            ) : errorMsg && !item ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-xs font-bold text-red-700">
                {errorMsg}
              </div>
            ) : item ? (
              <form onSubmit={handleSave} className="space-y-5">
                {errorMsg && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-700">
                    {errorMsg}
                  </div>
                )}

                {successMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-700 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>{successMsg}</span>
                  </div>
                )}

                {/* Product Meta Info Card */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 block uppercase">
                        Record ID: {item.id}
                      </span>
                      <h2 className="text-base font-bold text-slate-900">
                        {item.product?.name || `Product #${item.product_id}`}
                      </h2>
                    </div>

                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-white border border-slate-200 text-slate-700 text-xs font-bold shadow-2xs self-start sm:self-auto">
                      <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                      {item.product?.company?.name || 'N/A'}
                    </span>
                  </div>

                  {item.product?.product_code && (
                    <div className="text-xs text-slate-500 font-mono">
                      Code: <span className="font-bold text-slate-700">{item.product.product_code}</span>
                    </div>
                  )}
                </div>

                {/* Fields Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Required Quantity */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 block">
                      Required Quantity <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={requiredQty}
                      onChange={(e) => setRequiredQty(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                      required
                    />
                  </div>

                  {/* Ordered Quantity */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 block">
                      Ordered Quantity
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={orderedQty}
                      onChange={(e) => setOrderedQty(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                    />
                  </div>

                  {/* Pending Quantity (Read-only computed) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 block">
                      Pending Quantity
                    </label>
                    <input
                      type="number"
                      readOnly
                      value={pendingQty}
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
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
                    placeholder="Enter notes..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  />
                </div>

                {/* Dates Info */}
                {item.created_at && (
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      Created on {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-2 flex items-center justify-end gap-3">
                  <Link
                    href="/admin/backorder_products/dashboard"
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm rounded-lg transition-colors"
                  >
                    Cancel
                  </Link>

                  <button
                    type="submit"
                    disabled={saving}
                    className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold text-xs sm:text-sm rounded-lg shadow-md transition-all flex items-center gap-2 cursor-pointer"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function OpenBackorderProductPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 p-12 text-center flex flex-col items-center justify-center space-y-2">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-xs text-slate-500 font-medium">Loading record...</p>
        </div>
      }
    >
      <OpenBackorderProductContent />
    </Suspense>
  );
}
