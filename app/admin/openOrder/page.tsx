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
import { Dealer, updateDealer, getDealerById } from '@/lib/dealersStore';
import { updateBillCredit } from '@/lib/order_payments';
import { supabase } from '@/lib/supabase';
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
  HelpCircle,
  RefreshCw,
} from 'lucide-react';

interface EditableItemRow {
  id: string;
  requested_quantity: number;
  approved_quantity: number;
  released_quantity: number;
  mrp: number;
  discount: number;
  selling_price: number;
  ad_discount: number;
  line_total: number;
  notes: string;
  isDirty?: boolean;
}

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
  const [deliveredDate, setDeliveredDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Bill Credit Update States
  const [showCreditConfirmModal, setShowCreditConfirmModal] = useState<boolean>(false);
  const [isUpdatingCredit, setIsUpdatingCredit] = useState<boolean>(false);
  const [creditUpdateSuccess, setCreditUpdateSuccess] = useState<string>('');

  // Editable Order Items State (all fields in row)
  const [rowState, setRowState] = useState<{ [itemId: string]: EditableItemRow }>({});

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
          setDeliveredDate(
            orderData.order.delivered_date
              ? String(orderData.order.delivered_date).split('T')[0]
              : ''
          );
          setNotes(orderData.order.notes || '');

          // Populate editable items using database values initially
          const initialRows: { [itemId: string]: EditableItemRow } = {};
          orderData.items.forEach((it) => {
            const rawMrp = Number(it.mrp !== undefined && it.mrp !== null ? it.mrp : (it.associate_mrp ?? it.product?.mrp ?? 0));
            const rawDisc = Number(it.discount ?? 0);
            const rawSp = Number(it.selling_price ?? (rawDisc > 0 ? rawMrp - (rawMrp * rawDisc) / 100 : rawMrp));
            const rawAdDisc = Number(it.ad_discount ?? 0);
            const rawReqQty = Number(it.requested_quantity ?? 0);
            const rawAppQty = Number(it.approved_quantity ?? rawReqQty);
            const rawRelQty = Number(it.released_quantity ?? 0);
            const rawLineTotal = Number(it.line_total ?? (rawRelQty * (rawAdDisc > 0 ? rawSp - (rawSp * rawAdDisc) / 100 : rawSp)));

            initialRows[it.id] = {
              id: it.id,
              requested_quantity: rawReqQty,
              approved_quantity: rawAppQty,
              released_quantity: rawRelQty,
              mrp: rawMrp,
              discount: rawDisc,
              selling_price: rawSp,
              ad_discount: rawAdDisc,
              line_total: rawLineTotal,
              notes: it.notes || '',
              isDirty: false,
            };
          });
          setRowState(initialRows);
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

  // Handle field changes on order item row - when edited, do calculations
  const handleFieldChange = (
    itemId: string,
    field: keyof EditableItemRow,
    value: string | number
  ) => {
    setRowState((prev) => {
      const current = prev[itemId];
      if (!current) return prev;

      const updated: EditableItemRow = {
        ...current,
        [field]: value,
        isDirty: true,
      };

      // Perform calculations upon edit
      if (field === 'mrp' || field === 'discount') {
        const rawMrp = field === 'mrp' ? Math.max(0, Number(value) || 0) : Number(current.mrp) || 0;
        const disc = field === 'discount' ? Math.max(0, Number(value) || 0) : Number(current.discount) || 0;
        if (disc > 0) {
          updated.selling_price = Math.round((rawMrp - (rawMrp * disc) / 100) * 100) / 100;
        } else {
          updated.selling_price = rawMrp;
        }
      } else if (field === 'selling_price') {
        updated.selling_price = Math.max(0, Number(value) || 0);
      }

      // Recalculate line total: released_quantity * selling_price_with_ad_discount (or approved_quantity if not yet released)
      const currentSp = Number(updated.selling_price) || 0;
      const adDisc = Number(updated.ad_discount) || 0;
      const spWithAdDiscount = adDisc > 0 ? currentSp - (currentSp * adDisc) / 100 : currentSp;
      const relQty = Number(updated.released_quantity) || 0;
      const appQty = Number(updated.approved_quantity) || Number(updated.requested_quantity) || 0;
      const qtyForTotal = relQty > 0 ? relQty : appQty;
      updated.line_total = Math.round(qtyForTotal * spWithAdDiscount * 100) / 100;

      return {
        ...prev,
        [itemId]: updated,
      };
    });
  };

  // Grand total computed across all row items
  const grandTotal = useMemo(() => {
    return Object.values(rowState).reduce(
      (sum, row) => sum + (Number(row.line_total) || 0),
      0
    );
  }, [rowState]);

  // Handle Save and Release (all changes)
  const handleSaveAndRelease = async () => {
    if (!order) return;
    setIsSaving(true);
    setError('');
    setSaveSuccess(false);

    try {
      const updatedItemsPayload = items.map((item) => {
        const row = rowState[item.id] || {
          requested_quantity: item.requested_quantity || 0,
          approved_quantity: item.approved_quantity || 0,
          released_quantity: item.released_quantity || 0,
          mrp: item.mrp || 0,
          discount: item.discount || 0,
          selling_price: item.selling_price || 0,
          ad_discount: item.ad_discount || 0,
          line_total: item.line_total || 0,
          notes: item.notes || '',
        };
        return {
          id: item.id,
          requested_quantity: Number(row.requested_quantity) || 0,
          approved_quantity: Number(row.approved_quantity) || 0,
          released_quantity: Number(row.released_quantity) || 0,
          mrp: Number(row.mrp) || 0,
          discount: Number(row.discount) || 0,
          selling_price: Number(row.selling_price) || 0,
          ad_discount: Number(row.ad_discount) || 0,
          notes: row.notes || '',
          line_total: Number(row.line_total) || 0,
        };
      });

      const success = await saveOrderApproval({
        orderId: order.id,
        approvingStatus: approvingStatus,
        packedByStaffId: selectedStaffId || null,
        deliveredDate: deliveredDate || null,
        notes: notes,
        updatedItems: updatedItemsPayload,
      });

      if (success) {
        setOrder((prev) =>
          prev
            ? {
                ...prev,
                approving_status: approvingStatus,
                packed_by: selectedStaffId || null,
                delivered_date: deliveredDate || null,
                notes: notes,
                total_amount: grandTotal,
                amount: grandTotal,
              }
            : prev
        );
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

  // Handle Confirm Update Bill Credit
  const handleConfirmUpdateCredit = async () => {
    if (!order || !dealer) return;
    setIsUpdatingCredit(true);
    setError('');
    setCreditUpdateSuccess('');

    try {
      const billAmount = Number(grandTotal > 0 ? grandTotal : (order.total_amount || order.amount || 0));

      // Perform all Supabase operations in lib/order_payments.ts
      const res = await updateBillCredit({
        orderId: order.id,
        dealerId: order.dealer_id,
        billAmount: billAmount,
        firm: order.firm || 'LE',
        notes: `from this ${order.order_number || order.id}`,
      });

      if (res.success) {
        // Update local state
        setOrder((prev) =>
          prev
            ? {
                ...prev,
                balance_amount: billAmount,
                amount: billAmount,
                total_amount: billAmount,
              }
            : prev
        );
        if (res.dealerUpdate) {
          setDealer((prev) => (prev ? { ...prev, ...res.dealerUpdate } : prev));
        }

        const isSlsa = (order.firm || '').toUpperCase() === 'SLSA';
        setCreditUpdateSuccess(
          `Bill credit of ₹${billAmount.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
          })} successfully added to ${isSlsa ? 'SLSA' : 'LE'} Credit and balance updated!`
        );
        setShowCreditConfirmModal(false);
        setTimeout(() => setCreditUpdateSuccess(''), 5000);
      } else {
        setError(res.error || 'Failed to update bill credit.');
      }
    } catch (err: unknown) {
      const e = err as Error;
      console.error('Failed to update bill credit:', e);
      setError(e?.message || 'Failed to update bill credit.');
    } finally {
      setIsUpdatingCredit(false);
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
              {/* Associate Status */}
              {order && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Associate: {order.associate_status}
                </span>
              )}
              {/* Packing Status (shown right after Associate Status) */}
              {order && (
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                  order.packing_status === 'Packed'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : order.packing_status === 'partially_packed'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  Packing: {order.packing_status || 'Pending'}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Review and edit order items, update individual rows via tick button, check dealer credit, and release order.
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
            <span className="font-bold">Order Saved &amp; Updated!</span> All line totals, approved quantities, approving status, and assigned staff were successfully updated.
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
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                      <th className="py-2.5 px-2">Product Name &amp; Code</th>
                      <th className="py-2.5 px-1.5 text-center">Req. Qty</th>
                      <th className="py-2.5 px-1.5 text-center">App. Qty</th>
                      <th className="py-2.5 px-1.5 text-center">Rel. Qty</th>
                      <th className="py-2.5 px-1.5 text-right">MRP (₹)</th>
                      <th className="py-2.5 px-1.5 text-center">Disc (%)</th>
                      <th className="py-2.5 px-1.5 text-right">SP (₹)</th>
                      <th className="py-2.5 px-1.5 text-center">Ad Disc (%)</th>
                      <th className="py-2.5 px-2 text-right">Line Total (₹)</th>
                      <th className="py-2.5 px-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {items.map((item) => {
                      const row = rowState[item.id] || {
                        id: item.id,
                        requested_quantity: item.requested_quantity || 0,
                        approved_quantity: item.approved_quantity || 0,
                        released_quantity: item.released_quantity || 0,
                        mrp: item.mrp || 0,
                        discount: item.discount || 0,
                        selling_price: item.selling_price || 0,
                        ad_discount: item.ad_discount || 0,
                        line_total: item.line_total || 0,
                        notes: item.notes || '',
                      };

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Product Details */}
                          <td className="py-2.5 px-2 min-w-[130px]">
                            <div className="font-semibold text-slate-900 text-xs">
                              {item.product?.name || `Product ID: ${item.product_id}`}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1.5">
                              <span>{item.product?.product_code || 'N/A'}</span>
                              {item.product?.unit && (
                                <span className="bg-slate-100 px-1 py-0.2 rounded text-[9px] text-slate-600">
                                  {item.product.unit}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Requested Quantity (Editable) */}
                          <td className="py-2.5 px-1 text-center">
                            <input
                              type="number"
                              min="0"
                              value={row.requested_quantity}
                              onChange={(e) =>
                                handleFieldChange(
                                  item.id,
                                  'requested_quantity',
                                  parseInt(e.target.value, 10) || 0
                                )
                              }
                              className="w-13 text-center font-medium py-1 px-1 text-xs rounded border border-slate-300 bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </td>

                          {/* Approved Quantity (Editable) */}
                          <td className="py-2.5 px-1 text-center">
                            <input
                              type="number"
                              min="0"
                              value={row.approved_quantity}
                              onChange={(e) =>
                                handleFieldChange(
                                  item.id,
                                  'approved_quantity',
                                  parseInt(e.target.value, 10) || 0
                                )
                              }
                              className="w-13 text-center font-bold py-1 px-1 text-xs rounded border border-indigo-200 bg-indigo-50/50 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </td>

                          {/* Released Quantity (Editable) */}
                          <td className="py-2.5 px-1 text-center">
                            <input
                              type="number"
                              min="0"
                              value={row.released_quantity}
                              onChange={(e) =>
                                handleFieldChange(
                                  item.id,
                                  'released_quantity',
                                  parseInt(e.target.value, 10) || 0
                                )
                              }
                              className="w-13 text-center font-bold py-1 px-1 text-xs rounded border border-emerald-200 bg-emerald-50/50 text-emerald-900 focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                            />
                          </td>

                          {/* MRP (Editable) */}
                          <td className="py-2.5 px-1 text-right">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={row.mrp}
                              onChange={(e) =>
                                handleFieldChange(
                                  item.id,
                                  'mrp',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-16 text-right font-medium py-1 px-1 text-xs rounded border border-slate-300 bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </td>

                          {/* Discount % (Editable) */}
                          <td className="py-2.5 px-1 text-center">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={row.discount}
                              onChange={(e) =>
                                handleFieldChange(
                                  item.id,
                                  'discount',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-12 text-center font-medium py-1 px-1 text-xs rounded border border-slate-300 bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </td>

                          {/* Selling Price (Editable) */}
                          <td className="py-2.5 px-1 text-right">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={row.selling_price}
                              onChange={(e) =>
                                handleFieldChange(
                                  item.id,
                                  'selling_price',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-16 text-right font-medium py-1 px-1 text-xs rounded border border-slate-300 bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </td>

                          {/* Ad Discount % (Editable) */}
                          <td className="py-2.5 px-1 text-center">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={row.ad_discount}
                              onChange={(e) =>
                                handleFieldChange(
                                  item.id,
                                  'ad_discount',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-12 text-center font-medium py-1 px-1 text-xs rounded border border-slate-300 bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </td>

                          {/* Line Total (Calculated: Released Qty * SP with Ad Disc) */}
                          <td className="py-2.5 px-2 text-right font-bold font-mono text-slate-900 whitespace-nowrap">
                            ₹{row.line_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>

                          {/* Notes (Editable) */}
                          <td className="py-2.5 px-1.5 min-w-[100px]">
                            <input
                              type="text"
                              value={row.notes}
                              placeholder="Notes..."
                              onChange={(e) =>
                                handleFieldChange(item.id, 'notes', e.target.value)
                              }
                              className="w-full text-xs py-1 px-1.5 rounded border border-slate-200 bg-white focus:ring-1 focus:ring-indigo-500"
                            />
                          </td>
                        </tr>
                      );
                    })}
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

              {creditUpdateSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2 animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{creditUpdateSuccess}</span>
                </div>
              )}

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
                  <div className="p-3 rounded-xl border bg-indigo-50/70 border-indigo-200">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-800 font-bold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                        LE Current Credit
                      </span>
                      <span className="font-bold font-mono text-slate-900 text-sm">
                        ₹{(Number(dealer.le_credit ?? dealer.current_credit ?? 0)).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>

                  {/* SLSA Credit Display */}
                  <div className="p-3 rounded-xl border bg-purple-50/70 border-purple-200">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-800 font-bold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                        SLSA Current Credit
                      </span>
                      <span className="font-bold font-mono text-slate-900 text-sm">
                        ₹{(Number(dealer.slsa_credit ?? 0)).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Update Bill Credit Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setShowCreditConfirmModal(true)}
                      disabled={isUpdatingCredit || !order}
                      className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs sm:text-sm transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Update Bill Credit</span>
                    </button>
                  </div>
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

              {/* Delivered Date */}
              <div>
                <label className="form-label text-slate-700 font-bold block mb-1.5 text-xs flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Delivered Date</span>
                </label>
                <input
                  type="date"
                  value={deliveredDate}
                  onChange={(e) => setDeliveredDate(e.target.value)}
                  className="form-input w-full p-2.5 text-xs sm:text-sm rounded-lg border-slate-300 bg-white"
                />
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
                      <span>Release &amp; Save Order</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Bill Credit Confirmation Modal */}
      {showCreditConfirmModal && dealer && order && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Confirm Bill Credit Update</h3>
                <p className="text-xs text-slate-500">Record in order payments &amp; increase credit</p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Dealer:</span>
                <span className="font-semibold text-slate-900">
                  {dealer.name} ({dealer.dealer_code})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Bill ID:</span>
                <span className="font-mono font-semibold text-slate-800 text-[11px]">
                  {order.id}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Firm Type:</span>
                <span className="font-bold text-indigo-700">{order.firm || 'LE'}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200">
                <span className="text-slate-700 font-semibold">Bill Amount:</span>
                <span className="font-mono font-bold text-emerald-700 text-sm">
                  ₹{Number(order.amount ?? order.total_amount ?? grandTotal).toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to add this bill credit? This will insert a payment record with calculation type <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono">auto sum</code> and update <strong>{dealer.name}</strong>&apos;s <strong>{(order.firm || 'LE') === 'SLSA' ? 'SLSA' : 'LE'} Credit</strong>.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowCreditConfirmModal(false)}
                disabled={isUpdatingCredit}
                className="btn-base btn-secondary text-xs px-4 py-2 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmUpdateCredit}
                disabled={isUpdatingCredit}
                className="btn-base btn-primary text-xs px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 cursor-pointer"
              >
                {isUpdatingCredit ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Updating Credit...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Yes, Confirm Update</span>
                  </>
                )}
              </button>
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

