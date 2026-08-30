'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AdminHeader from '../header/page';
import AdminSidebar from '../sidebar/page';
import { getOrderById, Order } from '@/lib/ordersStore';
import {
  getOrderPaymentsByBillId,
  addOrderPayment,
  OrderPayment,
  CalculationType,
  PaymentType,
} from '@/lib/order_payments';
import {
  ArrowLeft,
  CreditCard,
  Plus,
  Receipt,
  Calendar,
  Building2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Banknote,
  Smartphone,
  FileCheck,
  MoreHorizontal,
  PlusCircle,
  MinusCircle,
  Loader2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

function OrderPaymentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams?.get('orderId') || searchParams?.get('id') || '';

  const [order, setOrder] = useState<Order | null>(null);
  const [payments, setPayments] = useState<OrderPayment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Add Payment Modal State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [calculationType, setCalculationType] = useState<CalculationType>('deduct');
  const [paymentType, setPaymentType] = useState<PaymentType>('cash');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [submitSuccess, setSubmitSuccess] = useState<string>('');

  useEffect(() => {
    let isMounted = true;

    async function fetchDetails() {
      if (!orderId) {
        if (isMounted) {
          setError('No Order ID provided.');
          setIsLoading(false);
        }
        return;
      }

      try {
        const [orderResult, paymentsResult] = await Promise.all([
          getOrderById(orderId),
          getOrderPaymentsByBillId(orderId),
        ]);

        if (isMounted) {
          if (!orderResult.order) {
            setError(`Order with ID "${orderId}" could not be found.`);
          } else {
            setOrder(orderResult.order);
            setPayments(paymentsResult);
          }
          setIsLoading(false);
        }
      } catch (err: unknown) {
        const e = err as Error;
        console.error('Failed to load order payments data:', e);
        if (isMounted) {
          setError(e?.message || 'Failed to load order and payment details.');
          setIsLoading(false);
        }
      }
    }

    fetchDetails();

    return () => {
      isMounted = false;
    };
  }, [orderId]);

  const handleAddPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;

    const numAmount = parseFloat(paymentAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setSubmitError('Please enter a valid positive payment amount.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const res = await addOrderPayment({
        bill_id: order.id,
        dealer_id: order.dealer_id,
        amount: numAmount,
        calculation_type: calculationType,
        payment_type: paymentType,
        notes: notes.trim() || null,
        firm: order.firm || 'LE',
      });

      if (res.success && res.payment) {
        // Update local order balance amount
        const updatedBal = res.newBalance !== undefined ? res.newBalance : 0;
        setOrder((prev) => (prev ? { ...prev, balance_amount: updatedBal } : prev));
        setPayments((prev) => [res.payment!, ...prev]);

        // Reset form & close modal
        setPaymentAmount('');
        setCalculationType('deduct');
        setPaymentType('cash');
        setNotes('');
        setShowAddModal(false);

        setSubmitSuccess(
          `Payment of ₹${numAmount.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
          })} recorded successfully!`
        );
        setTimeout(() => setSubmitSuccess(''), 5000);
      } else {
        setSubmitError(res.error || 'Failed to record payment.');
      }
    } catch (err: unknown) {
      const e = err as Error;
      console.error('Error submitting payment:', e);
      setSubmitError(e?.message || 'An error occurred while submitting the payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  const getPaymentTypeBadge = (pt: PaymentType) => {
    switch (pt) {
      case 'cash':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
            <Banknote className="w-3.5 h-3.5" />
            <span>Cash</span>
          </span>
        );
      case 'upi':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200/80">
            <Smartphone className="w-3.5 h-3.5" />
            <span>UPI</span>
          </span>
        );
      case 'cheque':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/80">
            <FileCheck className="w-3.5 h-3.5" />
            <span>Cheque</span>
          </span>
        );
      case 'others':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/80">
            <MoreHorizontal className="w-3.5 h-3.5" />
            <span>Others</span>
          </span>
        );
    }
  };

  const getCalculationTypeBadge = (ct: CalculationType) => {
    const isCredit = ct === 'credit';
    if (isCredit) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
          <TrendingUp className="w-3 h-3 text-purple-600" />
          <span>Credit (Add)</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
        <TrendingDown className="w-3 h-3 text-blue-600" />
        <span>Deduct (Subtract)</span>
      </span>
    );
  };

  if (isLoading) {
    return (
      <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-6xl w-full mx-auto space-y-6">
        <div className="flex items-center justify-center min-h-[350px]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-sm font-semibold text-slate-600">Loading Order Payments...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-6xl w-full mx-auto space-y-6">
        <button
          onClick={() => router.push('/admin/orders/dashboard')}
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors inline-flex items-center gap-2 text-sm font-medium cursor-pointer shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Orders</span>
        </button>

        <div className="p-6 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-base font-bold text-red-900">Order Payments Error</h2>
            <p className="text-sm text-red-700 mt-1">{error || 'Order not found.'}</p>
          </div>
        </div>
      </main>
    );
  }

  const orderAmount = Number(order.amount ?? order.total_amount ?? 0);
  const balanceAmount = Number(order.balance_amount ?? 0);

  return (
    <main id="order-payments-page" className="flex-1 p-4 sm:p-6 md:p-8 max-w-6xl w-full mx-auto space-y-6">
      {/* Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            id="back-to-orders-btn"
            onClick={() => router.push('/admin/orders/dashboard')}
            className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            title="Back to Orders Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="page-title text-xl sm:text-2xl font-black text-slate-900">
                Order Payments
              </h1>
              <span className="font-mono text-sm sm:text-base font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-200/80">
                {order.order_number}
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                {order.firm || 'LE'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Manage payments, credits, and ledger transactions for this bill
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2.5">
          <button
            id="add-payment-btn"
            onClick={() => {
              setSubmitError('');
              setShowAddModal(true);
            }}
            className="btn-base btn-primary text-xs sm:text-sm py-2.5 px-4 rounded-xl flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Payment</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {submitSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-3 animate-fade-in shadow-2xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-sm font-semibold">{submitSuccess}</span>
        </div>
      )}

      {/* Order & Dealer Context Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Dealer Details */}
        <div className="space-y-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Dealer Information
          </span>
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm sm:text-base">
            <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>{order.dealer?.name || 'Unknown Dealer'}</span>
          </div>
          {order.dealer?.dealer_code && (
            <div className="text-xs text-slate-500 font-medium">
              Code: <span className="font-mono">{order.dealer.dealer_code}</span>
            </div>
          )}
          {order.dealer?.group?.group_name && (
            <div className="text-xs text-indigo-600 font-medium">
              Group: {order.dealer.group.group_name}
            </div>
          )}
        </div>

        {/* Order Amount Card */}
        <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
            <span>Order Total Amount</span>
            <Receipt className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-slate-900">
            ₹{orderAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>
              Placed on{' '}
              {order.created_at
                ? new Date(order.created_at).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })
                : 'N/A'}
            </span>
          </div>
        </div>

        {/* Balance Amount Card */}
        <div
          className={`rounded-xl p-4 border flex flex-col justify-between ${
            balanceAmount > 0
              ? 'bg-amber-50/70 border-amber-200'
              : 'bg-emerald-50/70 border-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold mb-1">
            <span className={balanceAmount > 0 ? 'text-amber-800' : 'text-emerald-800'}>
              Current Balance Amount
            </span>
            <CreditCard
              className={`w-4 h-4 ${balanceAmount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}
            />
          </div>
          <div
            className={`text-xl sm:text-2xl font-black font-mono ${
              balanceAmount > 0 ? 'text-amber-900' : 'text-emerald-900'
            }`}
          >
            ₹{balanceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] font-medium mt-1">
            {balanceAmount > 0 ? (
              <span className="text-amber-700">Pending payment balance</span>
            ) : (
              <span className="text-emerald-700">Fully settled / Paid</span>
            )}
          </div>
        </div>
      </div>

      {/* Payments History Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">Payment Transactions</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {payments.length}
            </span>
          </div>
          <div className="text-xs text-slate-500">
            Read-only ledger records for this order
          </div>
        </div>

        {payments.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Receipt className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No Payments Recorded Yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Tap the &quot;Add Payment&quot; button above to record a payment transaction for this bill.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-4">Date &amp; Time</th>
                    <th className="py-3.5 px-4">Calculation</th>
                    <th className="py-3.5 px-4">Payment Method</th>
                    <th className="py-3.5 px-4 text-right">Amount</th>
                    <th className="py-3.5 px-4 text-right">Remaining Balance</th>
                    <th className="py-3.5 px-4">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Date & Time */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{formatDateTime(p.created_at)}</span>
                        </div>
                      </td>

                      {/* Calculation Type */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getCalculationTypeBadge(p.calculation_type)}
                      </td>

                      {/* Payment Type */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getPaymentTypeBadge(p.payment_type)}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-sm text-slate-900 whitespace-nowrap">
                        ₹{Number(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Remaining Balance */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-sm text-indigo-700 whitespace-nowrap">
                        ₹{Number(p.remaining_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Notes */}
                      <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                        {p.notes || <span className="text-slate-400 italic">None</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden divide-y divide-slate-100">
              {payments.map((p) => (
                <div key={p.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatDateTime(p.created_at)}</span>
                    </div>
                    <div>{getPaymentTypeBadge(p.payment_type)}</div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div>{getCalculationTypeBadge(p.calculation_type)}</div>
                    <div className="text-right">
                      <div className="text-xs text-slate-500">Amount</div>
                      <div className="font-mono font-extrabold text-base text-slate-900">
                        ₹{Number(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-lg flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Remaining Balance:</span>
                    <span className="font-mono font-bold text-indigo-700">
                      ₹{Number(p.remaining_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {p.notes && (
                    <div className="text-xs text-slate-600 bg-slate-50/50 p-2 rounded border border-slate-100">
                      <span className="font-semibold text-slate-700 mr-1">Note:</span>
                      <span>{p.notes}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Add Payment Modal Dialog */}
      {showAddModal && (
        <div
          id="add-payment-modal"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-fade-in max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Add Order Payment</h3>
                  <p className="text-xs text-slate-500">Record transaction for order #{order.order_number}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                disabled={isSubmitting}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Bill & Dealer Context Info */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Bill ID (Order):</span>
                <span className="font-mono font-semibold text-slate-800 text-[11px] truncate max-w-[220px]">
                  {order.id}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Dealer:</span>
                <span className="font-semibold text-slate-900">
                  {order.dealer?.name || 'Dealer'} ({order.dealer?.dealer_code || 'N/A'})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Firm:</span>
                <span className="font-bold text-indigo-700">{order.firm || 'LE'}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200">
                <span className="text-slate-700 font-semibold">Current Balance:</span>
                <span className="font-mono font-bold text-slate-900">
                  ₹{balanceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {submitError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Payment Input Form */}
            <form onSubmit={handleAddPaymentSubmit} className="space-y-4">
              {/* Payment Amount */}
              <div>
                <label className="form-label text-slate-700 font-bold block mb-1 text-xs">
                  Payment Amount (₹) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="form-input w-full pl-8 pr-3 py-2.5 text-sm rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              {/* Calculation Type Selector */}
              <div>
                <label className="form-label text-slate-700 font-bold block mb-1 text-xs">
                  Calculation Type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCalculationType('deduct')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      calculationType === 'deduct'
                        ? 'bg-blue-50 border-blue-500 text-blue-800 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <MinusCircle className="w-4 h-4 text-blue-600" />
                    <span>Deduct (Subtract)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCalculationType('credit')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      calculationType === 'credit'
                        ? 'bg-purple-50 border-purple-500 text-purple-800 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <PlusCircle className="w-4 h-4 text-purple-600" />
                    <span>Credit (Add)</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {calculationType === 'deduct'
                    ? 'Deducts amount from order balance.'
                    : 'Credits (adds) amount to order balance.'}
                </p>
              </div>

              {/* Payment Type Selector */}
              <div>
                <label className="form-label text-slate-700 font-bold block mb-1 text-xs">
                  Payment Method <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['cash', 'upi', 'cheque', 'others'] as PaymentType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setPaymentType(type)}
                      className={`py-2 px-2.5 rounded-xl border text-xs font-semibold capitalize flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                        paymentType === type
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-800 font-bold shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {type === 'cash' && <Banknote className="w-3.5 h-3.5" />}
                      {type === 'upi' && <Smartphone className="w-3.5 h-3.5" />}
                      {type === 'cheque' && <FileCheck className="w-3.5 h-3.5" />}
                      {type === 'others' && <MoreHorizontal className="w-3.5 h-3.5" />}
                      <span>{type}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="form-label text-slate-700 font-bold block mb-1 text-xs">
                  Payment Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Transaction ID, cheque number, or reference..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="form-input w-full p-2.5 text-xs sm:text-sm rounded-xl"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={isSubmitting}
                  className="btn-base btn-secondary text-xs px-4 py-2.5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-base btn-primary text-xs px-5 py-2.5 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Payment...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Record Payment</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

export default function OrderPaymentsPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <AdminHeader />

      <div className="flex-1 flex flex-col md:flex-row">
        <AdminSidebar />

        <Suspense
          fallback={
            <div className="flex-1 p-8 text-center text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
              Loading order payments...
            </div>
          }
        >
          <OrderPaymentsContent />
        </Suspense>
      </div>
    </div>
  );
}
