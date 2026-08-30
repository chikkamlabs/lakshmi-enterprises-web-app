'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  CheckSquare,
  Square,
  Loader2,
  Package,
  Store,
  UserCheck,
  Tag,
  Boxes,
  Check,
} from 'lucide-react';
import StaffHeader from '../header/page';
import {
  getOrderById,
  saveOrderPacking,
  Order,
  OrderItem,
  PackingStatus,
} from '../../../lib/ordersStore';
import {
  processBackorderItems,
  BackorderRequestItem,
} from '../../../lib/backorderproductStore';
import {
  processBackorderDealers,
  BackorderDealerRequest,
} from '../../../lib/backorderdealers';

interface ItemState {
  id: string;
  product_id: string;
  product_name: string;
  approved_quantity: number;
  released_quantity: number;
  mrp: number;
  discount: number;
  selling_price: number;
  line_total: number;
  ticked: boolean;
}

function StaffOrderDetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('id');

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Editable Packing State
  const [packingStatus, setPackingStatus] = useState<PackingStatus>('Pending');
  const [itemsState, setItemsState] = useState<ItemState[]>([]);

  useEffect(() => {
    let isMounted = true;

    async function loadOrder() {
      if (!orderId) {
        if (isMounted) {
          setErrorMsg('No order ID provided.');
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setErrorMsg(null);

      try {
        const result = await getOrderById(orderId);
        if (isMounted) {
          if (result && result.order) {
            const ord = result.order;
            setOrder(ord);

            // Normalize packing status value
            const currentPs = (ord.packing_status || 'Pending') as PackingStatus;
            setPackingStatus(currentPs);

            // Populate items state
            const itemsList: OrderItem[] = result.items || [];
            const mappedItems: ItemState[] = itemsList.map((item) => {
              const approvedQty = Number(item.approved_quantity ?? item.requested_quantity ?? 0);
              const releasedQty = item.released_quantity !== undefined && item.released_quantity !== null
                ? Number(item.released_quantity)
                : approvedQty;
              const itemDiscount = Number(item.discount) || 0;
              const rawMrp = item.mrp !== undefined && item.mrp !== null
                ? Number(item.mrp)
                : Number(item.associate_mrp ?? item.product?.mrp ?? item.selling_price ?? 0);
              const rawSp = item.selling_price !== undefined && item.selling_price !== null
                ? Number(item.selling_price)
                : (itemDiscount > 0 ? Math.round((rawMrp - (rawMrp * itemDiscount) / 100) * 100) / 100 : rawMrp);
              const rawLineTotal = item.line_total !== undefined && item.line_total !== null
                ? Number(item.line_total)
                : Math.round(rawSp * releasedQty * 100) / 100;

              return {
                id: item.id,
                product_id: item.product_id,
                product_name: item.product?.name || `Product #${item.product_id}`,
                approved_quantity: approvedQty,
                released_quantity: releasedQty,
                mrp: rawMrp,
                discount: itemDiscount,
                selling_price: rawSp,
                line_total: rawLineTotal,
                ticked: releasedQty > 0 || currentPs === 'Packed',
              };
            });

            setItemsState(mappedItems);
          } else {
            setErrorMsg('Order not found.');
          }
        }
      } catch (err) {
        console.error('Failed to load order:', err);
        if (isMounted) setErrorMsg('Failed to load order details.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadOrder();

    return () => {
      isMounted = false;
    };
  }, [orderId]);

  // Handle mrp change - if discount > 0 calculate selling_price(mrp with discount); if discount is zero, do not edit selling_price and calculate line_total(released_quantity * selling_price without change)
  const handleMrpChange = (itemId: string, newMrp: number) => {
    const val = Math.max(0, isNaN(newMrp) ? 0 : newMrp);
    setItemsState((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const discount = Number(item.discount) || 0;
          const sp = discount > 0
            ? Math.round((val - (val * discount) / 100) * 100) / 100
            : Number(item.selling_price) || 0;
          const lineTotal = Math.round(sp * item.released_quantity * 100) / 100;
          return {
            ...item,
            mrp: val,
            selling_price: sp,
            line_total: lineTotal,
          };
        }
        return item;
      })
    );
  };

  // Handle released quantity change - update line_total(released_quantity * selling_price)
  const handleReleasedQuantityChange = (itemId: string, newQty: number) => {
    const val = Math.max(0, isNaN(newQty) ? 0 : newQty);
    setItemsState((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const sp = Number(item.selling_price) || 0;
          const lineTotal = Math.round(sp * val * 100) / 100;
          return {
            ...item,
            released_quantity: val,
            selling_price: sp,
            line_total: lineTotal,
            ticked: val > 0 ? item.ticked : false,
          };
        }
        return item;
      })
    );
  };

  // Handle item tick toggle
  const handleToggleTick = (itemId: string) => {
    setItemsState((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const nextTicked = !item.ticked;
          const nextRelQty =
            nextTicked && item.released_quantity === 0
              ? item.approved_quantity
              : item.released_quantity;
          const sp = Number(item.selling_price) || 0;
          const lineTotal = Math.round(sp * nextRelQty * 100) / 100;
          return {
            ...item,
            ticked: nextTicked,
            released_quantity: nextRelQty,
            selling_price: sp,
            line_total: lineTotal,
          };
        }
        return item;
      })
    );
  };

  // Handle Done button click
  const handleDone = async () => {
    if (!orderId) return;

    setSaving(true);
    try {
      const payloadItems = itemsState.map((it) => {
        const sp = Number(it.selling_price !== undefined ? it.selling_price : it.mrp) || 0;
        const relQty = Number(it.released_quantity) || 0;
        const lineTot = it.line_total !== undefined ? Number(it.line_total) : Math.round(sp * relQty * 100) / 100;
        return {
          id: it.id,
          released_quantity: relQty,
          approved_quantity: Number(it.approved_quantity) || 0,
          mrp: Number(it.mrp) || 0,
          selling_price: sp,
          line_total: lineTot,
        };
      });

      const ok = await saveOrderPacking({
        orderId,
        packingStatus,
        items: payloadItems,
      });

      if (ok) {
        // If packing status is partially packed ('partially_packed')
        if (packingStatus === 'partially_packed') {
          const backorderRequests: BackorderRequestItem[] = [];
          const dealerBackorderRequests: BackorderDealerRequest[] = [];

          itemsState.forEach((item) => {
            const approvedQty = Number(item.approved_quantity) || 0;
            const releasedQty = Number(item.released_quantity) || 0;

            if (releasedQty < approvedQty) {
              const diff = approvedQty - releasedQty;
              if (diff > 0) {
                if (item.product_id) {
                  backorderRequests.push({
                    product_id: item.product_id,
                    difference: diff,
                    notes: `From Order ${order?.order_number || orderId}`,
                  });
                }

                if (order?.dealer_id && item.id) {
                  dealerBackorderRequests.push({
                    dealer_id: order.dealer_id,
                    order_id: orderId,
                    order_item_id: item.id,
                    pending_quantity: diff,
                    status: 'Pending',
                    back_type: 'staff',
                  });
                }
              }
            }
          });

          if (backorderRequests.length > 0) {
            await processBackorderItems(backorderRequests);
          }

          if (dealerBackorderRequests.length > 0) {
            await processBackorderDealers(dealerBackorderRequests);
          }
        }

        router.push('/staff/dashboard');
      } else {
        setErrorMsg('Failed to save packing updates. Please try again.');
        setSaving(false);
      }
    } catch (err) {
      console.error('Error saving order packing:', err);
      setErrorMsg('An unexpected error occurred while saving.');
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16 flex flex-col">
      {/* Top Staff Header */}
      <StaffHeader />

      {/* Main Container */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-3 sm:p-5 space-y-4">
        {/* Back Button & Title */}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => router.push('/staff/dashboard')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
            <span>Back to Dashboard</span>
          </button>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center space-y-3 shadow-2xs">
            <Loader2 className="w-7 h-7 animate-spin text-emerald-700" />
            <p className="text-xs font-medium text-slate-600">Loading order details...</p>
          </div>
        ) : errorMsg || !order ? (
          <div className="bg-white rounded-xl border border-red-200 p-8 text-center space-y-3 shadow-2xs">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto font-bold">
              !
            </div>
            <h3 className="text-sm font-bold text-slate-900">{errorMsg || 'Order not found'}</h3>
            <button
              type="button"
              onClick={() => router.push('/staff/dashboard')}
              className="btn-base btn-primary text-xs px-4 py-1.5"
            >
              Return to Dashboard
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 1. ORDER SUMMARY CARD */}
            <section className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Order ID
                  </span>
                  <h1 className="text-base sm:text-lg font-bold text-slate-900 font-mono leading-none">
                    {order.order_number || order.id}
                  </h1>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block text-right">
                    Approving Status
                  </span>
                  <span
                    className={`badge text-xs font-bold px-2.5 py-0.5 mt-0.5 inline-block ${
                      order.approving_status === 'Partially Approved'
                        ? 'bg-amber-100 text-amber-900 border border-amber-200'
                        : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                    }`}
                  >
                    {order.approving_status}
                  </span>
                </div>
              </div>

              {/* Associate Name & Dealer Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-0.5">
                <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                      Associate Name
                    </span>
                    <span className="font-bold text-slate-900 truncate block text-xs sm:text-sm">
                      {order.associate?.name || order.associate?.email || 'Direct / Admin'}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 border border-blue-200">
                    <Store className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                      Dealer Name
                    </span>
                    <span className="font-bold text-slate-900 truncate block text-xs sm:text-sm">
                      {order.dealer?.name || order.dealer?.shop_name || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* 2. LIST OF ITEMS */}
            <section className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-emerald-700" />
                  <h2 className="text-sm font-bold text-slate-900">List of Items</h2>
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  {itemsState.length} {itemsState.length === 1 ? 'Item' : 'Items'}
                </span>
              </div>

              <div className="space-y-2.5">
                {itemsState.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">
                    No items in this order.
                  </div>
                ) : (
                  itemsState.map((item, idx) => (
                    <div
                      key={item.id}
                      className={`border rounded-lg p-3 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        item.ticked
                          ? 'bg-emerald-50/40 border-emerald-200'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      {/* Left: Product Name & Tick Option */}
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        {/* Tick Checkbox Option */}
                        <button
                          type="button"
                          onClick={() => handleToggleTick(item.id)}
                          className={`mt-0.5 w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors border cursor-pointer ${
                            item.ticked
                              ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs'
                              : 'bg-white border-slate-300 text-slate-400 hover:border-emerald-500'
                          }`}
                          title={item.ticked ? 'Mark unticked' : 'Tick item'}
                        >
                          {item.ticked && <Check className="w-4 h-4 stroke-[3]" />}
                        </button>

                        <div className="space-y-0.5 min-w-0">
                          <span className="text-[10px] font-bold text-slate-400 font-mono">
                            #{idx + 1}
                          </span>
                          <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                            {item.product_name}
                          </h3>
                          <p className="text-[10px] text-slate-500 font-medium">
                            Selling Price: <span className="font-bold text-slate-700">₹{item.selling_price.toFixed(2)}</span>
                            {item.discount > 0 && (
                              <span className="ml-1 text-emerald-600 font-semibold">({item.discount}% off)</span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Right: Quantities & MRP */}
                      <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 text-xs flex-wrap">
                        {/* MRP Input */}
                        <div className="bg-slate-50 border border-slate-200 rounded-md p-1 min-w-[85px] text-center">
                          <label className="text-[9px] font-bold text-slate-500 uppercase block mb-0.5">
                            MRP (₹)
                          </label>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={item.mrp}
                            onChange={(e) =>
                              handleMrpChange(
                                item.id,
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-18 text-center font-bold text-slate-900 bg-white border border-slate-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs mx-auto block"
                          />
                        </div>

                        {/* Approved Quantity */}
                        <div className="bg-slate-100 border border-slate-200 rounded-md px-2.5 py-1 text-center min-w-[75px]">
                          <span className="text-[9px] font-bold text-slate-500 uppercase block">
                            Approved Qty
                          </span>
                          <span className="font-extrabold text-slate-900 text-xs">
                            {item.approved_quantity}
                          </span>
                        </div>

                        {/* Ask Released Quantity */}
                        <div className="bg-emerald-50 border border-emerald-200 rounded-md p-1 min-w-[90px] text-center">
                          <label className="text-[9px] font-bold text-emerald-900 uppercase block mb-0.5">
                            Released Qty
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={item.released_quantity}
                            onChange={(e) =>
                              handleReleasedQuantityChange(
                                item.id,
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="w-16 text-center font-bold text-slate-900 bg-white border border-emerald-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs mx-auto block"
                          />
                        </div>

                        {/* Line Total (Selling Price * Released Quantity) */}
                        <div className="bg-emerald-100/60 border border-emerald-200 rounded-md px-2.5 py-1 text-center min-w-[85px]">
                          <span className="text-[9px] font-bold text-emerald-800 uppercase block">
                            Line Total
                          </span>
                          <span className="font-extrabold text-emerald-900 font-mono text-xs">
                            ₹{item.line_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* 3. SELECT PACKING STATUS & DONE BUTTON */}
            <section className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Boxes className="w-4 h-4 text-emerald-700" />
                  <span>Select Packing Status</span>
                </label>
                <select
                  value={packingStatus}
                  onChange={(e) => setPackingStatus(e.target.value as PackingStatus)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-semibold text-xs sm:text-sm rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition-all"
                >
                  <option value="Pending">Pending</option>
                  <option value="partially_packed">Partially Packed</option>
                  <option value="Packed">Packed</option>
                </select>
              </div>

              {/* Done Button */}
              <button
                type="button"
                onClick={handleDone}
                disabled={saving}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold text-sm sm:text-base rounded-lg shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Done</span>
                  </>
                )}
              </button>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export default function StaffOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center flex flex-col items-center justify-center space-y-2">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-700" />
          <p className="text-xs text-slate-500 font-medium">Loading order view...</p>
        </div>
      }
    >
      <StaffOrderDetailContent />
    </Suspense>
  );
}
