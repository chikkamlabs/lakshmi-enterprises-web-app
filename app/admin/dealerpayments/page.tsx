'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AdminHeader from '../header/page';
import AdminSidebar from '../sidebar/page';
import {
  getDealerPayments,
  getDealerBills,
  addDealerTransaction,
  DealerPaymentItem,
  DealerPaymentSummary,
  DealerBillItem,
  PaymentType,
  SelectedBillReduction,
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
  Plus,
  CheckCircle2,
  X,
  Check,
  FileText,
  Trash2,
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

  // Transaction Modal State
  const [showTransactionModal, setShowTransactionModal] = useState<boolean>(false);
  const [txPaymentAmount, setTxPaymentAmount] = useState<string>('');
  const [txPaymentType, setTxPaymentType] = useState<PaymentType>('cash');
  const [txFirm, setTxFirm] = useState<string>('LE');
  const [txNotes, setTxNotes] = useState<string>('');
  const [dealerBills, setDealerBills] = useState<DealerBillItem[]>([]);
  const [selectedBillIds, setSelectedBillIds] = useState<string[]>([]);
  const [billReductionAmounts, setBillReductionAmounts] = useState<Record<string, string>>({});
  const [isLoadingBills, setIsLoadingBills] = useState<boolean>(false);
  const [billFilterNonZeroOnly, setBillFilterNonZeroOnly] = useState<boolean>(true);
  const [isSubmittingTx, setIsSubmittingTx] = useState<boolean>(false);
  const [txError, setTxError] = useState<string>('');
  const [txSuccess, setTxSuccess] = useState<string>('');

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

  // Open Transaction Modal & Load Dealer Bills
  const handleOpenTransactionModal = async () => {
    setTxPaymentAmount('');
    setTxPaymentType('cash');
    setTxFirm('LE');
    setTxNotes('');
    setSelectedBillIds([]);
    setBillReductionAmounts({});
    setTxError('');
    setBillFilterNonZeroOnly(true);
    setShowTransactionModal(true);
    setIsLoadingBills(true);

    try {
      // Fetch bills for dealer with last created_at first (all bills, client filters non-zero)
      const bills = await getDealerBills(dealerId, false);
      setDealerBills(bills);
    } catch (err) {
      console.error('Error loading bills for modal:', err);
    } finally {
      setIsLoadingBills(false);
    }
  };

  // Filtered bills for selection in modal (default to balance_amount != 0)
  const displayedBills = useMemo(() => {
    if (billFilterNonZeroOnly) {
      return dealerBills.filter((b) => Number(b.balance_amount ?? 0) !== 0);
    }
    return dealerBills;
  }, [dealerBills, billFilterNonZeroOnly]);

  // Calculate parsed totals
  const parsedTxPayment = parseFloat(txPaymentAmount) || 0;

  // Sum of individual bill reductions
  const totalAllocatedReduction = useMemo(() => {
    return selectedBillIds.reduce((sum, billId) => {
      const amt = parseFloat(billReductionAmounts[billId] || '0') || 0;
      return sum + amt;
    }, 0);
  }, [selectedBillIds, billReductionAmounts]);

  const remainingTxAmount = Math.max(0, parsedTxPayment - totalAllocatedReduction);

  // Handle bill selection toggle (Multi-select)
  const handleToggleSelectBill = (bill: DealerBillItem) => {
    const isCurrentlySelected = selectedBillIds.includes(bill.id);
    if (isCurrentlySelected) {
      setSelectedBillIds((prev) => prev.filter((id) => id !== bill.id));
      setBillReductionAmounts((prev) => {
        const next = { ...prev };
        delete next[bill.id];
        return next;
      });
    } else {
      setSelectedBillIds((prev) => [...prev, bill.id]);
      // Default suggested reduction for this bill: min of (remaining unallocated, bill.balance_amount) or bill.balance_amount
      const currentBal = Math.max(0, Number(bill.balance_amount ?? 0));
      const availToAllocate = Math.max(0, parsedTxPayment - totalAllocatedReduction);
      const suggested = availToAllocate > 0 ? Math.min(availToAllocate, currentBal) : currentBal;
      
      setBillReductionAmounts((prev) => ({
        ...prev,
        [bill.id]: suggested > 0 ? suggested.toString() : (currentBal > 0 ? currentBal.toString() : '0'),
      }));
    }
  };

  // Handle individual bill reduction amount change
  const handleBillReductionChange = (billId: string, val: string) => {
    setBillReductionAmounts((prev) => ({
      ...prev,
      [billId]: val,
    }));
  };

  // Quick action: Set reduction to full bill balance
  const handleSetFullBillBalance = (bill: DealerBillItem) => {
    const fullBal = Math.max(0, Number(bill.balance_amount ?? 0));
    setBillReductionAmounts((prev) => ({
      ...prev,
      [bill.id]: fullBal.toString(),
    }));
  };

  // Quick action: Allocate remaining transaction amount to this bill
  const handleAllocateRemainingToBill = (bill: DealerBillItem) => {
    const currentAllocOther = selectedBillIds
      .filter((id) => id !== bill.id)
      .reduce((sum, id) => sum + (parseFloat(billReductionAmounts[id] || '0') || 0), 0);
    const remaining = Math.max(0, parsedTxPayment - currentAllocOther);
    const currentBal = Math.max(0, Number(bill.balance_amount ?? 0));
    const toAllocate = currentBal > 0 ? Math.min(remaining, currentBal) : remaining;

    setBillReductionAmounts((prev) => ({
      ...prev,
      [bill.id]: toAllocate.toString(),
    }));
  };

  // Submit Transaction "Done" handler
  const handleDoneTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dealer) return;

    if (parsedTxPayment <= 0) {
      setTxError('Please enter a valid payment amount greater than zero.');
      return;
    }

    if (totalAllocatedReduction > parsedTxPayment) {
      setTxError(
        `Total allocated to bills (₹${totalAllocatedReduction.toLocaleString('en-IN', {
          minimumFractionDigits: 2,
        })}) cannot exceed the transaction payment amount (₹${parsedTxPayment.toLocaleString('en-IN', {
          minimumFractionDigits: 2,
        })}).`
      );
      return;
    }

    // Verify all selected bills have valid amounts
    const selectedReductions: SelectedBillReduction[] = [];
    for (const billId of selectedBillIds) {
      const bill = dealerBills.find((b) => b.id === billId);
      if (!bill) continue;
      const redAmt = parseFloat(billReductionAmounts[billId] || '0') || 0;
      if (redAmt < 0) {
        setTxError(`Reduction amount for Bill #${bill.order_number} cannot be negative.`);
        return;
      }
      if (redAmt > 0) {
        selectedReductions.push({
          billId: bill.id,
          orderNumber: bill.order_number,
          firm: bill.firm || 'LE',
          currentBalance: Number(bill.balance_amount ?? 0),
          reduceAmount: redAmt,
        });
      }
    }

    setIsSubmittingTx(true);
    setTxError('');

    try {
      const res = await addDealerTransaction({
        dealerId: dealer.id,
        paymentAmount: parsedTxPayment,
        paymentType: txPaymentType,
        selectedBills: selectedReductions,
        firm: txFirm,
        notes: txNotes.trim() || null,
      });

      if (res.success) {
        // Update local dealer state & credits
        if (res.updatedDealer) {
          setDealer(res.updatedDealer);
          const leCredit = Number(res.updatedDealer.le_credit ?? res.updatedDealer.current_credit ?? 0);
          const slsaCredit = Number(res.updatedDealer.slsa_credit ?? 0);
          setSummary((prev) => ({
            ...prev,
            totalTransactions: prev.totalTransactions + (res.payments?.length || 1),
            leCredit,
            slsaCredit,
          }));
        }

        // Add payments to ledger
        if (res.payments && res.payments.length > 0) {
          setPayments((prev) => [...res.payments!, ...prev]);
        } else if (res.payment) {
          setPayments((prev) => [res.payment!, ...prev]);
        }

        setShowTransactionModal(false);

        const billCountMsg =
          selectedReductions.length > 0
            ? ` across ${selectedReductions.length} selected bill${selectedReductions.length > 1 ? 's' : ''}`
            : '';

        setTxSuccess(
          `Transaction of ₹${parsedTxPayment.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
          })} processed successfully${billCountMsg}!`
        );
        setTimeout(() => setTxSuccess(''), 6000);

        // Reload data to ensure complete consistency
        loadData();
      } else {
        setTxError(res.error || 'Failed to process transaction.');
      }
    } catch (err: unknown) {
      const e = err as Error;
      setTxError(e?.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmittingTx(false);
    }
  };

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
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="btn-base btn-secondary text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer"
            title="Refresh payment records"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {/* Transaction Button */}
          <button
            id="open-transaction-modal-btn"
            onClick={handleOpenTransactionModal}
            className="btn-base btn-primary text-xs sm:text-sm flex items-center gap-2 cursor-pointer shadow-sm px-4 py-2"
          >
            <Plus className="w-4 h-4" />
            <span className="font-bold">Transaction</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {txSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 text-emerald-900 text-sm animate-fade-in shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{txSuccess}</span>
          </div>
          <button
            onClick={() => setTxSuccess('')}
            className="text-emerald-700 hover:text-emerald-950 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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
                : 'There are currently no payment records recorded for this dealer. Tap "Transaction" to add one.'}
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

      {/* Small Overlay Screen / Transaction Modal */}
      {showTransactionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-5 sm:p-6 space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    Add Dealer Transaction
                  </h3>
                  <p className="text-xs text-slate-500">
                    {dealer.name} ({dealer.dealer_code}) • Debit credit balance
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTransactionModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Balances Context Banner */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs">
              <div className="flex items-center justify-between pr-2 border-r border-slate-200">
                <span className="text-slate-600 font-medium">LE Credit Balance:</span>
                <span className="font-mono font-bold text-indigo-700">
                  ₹{Number(dealer.le_credit ?? dealer.current_credit ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between pl-2">
                <span className="text-slate-600 font-medium">SLSA Credit Balance:</span>
                <span className="font-mono font-bold text-purple-700">
                  ₹{Number(dealer.slsa_credit ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {txError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{txError}</span>
              </div>
            )}

            {/* Transaction Form */}
            <form onSubmit={handleDoneTransaction} className="space-y-4">
              {/* Step 1: Payment Amount */}
              <div>
                <label className="form-label text-slate-700 font-bold block mb-1 text-xs">
                  Payment Amount (₹) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={txPaymentAmount}
                    onChange={(e) => setTxPaymentAmount(e.target.value)}
                    className="form-input w-full pl-9 pr-3 py-2.5 text-sm rounded-xl font-mono font-bold text-slate-900 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Step 2: Payment Type Selector */}
              <div>
                <label className="form-label text-slate-700 font-bold block mb-1.5 text-xs">
                  Payment Method <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['cash', 'upi', 'cheque', 'others'] as PaymentType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setTxPaymentType(type)}
                      className={`py-2 px-2.5 rounded-xl border text-xs font-semibold capitalize flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                        txPaymentType === type
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-800 font-bold shadow-2xs ring-1 ring-indigo-500/20'
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

              {/* Step 3: Select Bills (Multi-Select & Individual Reduction) */}
              <div className="space-y-3 pt-1 border-t border-slate-100">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <label className="form-label text-slate-800 font-bold text-xs flex items-center gap-1.5 mb-0">
                      <FileText className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Select Bills to Reduce (Multiple Allowed)</span>
                      <span className="text-[11px] font-normal text-slate-500">
                        • {selectedBillIds.length} selected
                      </span>
                    </label>
                    <p className="text-[11px] text-slate-400">
                      Select one or more bills and enter the specific amount to reduce for each.
                    </p>
                  </div>

                  {/* Filter toggle: Pending (Balance != 0) vs All Bills */}
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px] font-medium">
                    <button
                      type="button"
                      onClick={() => setBillFilterNonZeroOnly(true)}
                      className={`px-2.5 py-0.5 rounded-md transition-all cursor-pointer ${
                        billFilterNonZeroOnly
                          ? 'bg-white text-indigo-700 font-bold shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Pending (Bal ≠ 0)
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillFilterNonZeroOnly(false)}
                      className={`px-2.5 py-0.5 rounded-md transition-all cursor-pointer ${
                        !billFilterNonZeroOnly
                          ? 'bg-white text-indigo-700 font-bold shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All Bills ({dealerBills.length})
                    </button>
                  </div>
                </div>

                {/* Bills selection list container */}
                {isLoadingBills ? (
                  <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-indigo-600 mb-1" />
                    <span className="text-xs">Loading bills for this dealer...</span>
                  </div>
                ) : displayedBills.length === 0 ? (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-1">
                    <p className="text-xs text-slate-600 font-medium">
                      No bills found with {billFilterNonZeroOnly ? 'pending balance (balance_amount ≠ ₹0)' : 'this dealer'}.
                    </p>
                    {billFilterNonZeroOnly && dealerBills.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setBillFilterNonZeroOnly(false)}
                        className="text-xs text-indigo-600 hover:underline font-semibold cursor-pointer"
                      >
                        Click here to view all {dealerBills.length} bills
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1 border border-slate-200 rounded-xl p-2 bg-slate-50/50 divide-y divide-slate-100">
                    {displayedBills.map((b) => {
                      const isSelected = selectedBillIds.includes(b.id);
                      const currentRedAmount = billReductionAmounts[b.id] || '';
                      const parsedRed = parseFloat(currentRedAmount) || 0;
                      const newBillBal = Math.max(0, Number(b.balance_amount ?? 0) - parsedRed);

                      return (
                        <div
                          key={b.id}
                          className={`p-2.5 rounded-xl border transition-all space-y-2 text-xs ${
                            isSelected
                              ? 'bg-indigo-50/70 border-indigo-300 shadow-2xs ring-1 ring-indigo-500/20'
                              : 'bg-white border-slate-200/80 hover:bg-white/90 hover:border-slate-300'
                          }`}
                        >
                          {/* Top row: Checkbox, Bill #, Firm, Total, Current Balance */}
                          <div
                            onClick={() => handleToggleSelectBill(b)}
                            className="flex items-center justify-between gap-3 cursor-pointer select-none"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                  isSelected
                                    ? 'bg-indigo-600 border-indigo-600 text-white'
                                    : 'border-slate-300 bg-white'
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-slate-900 truncate">
                                    Bill #{b.order_number}
                                  </span>
                                  {getFirmBadge(b.firm)}
                                </div>
                                <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                  <Clock className="w-3 h-3" />
                                  <span>{formatDateTime(b.created_at)}</span>
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <div className="text-[11px] text-slate-500">
                                Total: <span className="font-mono font-semibold text-slate-700">₹{b.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                              </div>
                              <div className="font-mono font-bold text-xs">
                                Bal:{' '}
                                <span className={b.balance_amount > 0 ? 'text-amber-700 font-extrabold' : 'text-emerald-700'}>
                                  ₹{b.balance_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* If Selected: Individual Amount to Reduce for this bill */}
                          {isSelected && (
                            <div className="pt-2 border-t border-indigo-100/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white/90 p-2.5 rounded-lg border border-indigo-200">
                              <div className="flex-1">
                                <div className="flex items-center justify-between text-[11px] font-semibold text-indigo-950 mb-1">
                                  <span>Amount to reduce from this bill:</span>
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSetFullBillBalance(b);
                                      }}
                                      className="text-[10px] bg-indigo-100 hover:bg-indigo-200 text-indigo-800 px-1.5 py-0.5 rounded font-bold cursor-pointer transition-colors"
                                    >
                                      Full Bal (₹{b.balance_amount})
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAllocateRemainingToBill(b);
                                      }}
                                      className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-medium cursor-pointer transition-colors"
                                    >
                                      Max Avail
                                    </button>
                                  </div>
                                </div>
                                <div className="relative">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                                    ₹
                                  </span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="0.00"
                                    value={currentRedAmount}
                                    onChange={(e) => handleBillReductionChange(b.id, e.target.value)}
                                    className="form-input w-full pl-7 pr-3 py-1.5 text-xs rounded-md font-mono font-bold text-slate-900 border-indigo-200 focus:border-indigo-600 focus:ring-indigo-600 bg-white"
                                  />
                                </div>
                              </div>

                              <div className="sm:text-right shrink-0 text-[11px] bg-slate-50 p-1.5 rounded sm:bg-transparent sm:p-0">
                                <span className="text-slate-500">New Bill Bal: </span>
                                <span className="font-mono font-bold text-slate-800">
                                  ₹{newBillBal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Step 4: Multi-Bill Allocation & Remaining Summary Bar */}
                <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div className="bg-white p-2 rounded-lg border border-indigo-100">
                      <div className="text-[11px] text-slate-500 font-medium">Transaction Amount:</div>
                      <div className="font-mono font-bold text-slate-900">
                        ₹{parsedTxPayment.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div className="bg-white p-2 rounded-lg border border-indigo-100">
                      <div className="text-[11px] text-slate-500 font-medium">
                        Allocated to Bills ({selectedBillIds.length}):
                      </div>
                      <div className="font-mono font-bold text-indigo-700">
                        ₹{totalAllocatedReduction.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div className="bg-white p-2 rounded-lg border border-indigo-100">
                      <div className="text-[11px] text-slate-500 font-medium">Remaining Amount:</div>
                      <div
                        className={`font-mono font-extrabold ${
                          totalAllocatedReduction > parsedTxPayment
                            ? 'text-red-600'
                            : 'text-emerald-700'
                        }`}
                      >
                        ₹{remainingTxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  {totalAllocatedReduction > parsedTxPayment && (
                    <p className="text-[11px] text-red-600 font-semibold">
                      ⚠️ Total allocated reductions exceed the transaction payment amount.
                    </p>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="form-label text-slate-700 font-bold block mb-1 text-xs">
                  Transaction Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Cheque number, reference ID, or remarks..."
                  value={txNotes}
                  onChange={(e) => setTxNotes(e.target.value)}
                  className="form-input w-full p-2.5 text-xs rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              {/* Actions: Cancel & Done */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowTransactionModal(false)}
                  disabled={isSubmittingTx}
                  className="btn-base btn-secondary text-xs px-4 py-2.5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTx || (totalAllocatedReduction > parsedTxPayment && parsedTxPayment > 0)}
                  className="btn-base btn-primary text-xs px-5 py-2.5 flex items-center gap-1.5 cursor-pointer font-bold disabled:opacity-50"
                >
                  {isSubmittingTx ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Done</span>
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
