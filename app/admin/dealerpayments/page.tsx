'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AdminHeader from '../header/page';
import AdminSidebar from '../sidebar/page';
import {
  getDealerPayments,
  DealerPaymentItem,
  DealerPaymentSummary,
} from '@/lib/dealerpayments';
import { Dealer } from '@/lib/dealersStore';
import {
  ArrowLeft,
  CreditCard,
  Building2,
  Calendar,
  Clock,
  Banknote,
  Smartphone,
  FileCheck,
  MoreHorizontal,
  TrendingDown,
  TrendingUp,
  Loader2,
  AlertCircle,
  RefreshCw,
  Search,
  Receipt,
  Layers,
  Phone,
  MapPin,
  ExternalLink,
} from 'lucide-react';

function DealerPaymentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dealerId = searchParams?.get('dealerId') || searchParams?.get('id') || '';

  const [dealer, setDealer] = useState<Dealer | null>(null);
  const [payments, setPayments] = useState<DealerPaymentItem[]>([]);
  const [summary, setSummary] = useState<DealerPaymentSummary>({
    totalTransactions: 0,
    leCredit: 0,
    slsaCredit: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFirm, setSelectedFirm] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');

  const loadData = useCallback(async () => {
    if (!dealerId) {
      setError('No Dealer ID provided.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await getDealerPayments(dealerId);
      if (!res.dealer) {
        setError(`Dealer with ID "${dealerId}" was not found.`);
      } else {
        setDealer(res.dealer);
        setPayments(res.payments);
        setSummary(res.summary);
      }
    } catch (err: unknown) {
      const e = err as Error;
      console.error('Error fetching dealer payments:', e);
      setError(e?.message || 'Failed to fetch dealer payments.');
    } finally {
      setIsLoading(false);
    }
  }, [dealerId]);

  useEffect(() => {
    let isMounted = true;
    const fetch = async () => {
      if (!isMounted) return;
      await loadData();
    };
    fetch();
    return () => {
      isMounted = false;
    };
  }, [loadData]);

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      // Firm filter
      if (selectedFirm !== 'ALL' && p.firm !== selectedFirm) {
        return false;
      }
      // Payment Type filter
      if (selectedType !== 'ALL' && p.payment_type !== selectedType) {
        return false;
      }
      // Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const noteMatch = (p.notes || '').toLowerCase().includes(q);
        const billMatch = (p.order?.order_number || p.bill_id || '').toLowerCase().includes(q);
        const typeMatch = p.payment_type.toLowerCase().includes(q);
        const firmMatch = p.firm.toLowerCase().includes(q);
        const amountMatch = String(p.amount).includes(q);
        return noteMatch || billMatch || typeMatch || firmMatch || amountMatch;
      }
      return true;
    });
  }, [payments, selectedFirm, selectedType, searchQuery]);

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

  const getPaymentTypeBadge = (pt: string) => {
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

  const getCalculationTypeBadge = (ct: string) => {
    const isSum = ct === 'sum' || ct === 'credit';
    if (isSum) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
          <TrendingUp className="w-3 h-3 text-purple-600" />
          <span>Credit (+)</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
        <TrendingDown className="w-3 h-3 text-blue-600" />
        <span>Debit (-)</span>
      </span>
    );
  };

  const getFirmBadge = (firm: string) => {
    if (firm === 'SLSA') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
          SLSA
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
        LE
      </span>
    );
  };

  if (isLoading) {
    return (
      <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-sm font-semibold text-slate-600">Loading dealer payment transactions...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !dealer) {
    return (
      <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
        <button
          onClick={() => router.push('/admin/dealers/dashboard')}
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors inline-flex items-center gap-2 text-sm font-medium cursor-pointer shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dealers</span>
        </button>

        <div className="p-6 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-base font-bold text-red-900">Dealer Payments Error</h2>
            <p className="text-sm text-red-700 mt-1">{error || 'Dealer not found.'}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main id="dealer-payments-page" className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            id="back-to-dealers-btn"
            onClick={() => router.push('/admin/dealers/dashboard')}
            className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            title="Back to Dealers Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {dealer.name}
              </h1>
              <span className="font-mono text-xs sm:text-sm font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-200">
                {dealer.dealer_code}
              </span>
              {dealer.group?.group_name && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                  <Layers className="w-3 h-3 text-purple-500" />
                  <span>{dealer.group.group_name}</span>
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
              {dealer.shop_name && <span>{dealer.shop_name}</span>}
              {dealer.mobile && (
                <span className="flex items-center gap-1">
                  • <Phone className="w-3 h-3 text-slate-400" /> {dealer.mobile}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="btn-base btn-secondary text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer"
            title="Refresh payment records"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 3 Metrics Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Total Transactions */}
        <div className="bg-white border border-slate-200 shadow-xs p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Transactions
            </p>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              {summary.totalTransactions}
            </h3>
            <p className="text-xs text-slate-400 mt-1">Payment records for this dealer</p>
          </div>
          <div className="w-12 h-12 bg-slate-100 border border-slate-200 text-slate-700 rounded-xl flex items-center justify-center shrink-0">
            <Receipt className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Total LE Credit */}
        <div className="bg-white border border-indigo-100 shadow-xs p-5 rounded-2xl flex items-center justify-between ring-1 ring-indigo-500/10">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
              <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">
                Total LE Credit
              </p>
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-indigo-900 mt-1 flex items-center">
              <span className="text-lg font-bold mr-0.5">₹</span>
              {summary.leCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-indigo-500/80 mt-1">Lakshmi Enterprises dealer balance</p>
          </div>
          <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Total SLSA Credit */}
        <div className="bg-white border border-purple-100 shadow-xs p-5 rounded-2xl flex items-center justify-between ring-1 ring-purple-500/10">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-600"></span>
              <p className="text-xs font-semibold text-purple-700 uppercase tracking-wider">
                Total SLSA Credit
              </p>
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-purple-900 mt-1 flex items-center">
              <span className="text-lg font-bold mr-0.5">₹</span>
              {summary.slsaCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-purple-500/80 mt-1">SLSA firm dealer balance</p>
          </div>
          <div className="w-12 h-12 bg-purple-50 border border-purple-100 text-purple-600 rounded-xl flex items-center justify-center shrink-0">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:max-w-2xl">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search notes, bill #, method, amount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input pl-9 pr-4 py-2 text-xs sm:text-sm w-full rounded-lg border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          {/* Firm Filter */}
          <select
            value={selectedFirm}
            onChange={(e) => setSelectedFirm(e.target.value)}
            className="form-input py-2 px-3 text-xs sm:text-sm rounded-lg border-slate-200 bg-white font-medium text-slate-700 focus:border-indigo-500"
          >
            <option value="ALL">All Firms (LE &amp; SLSA)</option>
            <option value="LE">LE Only</option>
            <option value="SLSA">SLSA Only</option>
          </select>

          {/* Payment Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="form-input py-2 px-3 text-xs sm:text-sm rounded-lg border-slate-200 bg-white font-medium text-slate-700 focus:border-indigo-500 capitalize"
          >
            <option value="ALL">All Payment Types</option>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="cheque">Cheque</option>
            <option value="others">Others</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 self-end sm:self-center shrink-0">
          Showing <span className="font-semibold text-slate-800">{filteredPayments.length}</span> of{' '}
          <span className="font-semibold text-slate-800">{payments.length}</span> records
        </div>
      </div>

      {/* Payment Transactions List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">Dealer Payment Ledger</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {filteredPayments.length}
            </span>
          </div>
          <div className="text-xs text-slate-500">
            Records from <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">order_payments</code>
          </div>
        </div>

        {filteredPayments.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Receipt className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No Payment Records Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery || selectedFirm !== 'ALL' || selectedType !== 'ALL'
                ? 'No transactions match your search/filter criteria.'
                : 'There are currently no payment records recorded for this dealer.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-4">Date &amp; Time</th>
                    <th className="py-3.5 px-4">Firm</th>
                    <th className="py-3.5 px-4">Calculation Type</th>
                    <th className="py-3.5 px-4">Payment Type</th>
                    <th className="py-3.5 px-4 text-right">Amount (₹)</th>
                    <th className="py-3.5 px-4">Notes / Bill Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Date & Time */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{formatDateTime(p.created_at)}</span>
                        </div>
                      </td>

                      {/* Firm (LE or SLSA) */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getFirmBadge(p.firm)}
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

                      {/* Notes & Bill */}
                      <td className="py-3.5 px-4 text-slate-600 max-w-sm">
                        <div className="flex flex-col gap-0.5">
                          {p.order?.order_number && (
                            <span className="font-mono text-indigo-600 font-semibold text-[11px] flex items-center gap-1">
                              <span>Bill #{p.order.order_number}</span>
                            </span>
                          )}
                          <span className="truncate">{p.notes || <span className="text-slate-400 italic">None</span>}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredPayments.map((p) => (
                <div key={p.id} className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatDateTime(p.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {getFirmBadge(p.firm)}
                      {getPaymentTypeBadge(p.payment_type)}
                    </div>
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

                  {p.notes && (
                    <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
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
    </main>
  );
}

export default function AdminDealerPaymentsPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <AdminHeader />

      <div className="flex-1 flex flex-col md:flex-row">
        <AdminSidebar />

        <Suspense
          fallback={
            <div className="flex-1 p-8 text-center text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
              Loading dealer payments...
            </div>
          }
        >
          <DealerPaymentsContent />
        </Suspense>
      </div>
    </div>
  );
}
