'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  Calendar,
  Store,
  Clock,
  Plus,
  Loader2,
  RefreshCw,
  Edit3,
  Lock,
  ChevronRight,
  ShoppingBag,
} from 'lucide-react';
import { getAssociateOrdersList, getDealersForOrder } from '../../../lib/createOrder';
import { Dealer } from '../../../lib/dealersStore';
import { getStoredGroups, Group } from '../../../lib/groupsStore';
import AssociateHeader from '../header/page';
import AssociateBottomNavigation from '../buttomnavigation/page';

function getLast3WeeksRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 21);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
}

export default function AssociateOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters state with default last 3 weeks
  const [firmFilter, setFirmFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>(() => getLast3WeeksRange().startDate);
  const [endDate, setEndDate] = useState<string>(() => getLast3WeeksRange().endDate);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDealerId, setSelectedDealerId] = useState<string>('ALL');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('ALL');
  const [associateStatusFilter, setAssociateStatusFilter] = useState<string>('ALL');
  const [approvingStatusFilter, setApprovingStatusFilter] = useState<string>('ALL');
  const [packingStatusFilter, setPackingStatusFilter] = useState<string>('ALL');

  // Dealers & Groups for filter dropdown
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [showFilters, setShowFilters] = useState<boolean>(false);

  useEffect(() => {
    async function loadFilterData() {
      try {
        const [dData, gData] = await Promise.all([
          getDealersForOrder(),
          getStoredGroups(),
        ]);
        setDealers(dData);
        setGroups(gData);
      } catch (err) {
        console.warn('Error loading filter options:', err);
      }
    }
    loadFilterData();
  }, []);

  // Fetch orders when filters change
  useEffect(() => {
    let isMounted = true;
    async function loadOrders() {
      setLoading(true);
      try {
        const data = await getAssociateOrdersList({
          firm: firmFilter,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          search: searchQuery || undefined,
          dealerId: selectedDealerId,
          groupId: selectedGroupId,
          associateStatus: associateStatusFilter,
          approvingStatus: approvingStatusFilter,
          packingStatus: packingStatusFilter,
        });
        if (isMounted) {
          setOrders(data);
        }
      } catch (err) {
        console.error('Error loading orders:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadOrders();

    return () => {
      isMounted = false;
    };
  }, [
    firmFilter,
    startDate,
    endDate,
    searchQuery,
    selectedDealerId,
    selectedGroupId,
    associateStatusFilter,
    approvingStatusFilter,
    packingStatusFilter,
  ]);

  // Calculate Total Sale and Balance Amount for resulted orders
  const { totalSale, totalBalance } = useMemo(() => {
    let sale = 0;
    let balance = 0;
    for (const o of orders) {
      const s = Number(o.total_amount) || 0;
      const b =
        o.balance_amount !== undefined && o.balance_amount !== null
          ? Number(o.balance_amount)
          : o.pending_amount !== undefined && o.pending_amount !== null
          ? Number(o.pending_amount)
          : (Number(o.total_amount) || 0) - (Number(o.received_amount) || 0);
      sale += s;
      balance += isNaN(b) ? 0 : b;
    }
    return { totalSale: sale, totalBalance: balance };
  }, [orders]);

  // Helper for Associate Status (AS) Tag
  const renderASTag = (status: string) => {
    const isDraft = status === 'Draft';
    return (
      <span
        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${
          isDraft
            ? 'bg-amber-100 text-amber-900 border-amber-300'
            : 'bg-emerald-100 text-emerald-900 border-emerald-300'
        }`}
        title={`Associate Status: ${status}`}
      >
        AS: {status || 'Draft'}
      </span>
    );
  };

  // Helper for Approving Status (APS) Tag
  const renderAPSTag = (status: string) => {
    let style = 'bg-red-100 text-red-900 border-red-300';
    let label = 'Pending';

    if (status === 'Partially Approved' || status === 'Partial Approved') {
      style = 'bg-amber-100 text-amber-900 border-amber-300';
      label = 'Partial Approved';
    } else if (status === 'Approved' || status === 'Fully Approved') {
      style = 'bg-emerald-100 text-emerald-900 border-emerald-300';
      label = 'Fully Approved';
    }

    return (
      <span
        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${style}`}
        title={`Approving Status: ${status}`}
      >
        APS: {label}
      </span>
    );
  };

  // Helper for Packing Status (PS) Tag (Shown only if APS is partially/fully approved)
  const renderPSTag = (status: string) => {
    let style = 'bg-red-100 text-red-900 border-red-300';
    let label = 'Pending';

    if (status === 'partially_packed' || status === 'Partial Packing') {
      style = 'bg-amber-100 text-amber-900 border-amber-300';
      label = 'Partial Packing';
    } else if (status === 'Packed' || status === 'Fully Packing' || status === 'Fully Packed') {
      style = 'bg-emerald-100 text-emerald-900 border-emerald-300';
      label = 'Fully Packing';
    }

    return (
      <span
        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${style}`}
        title={`Packing Status: ${status}`}
      >
        PS: {label}
      </span>
    );
  };

  // Format date and time
  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const dt = new Date(dateStr);
      return (
        dt.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }) +
        ' ' +
        dt.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      );
    } catch {
      return dateStr;
    }
  };

  // Format date only
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const dt = new Date(dateStr);
      return dt.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 pb-20">
      {/* Header */}
      <AssociateHeader />

      {/* Sticky Top Bar with Title & Quick Search */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 py-2 shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <ShoppingBag className="w-4 h-4 text-indigo-600" />
            <h1 className="text-sm font-bold text-slate-900">Associate Orders</h1>
            <span className="badge badge-info text-[10px] font-bold px-2 py-0.5 ml-1">
              {orders.length} {orders.length === 1 ? 'Order' : 'Orders'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors ${
                showFilters || firmFilter !== 'ALL' || startDate || endDate || selectedDealerId !== 'ALL' || selectedGroupId !== 'ALL' || associateStatusFilter !== 'ALL' || approvingStatusFilter !== 'ALL' || packingStatusFilter !== 'ALL'
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Filters</span>
            </button>

            <Link
              href="/associate/createorder"
              className="btn-base btn-primary text-xs py-1.5 px-2.5 rounded-lg font-bold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Order</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-3 space-y-3">
        {/* Search Bar & Date Picker Panel */}
        <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-xs space-y-2.5">
          {/* Main Quick Search */}
          <div className="input-group">
            <Search className="input-icon-left w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Order #, Dealer Name or Code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field has-left-icon text-xs py-1.5"
            />
          </div>

          {/* Date Selector Row */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">From Date</label>
              <div className="relative">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-md text-xs px-2 py-1 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">To Date</label>
              <div className="relative">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-md text-xs px-2 py-1 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Total Sale & Balance Amount Cards (Right Below Dates) */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="bg-emerald-50/90 border border-emerald-200 rounded-lg p-2.5 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                Total Sale
              </span>
              <div className="text-sm sm:text-base font-extrabold text-emerald-950 font-mono tracking-tight mt-0.5">
                ₹{totalSale.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="bg-amber-50/90 border border-amber-200 rounded-lg p-2.5 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                Balance Amount
              </span>
              <div className="text-sm sm:text-base font-extrabold text-amber-950 font-mono tracking-tight mt-0.5">
                ₹{totalBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Collapsible Extended Filters (Firm, Dealer, Group & Status Filters) */}
          {(showFilters || firmFilter !== 'ALL' || selectedDealerId !== 'ALL' || selectedGroupId !== 'ALL' || associateStatusFilter !== 'ALL' || approvingStatusFilter !== 'ALL' || packingStatusFilter !== 'ALL') && (
            <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2 text-xs animate-fade-in">
              {/* Firm Type Filter */}
              <div>
                <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Firm Type</label>
                <select
                  value={firmFilter}
                  onChange={(e) => setFirmFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-md text-xs px-2 py-1 focus:outline-none focus:border-indigo-500 font-semibold"
                >
                  <option value="ALL">All Firms</option>
                  <option value="LE">LE (Lakshmi Enterprises)</option>
                  <option value="SLSA">SLSA</option>
                </select>
              </div>

              {/* Dealer Filter */}
              <div>
                <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Select Dealer</label>
                <select
                  value={selectedDealerId}
                  onChange={(e) => setSelectedDealerId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-md text-xs px-2 py-1 focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">All Dealers</option>
                  {dealers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.dealer_code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Group Filter */}
              <div>
                <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Dealer Group</label>
                <select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-md text-xs px-2 py-1 focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">All Groups</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.group_name} ({g.group_id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Associate Status Filter */}
              <div>
                <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Associate Status (AS)</label>
                <select
                  value={associateStatusFilter}
                  onChange={(e) => setAssociateStatusFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-md text-xs px-2 py-1 focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">All AS</option>
                  <option value="Draft">Draft</option>
                  <option value="Submitted">Submitted</option>
                </select>
              </div>

              {/* Approving Status Filter */}
              <div>
                <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Approving Status (APS)</label>
                <select
                  value={approvingStatusFilter}
                  onChange={(e) => setApprovingStatusFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-md text-xs px-2 py-1 focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">All APS</option>
                  <option value="Pending">Pending</option>
                  <option value="Partially Approved">Partial Approved</option>
                  <option value="Approved">Fully Approved</option>
                </select>
              </div>

              {/* Packing Status Filter */}
              <div>
                <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Packing Status (PS)</label>
                <select
                  value={packingStatusFilter}
                  onChange={(e) => setPackingStatusFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-md text-xs px-2 py-1 focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">All PS</option>
                  <option value="Pending">Pending</option>
                  <option value="partially_packed">Partial Packing</option>
                  <option value="Packed">Fully Packing</option>
                </select>
              </div>

              {/* Clear Filters Button */}
              <div className="sm:col-span-2 lg:col-span-6 flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const range = getLast3WeeksRange();
                    setFirmFilter('ALL');
                    setStartDate(range.startDate);
                    setEndDate(range.endDate);
                    setSearchQuery('');
                    setSelectedDealerId('ALL');
                    setSelectedGroupId('ALL');
                    setAssociateStatusFilter('ALL');
                    setApprovingStatusFilter('ALL');
                    setPackingStatusFilter('ALL');
                  }}
                  className="text-[11px] text-indigo-600 hover:underline font-semibold"
                >
                  Reset All Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="p-8 text-center bg-white rounded-lg border border-slate-200 shadow-xs space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto" />
            <p className="text-xs text-slate-500">Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-lg border border-slate-200 shadow-xs space-y-3">
            <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto" />
            <div>
              <p className="text-sm font-bold text-slate-700">No orders found</p>
              <p className="text-xs text-slate-500 mt-0.5">Try adjusting your filters or date range</p>
            </div>
            <Link
              href="/associate/createorder"
              className="inline-flex items-center gap-1.5 btn-base btn-primary text-xs py-1.5 px-3"
            >
              <Plus className="w-3.5 h-3.5" /> Create New Order
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {orders.map((order) => {
              const showPS =
                order.approving_status === 'Partially Approved' ||
                order.approving_status === 'Partial Approved' ||
                order.approving_status === 'Approved' ||
                order.approving_status === 'Fully Approved';

              const isPendingApproval = order.approving_status === 'Pending';
              const isSlsa = order.firm === 'SLSA';

              return (
                <Link
                  key={order.id}
                  href={`/associate/createorder?id=${order.id}`}
                  className="block bg-white rounded-lg border border-slate-200 p-3 shadow-xs hover:border-indigo-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    {/* Order ID & Dealer */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 font-mono">
                          {order.order_number || order.id}
                        </span>
                        <span
                          className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold border ${
                            isSlsa
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          }`}
                        >
                          {order.firm || 'LE'}
                        </span>
                        {isPendingApproval ? (
                          <span className="inline-flex items-center text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded font-medium">
                            <Edit3 className="w-3 h-3 mr-0.5" /> Editable
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded font-medium">
                            <Lock className="w-3 h-3 mr-0.5" /> Locked
                          </span>
                        )}
                      </div>

                      <div className="text-xs font-semibold text-slate-800 truncate flex items-center gap-1">
                        <Store className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{order.dealer?.name || 'Dealer N/A'}</span>
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                  </div>

                  {/* Order Financials & Delivered Date */}
                  <div className="mt-2 pt-2 border-t border-slate-100 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block leading-tight">Amount</span>
                      <span className="font-bold text-slate-900 font-mono text-xs">
                        ₹{Number(order.amount ?? order.total_amount ?? 0).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 block leading-tight">Balance</span>
                      <span className="font-bold text-rose-600 font-mono text-xs">
                        ₹{Number(
                          order.balance_amount ??
                            order.pending_amount ??
                            ((Number(order.total_amount) || 0) - (Number(order.received_amount) || 0))
                        ).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 block leading-tight">Delivered Date</span>
                      <span className="font-medium text-slate-700 font-mono text-[11px]">
                        {order.delivered_date ? formatDate(order.delivered_date) : '-'}
                      </span>
                    </div>
                  </div>

                  {/* Status Tags Row & Very Small Date Time */}
                  <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    {/* Status Tags */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* AS Tag */}
                      {renderASTag(order.associate_status)}

                      {/* APS Tag */}
                      {renderAPSTag(order.approving_status)}

                      {/* PS Tag (Show ONLY IF APS is partially or fully approved) */}
                      {showPS && renderPSTag(order.packing_status)}
                    </div>

                    {/* Date and Time (Very small) */}
                    <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5 text-slate-400" />
                      {formatDateTime(order.created_at)}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      {/* Sticky Bottom Navigation */}
      <AssociateBottomNavigation />
    </div>
  );
}
