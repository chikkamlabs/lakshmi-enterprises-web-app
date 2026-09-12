'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Users,
  Trash2,
  Loader2,
  Phone,
  Package,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import AdminHeader from '../header/page';
import AdminSidebar from '../sidebar/page';
import {
  getBackorderDealerById,
  deleteBackorderDealer,
  BackorderDealerItem,
} from '../../../lib/backorderdealers';
import { getOrderById, Order, OrderItem } from '../../../lib/ordersStore';

function OpenBackorderDealerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const itemId = searchParams.get('id');

  const [item, setItem] = useState<BackorderDealerItem | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadItemAndOrder() {
      if (!itemId) {
        setErrorMsg('Missing backorder dealer item ID.');
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const found = await getBackorderDealerById(itemId);
        if (found) {
          setItem(found);
          const targetOrderId = found.order_id || found.order?.id;
          if (targetOrderId) {
            const orderRes = await getOrderById(targetOrderId);
            if (orderRes) {
              setOrder(orderRes.order);
              setOrderItems(orderRes.items || []);
            }
          }
        } else {
          setErrorMsg('Backorder dealer record not found.');
        }
      } catch (err) {
        console.error('Error fetching backorder dealer:', err);
        setErrorMsg('Failed to fetch record.');
      } finally {
        setLoading(false);
      }
    }

    loadItemAndOrder();
  }, [itemId]);

  const handleDelete = async () => {
    if (!itemId) return;
    setDeleting(true);
    setErrorMsg(null);

    try {
      const ok = await deleteBackorderDealer(itemId);
      if (ok) {
        router.push('/admin/backorder_dealers/dashboard');
      } else {
        setErrorMsg('Failed to delete record.');
        setDeleting(false);
      }
    } catch (err) {
      console.error('Error deleting backorder dealer:', err);
      setErrorMsg('An unexpected error occurred while deleting.');
      setDeleting(false);
    }
  };

  // Filter items where approved_quantity != released_quantity
  const discrepantItems = orderItems.filter((it) => {
    const appQty = Number(it.approved_quantity ?? it.requested_quantity ?? 0);
    const relQty = Number(it.released_quantity ?? 0);
    return appQty !== relQty;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <AdminHeader />

      <div className="flex flex-1">
        <AdminSidebar />

        <main className="flex-1 p-4 sm:p-6 max-w-5xl mx-auto w-full space-y-6">
          {/* Top Bar */}
          <div className="flex items-center justify-between gap-2">
            <Link
              href="/admin/backorder_dealers/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500" />
              <span>Back to Backorder Dealers</span>
            </Link>

            {item && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deleting}
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
                <Users className="w-5 h-5 text-indigo-600" />
                <span>Backorder Dealer Details</span>
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                View dealer information and backorder items with quantity discrepancies for this order.
              </p>
            </div>

            {loading ? (
              <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
                <p className="text-xs text-slate-500 font-medium">Loading record details...</p>
              </div>
            ) : errorMsg && !item ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-xs font-bold text-red-700">
                {errorMsg}
              </div>
            ) : item ? (
              <div className="space-y-6">
                {/* Dealer & Linked Order Info Card */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 block uppercase">
                        Record ID: {item.id}
                      </span>
                      <h2 className="text-base font-bold text-slate-900">
                        {item.dealer?.name || order?.dealer?.name || `Dealer #${item.dealer_id}`}
                      </h2>
                    </div>

                    {item.created_at && (
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 self-start sm:self-auto">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          Created on {new Date(item.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {item.dealer?.shop_name && (
                    <div className="text-xs text-slate-600">
                      Shop: <span className="font-semibold text-slate-800">{item.dealer.shop_name}</span>
                    </div>
                  )}

                  {item.dealer?.mobile && (
                    <div className="text-xs text-slate-500 flex items-center gap-1 font-mono">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{item.dealer.mobile}</span>
                    </div>
                  )}

                  {/* Linked Order & Back Type beside it */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60 mt-2">
                    <span className="text-xs font-bold text-indigo-700">
                      Linked Order: #{item.order?.order_number || order?.order_number || item.order_id || 'N/A'}
                    </span>
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase ${
                        item.back_type === 'admin'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}
                    >
                      {item.back_type || 'staff'}
                    </span>
                  </div>
                </div>

                {/* Order Items Table (approved_quantity != released_quantity) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Package className="w-4 h-4 text-indigo-600" />
                      <span>Order Items Discrepancies</span>
                    </h3>
                    <span className="text-xs font-semibold text-slate-500">
                      {discrepantItems.length} item{discrepantItems.length !== 1 ? 's' : ''} found
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    {discrepantItems.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 text-xs">
                        No item discrepancies found for this order (Approved Quantity matches Released Quantity for all items).
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[11px] tracking-wider">
                              <th className="py-3 px-3 w-12 text-center">S.No</th>
                              <th className="py-3 px-4">Product Name</th>
                              <th className="py-3 px-3 text-center">Approved Qty</th>
                              <th className="py-3 px-3 text-center">Released Qty</th>
                              <th className="py-3 px-3 text-center">Backorder Difference</th>
                              <th className="py-3 px-3 text-right">MRP</th>
                              <th className="py-3 px-3 text-right">Selling Price</th>
                              <th className="py-3 px-4 text-right">Line Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {discrepantItems.map((orderItem, idx) => {
                              const approvedQty = Number(
                                orderItem.approved_quantity ?? orderItem.requested_quantity ?? 0
                              );
                              const releasedQty = Number(orderItem.released_quantity ?? 0);
                              const backorderDiff = approvedQty - releasedQty;
                              const prodName =
                                orderItem.product?.name || `Product #${orderItem.product_id}`;
                              const prodCode = orderItem.product?.product_code || '';
                              const mrp = Number(
                                orderItem.mrp ?? orderItem.associate_mrp ?? orderItem.product?.mrp ?? 0
                              );
                              const sp = Number(
                                orderItem.selling_price ?? orderItem.mrp ?? 0
                              );
                              const lineTot = Number(
                                orderItem.line_total ?? Math.round(sp * releasedQty * 100) / 100
                              );

                              return (
                                <tr key={orderItem.id || idx} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="py-3 px-3 text-center font-bold text-slate-500">
                                    {idx + 1}
                                  </td>

                                  <td className="py-3 px-4">
                                    <div className="font-bold text-slate-900">{prodName}</div>
                                    {prodCode && (
                                      <span className="text-[10px] text-slate-400 font-mono block">
                                        {prodCode}
                                      </span>
                                    )}
                                  </td>

                                  <td className="py-3 px-3 text-center font-bold text-slate-700">
                                    {approvedQty}
                                  </td>

                                  <td className="py-3 px-3 text-center font-bold text-slate-700">
                                    {releasedQty}
                                  </td>

                                  <td className="py-3 px-3 text-center">
                                    <span
                                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black border ${
                                        backorderDiff > 0
                                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                                          : 'bg-red-50 text-red-700 border-red-200'
                                      }`}
                                    >
                                      {backorderDiff > 0 ? `+${backorderDiff}` : backorderDiff}
                                    </span>
                                  </td>

                                  <td className="py-3 px-3 text-right font-mono text-slate-600">
                                    ₹{mrp.toFixed(2)}
                                  </td>

                                  <td className="py-3 px-3 text-right font-mono font-semibold text-slate-800">
                                    ₹{sp.toFixed(2)}
                                  </td>

                                  <td className="py-3 px-4 text-right font-mono font-bold text-indigo-700">
                                    ₹{lineTot.toFixed(2)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </main>
      </div>

      {/* Confirmation Modal for Delete */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 sm:p-6 space-y-4 animate-scale-up border border-slate-200">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Backorder Dealer</h3>
                <p className="text-xs text-slate-500 mt-0.5">Please confirm your action.</p>
              </div>
            </div>

            <p className="text-sm text-slate-600">
              Are you sure you want to delete this backorder dealer record? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OpenBackorderDealerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 p-12 text-center flex flex-col items-center justify-center space-y-2">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-xs text-slate-500 font-medium">Loading record...</p>
        </div>
      }
    >
      <OpenBackorderDealerContent />
    </Suspense>
  );
}

