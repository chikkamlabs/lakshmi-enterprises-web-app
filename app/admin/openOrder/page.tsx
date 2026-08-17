'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AdminHeader from '../header/page';
import AdminSidebar from '../sidebar/page';
import {
  getOrderById,
  saveOrderApproval,
  getStaffMembers,
  Order,
  OrderItem,
  OrderProfile,
  ApprovingStatus,
} from '@/lib/ordersStore';
import { Dealer } from '@/lib/dealersStore';
import {
  ArrowLeft,
  CheckCircle2,
  Save,
  UserCheck,
  Building2,
  Calendar,
  Clock,
  Loader2,
  FileText,
  IndianRupee,
  CreditCard,
  AlertCircle,
  Package,
  Boxes,
  Tag,
  Check,
} from 'lucide-react';

function OpenOrderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams?.get('id') || '';

  // Data Loading States
  const [order, setOrder] = useState<Order | null>(null);
  const [dealer, setDealer] = useState<Dealer | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [staffList, setStaffList] = useState<OrderProfile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Editable Form States
  const [approvingStatus, setApprovingStatus] = useState<ApprovingStatus>('Pending');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Editable Order Items State (mapped by item id)
  const [editableItems, setEditableItems] = useState<{
    [itemId: string]: {
      approved_quantity: number;
      selling_price: number;
    };
  }>({});

  // Load Order Details, Items, Dealer and Staff
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!orderId) {
        setIsLoading(false);
        setError('No order ID provided.');
        return;
      }

      setIsLoading(true);
      setError('');

      try {
        const [orderData, staffMembers] = await Promise.all([
          getOrderById(orderId),
          getStaffMembers(),
        ]);

        if (!isMounted) return;

        if (orderData.order) {
          setOrder(orderData.order);
          setDealer(orderData.dealer);
          setItems(orderData.items);
          setStaffList(staffMembers);

          setApprovingStatus(orderData.order.approving_status || 'Pending');
          setSelectedStaffId(orderData.order.packed_by || '');
          setNotes(orderData.order.notes || '');

          // Populate editable items
          const initialEdits: { [key: string]: { approved_quantity: number; selling_price: number } } = {};
          orderData.items.forEach((it) => {
            initialEdits[it.id] = {
              approved_quantity: Number(it.approved_quantity ?? it.requested_quantity ?? 0),
              selling_price: Number(it.selling_price ?? 0),
            };
          });
          setEditableItems(initialEdits);
        } else {
          setError(`Order with ID "${orderId}" was not found.`);
        }
      } catch (err) {
        console.error('Error loading order details:', err);
        setError('Failed to fetch order details.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [orderId]);

  // Handle item quantity change
  const handleQuantityChange = (itemId: string, newQty: number) => {
    const qty = Math.max(0, isNaN(newQty) ? 0 : newQty);
    setEditableItems((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        approved_quantity: qty,
      },
    }));
  };

  // Handle item selling price change
  const handlePriceChange = (itemId: string, newPrice: number) => {
    const price = Math.max(0, isNaN(newPrice) ? 0 : newPrice);
    setEditableItems((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        selling_price: price,
      },
    }));
  };

  // Computed line totals and overall order total amount
  const computedItemsWithTotals = useMemo(() => {
    return items.map((it) => {
      const edit = editableItems[it.id] || {
        approved_quantity: it.approved_quantity || it.requested_quantity,
        selling_price: it.selling_price,
      };
      const lineTotal = Number(edit.approved_quantity) * Number(edit.selling_price);
      return {
        ...it,
        editApprovedQty: edit.approved_quantity,
        editSellingPrice: edit.selling_price,
        computedLineTotal: lineTotal,
      };
    });
  }, [items, editableItems]);

  const grandTotal = useMemo(() => {
    return computedItemsWithTotals.reduce((acc, curr) => acc + curr.computedLineTotal, 0);
  }, [computedItemsWithTotals]);

  // Handle Save and Release
  const handleSaveAndRelease = async () => {
    if (!order) return;
    setIsSaving(true);
    setError('');
    setSaveSuccess(false);

    try {
      const updatedItemsPayload = computedItemsWithTotals.map((item) => ({
        id: item.id,
        approved_quantity: item.editApprovedQty,
        selling_price: item.editSellingPrice,
        line_total: item.computedLineTotal,
      }));

      const success = await saveOrderApproval({
        orderId: order.id,
        approvingStatus: approvingStatus,
        packedByStaffId: selectedStaffId || null,
        notes: notes,
        updatedItems: updatedItemsPayload,
      });

      if (success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        setError('Failed to update order in database.');
      }
    } catch (err) {
      console.error('Error saving order approval:', err);
      setError('An error occurred while saving order details.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
      {/* Top Navigation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/admin/orders/dashboard')}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            title="Back to Orders Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Order #{order?.order_number || 'Loading...'}
              </h1>
              {order?.firm && (
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  order.firm === 'SLSA'
                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                    : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                }`}>
                  Firm: {order.firm}
                </span>
              )}
              {order && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {order.associate_status}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Review line items, adjust approved quantities/prices, check dealer credit, and release order.
            </p>
          </div>
        </div>

        {/* Save & Release Button Header */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveAndRelease}
            disabled={isSaving || isLoading || !order}
            className="btn-base btn-primary text-xs sm:text-sm px-5 py-2.5 flex items-center gap-2 shadow-sm cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Release &amp; Save Order</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2.5 text-xs sm:text-sm shadow-2xs animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <span className="font-bold">Order Saved &amp; Updated!</span> All line totals, approved quantities, approving status, and assigned staff were successfully updated in Supabase.
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2.5 text-xs sm:text-sm shadow-2xs">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
          <p className="text-sm font-medium">Loading open order data...</p>
        </div>
      ) : !order ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
          <p className="text-base font-semibold text-slate-800">Order Not Found</p>
          <p className="text-xs text-slate-500 mt-1">Please return to the orders dashboard and select a valid order.</p>
          <button
            onClick={() => router.push('/admin/orders/dashboard')}
            className="btn-base btn-secondary text-xs mt-4"
          >
            Go to Orders Dashboard
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column (2/3): Items Table and Adjustments */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Items Table Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Boxes className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-base font-bold text-slate-900">Order Items Details</h2>
                </div>
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                  {items.length} {items.length === 1 ? 'Item' : 'Items'}
                </span>
              </div>

              {/* Items List */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      <th className="py-3 px-3">Product Name &amp; Code</th>
                      <th className="py-3 px-3 text-center">Req. Qty</th>
                      <th className="py-3 px-3 text-center">Approved Qty</th>
                      <th className="py-3 px-3 text-right">Selling Price (₹)</th>
                      <th className="py-3 px-3 text-right">Line Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
                    {computedItemsWithTotals.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Product Details */}
                        <td className="py-3.5 px-3">
                          <div className="font-semibold text-slate-900">
                            {item.product?.name || `Product ID: ${item.product_id}`}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                            <span>Code: {item.product?.product_code || 'N/A'}</span>
                            {item.product?.unit && (
                              <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] text-slate-600">
                                Unit: {item.product.unit}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Requested Quantity */}
                        <td className="py-3.5 px-3 text-center font-semibold text-slate-700">
                          {item.requested_quantity}
                        </td>

                        {/* Approved Quantity (Editable) */}
                        <td className="py-3.5 px-3 text-center">
                          <input
                            type="number"
                            min="0"
                            value={item.editApprovedQty}
                            onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 0)}
                            className="w-20 text-center font-bold py-1 px-2 text-xs rounded-lg border border-indigo-200 bg-indigo-50/40 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                          />
                        </td>

                        {/* Selling Price (Editable) */}
                        <td className="py-3.5 px-3 text-right">
                          <div className="relative inline-block w-24">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.editSellingPrice}
                              onChange={(e) => handlePriceChange(item.id, parseFloat(e.target.value) || 0)}
                              className="w-full text-right font-medium py-1 pl-5 pr-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                            />
                          </div>
                        </td>

                        {/* Line Total (Auto Computed = Approved Qty * SP) */}
                        <td className="py-3.5 px-3 text-right font-bold font-mono text-slate-900">
                          ₹{item.computedLineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Grand Total Summary Box */}
              <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-center justify-between">
                <span className="text-sm font-bold text-indigo-950">Grand Order Total</span>
                <span className="text-xl font-extrabold font-mono text-indigo-700">
                  ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Notes Section */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                <span>Order Notes / Instructions</span>
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter any specific approval notes or packing directions..."
                className="form-input w-full p-2.5 text-xs sm:text-sm rounded-lg border-slate-200"
              />
            </div>
          </div>

          {/* Right Column (1/3): Dealer Credit & Order Approval Controls */}
          <div className="space-y-6">
            {/* Dealer Credit Details Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <CreditCard className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-900">Dealer Credit Status</h2>
              </div>

              {dealer ? (
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{dealer.name}</div>
                      <div className="text-xs text-slate-500">{dealer.shop_name}</div>
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {dealer.dealer_code}
                    </span>
                  </div>

                  {/* LE Credit Display */}
                  <div className={`p-3 rounded-xl border space-y-2 ${
                    (order?.firm || 'LE') === 'LE'
                      ? 'bg-indigo-50/70 border-indigo-200 ring-1 ring-indigo-300/60'
                      : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                        LE (Lakshmi Enterprises) Credit
                      </span>
                      {(order?.firm || 'LE') === 'LE' && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">
                          Active Order Firm
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60">
                      <span className="text-slate-500 font-medium">LE Credit Balance</span>
                      <span className="font-bold font-mono text-slate-900 text-sm">
                        ₹{(Number(dealer.le_credit ?? dealer.current_credit ?? 0)).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">LE Credit Limit</span>
                      <span className="font-medium font-mono text-slate-700">
                        ₹{(Number(dealer.le_credit_limit ?? dealer.credit_limit ?? 0)).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>

                    <div className="pt-1.5 border-t border-slate-200/80 flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-semibold">Available LE Credit</span>
                      <span className="font-bold font-mono text-emerald-700">
                        ₹{(
                          Math.max(0, Number(dealer.le_credit_limit ?? dealer.credit_limit ?? 0) - Number(dealer.le_credit ?? dealer.current_credit ?? 0))
                        ).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* SLSA Credit Display */}
                  <div className={`p-3 rounded-xl border space-y-2 ${
                    order?.firm === 'SLSA'
                      ? 'bg-purple-50/70 border-purple-200 ring-1 ring-purple-300/60'
                      : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                        SLSA Credit
                      </span>
                      {order?.firm === 'SLSA' && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                          Active Order Firm
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60">
                      <span className="text-slate-500 font-medium">SLSA Credit Balance</span>
                      <span className="font-bold font-mono text-slate-900 text-sm">
                        ₹{(Number(dealer.slsa_credit ?? 0)).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">SLSA Credit Limit</span>
                      <span className="font-medium font-mono text-slate-700">
                        ₹{(Number(dealer.slsa_credit_limit ?? 0)).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>

                    <div className="pt-1.5 border-t border-slate-200/80 flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-semibold">Available SLSA Credit</span>
                      <span className="font-bold font-mono text-emerald-700">
                        ₹{(
                          Math.max(0, Number(dealer.slsa_credit_limit ?? 0) - Number(dealer.slsa_credit ?? 0))
                        ).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Credit warning indicator if exceeding limit for the active firm */}
                  {(() => {
                    const isSLSA = order?.firm === 'SLSA';
                    const activeCredit = Number(isSLSA ? dealer.slsa_credit : (dealer.le_credit ?? dealer.current_credit)) || 0;
                    const activeLimit = Number(isSLSA ? dealer.slsa_credit_limit : (dealer.le_credit_limit ?? dealer.credit_limit)) || 0;
                    if (activeLimit > 0 && activeCredit + grandTotal > activeLimit) {
                      return (
                        <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>
                            Notice: Approving this order will exceed the dealer&apos;s set <strong>{isSLSA ? 'SLSA' : 'LE'}</strong> credit limit.
                          </span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic">No specific dealer info loaded.</div>
              )}
            </div>

            {/* Change Approving Status & Attach Staff Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Tag className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-900">Approval &amp; Packing Controls</h2>
              </div>

              {/* Change Approving Status */}
              <div>
                <label className="form-label text-slate-700 font-bold block mb-1.5 text-xs">
                  Approving Status
                </label>
                <select
                  value={approvingStatus}
                  onChange={(e) => setApprovingStatus(e.target.value as ApprovingStatus)}
                  className="form-input w-full p-2.5 text-xs sm:text-sm font-semibold rounded-lg border-slate-300 bg-white"
                >
                  <option value="Pending">Pending</option>
                  <option value="Partially Approved">Partially Approved</option>
                  <option value="Approved">Approved</option>
                </select>
              </div>

              {/* Attach Staff (Packed By) */}
              <div>
                <label className="form-label text-slate-700 font-bold block mb-1.5 text-xs flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Attach Staff (Packed By)</span>
                </label>
                <select
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="form-input w-full p-2.5 text-xs sm:text-sm rounded-lg border-slate-300 bg-white"
                >
                  <option value="">-- Select Staff Member --</option>
                  {staffList.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.mobile || st.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Release & Save Button */}
              <div className="pt-2">
                <button
                  onClick={handleSaveAndRelease}
                  disabled={isSaving || isLoading}
                  className="w-full btn-base btn-primary py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Order...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Release &amp; Save Button</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function OpenOrderPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <AdminHeader />

      <div className="flex-1 flex flex-col md:flex-row">
        <AdminSidebar />

        <Suspense
          fallback={
            <div className="flex-1 p-8 text-center text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
              Loading order page...
            </div>
          }
        >
          <OpenOrderContent />
        </Suspense>
      </div>
    </div>
  );
}
