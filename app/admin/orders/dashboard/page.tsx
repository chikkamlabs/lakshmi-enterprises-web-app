'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AdminHeader from '../../header/page';
import AdminSidebar from '../../sidebar/page';
import {
  getOrders,
  Order,
  OrderFilters,
  ApprovingStatus,
  PackingStatus,
} from '@/lib/ordersStore';
import { getStoredDealers, Dealer } from '@/lib/dealersStore';
import { getStoredAssociates, Associate } from '@/lib/associatesStore';
import { getStoredGroups, Group } from '@/lib/groupsStore';
import {
  ShoppingCart,
  Calendar,
  Filter,
  Search,
  RefreshCw,
  Loader2,
  ExternalLink,
  UserCheck,
  Building2,
  FileText,
  IndianRupee,
  Clock,
  CheckCircle2,
  Package,
  PackageCheck,
  PackageX,
  AlertTriangle,
  Layers,
  Building,
  Users,
  CreditCard,
} from 'lucide-react';

const getTodayDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getLastThreeWeeksDateString = () => {
  const d = new Date();
  d.setDate(d.getDate() - 21);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function OrdersDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filter States (Firm option added, dates default to last 3 weeks)
  const [fromDate, setFromDate] = useState<string>(searchParams?.get('from') ?? getLastThreeWeeksDateString());
  const [toDate, setToDate] = useState<string>(searchParams?.get('to') ?? getTodayDateString());
  const [firm, setFirm] = useState<string>(searchParams?.get('firm') || 'ALL');
  const [approvingStatus, setApprovingStatus] = useState<string>('ALL');
  const [packingStatus, setPackingStatus] = useState<string>('ALL');
  const [selectedGroupId, setSelectedGroupId] = useState<string>(searchParams?.get('groupId') || 'ALL');
  const [selectedDealerId, setSelectedDealerId] = useState<string>('ALL');
  const [selectedAssociateId, setSelectedAssociateId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Data States
  const [orders, setOrders] = useState<Order[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [associates, setAssociates] = useState<Associate[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Current timestamp initialized once per mount for pure render comparisons
  const [currentTimestamp] = useState<number>(() => Date.now());

  // Helper to determine if delivered_date > 15 days from now and balance_amount > 0
  const isDeliveredOverdue = (deliveredDateStr?: string | null, balance?: number) => {
    const bal = Number(balance || 0);
    if (bal <= 0 || !deliveredDateStr) return false;
    try {
      const deliveredTime = new Date(deliveredDateStr).getTime();
      if (isNaN(deliveredTime)) return false;
      const diffDays = (currentTimestamp - deliveredTime) / (1000 * 60 * 60 * 24);
      return diffDays > 15;
    } catch {
      return false;
    }
  };

  // Load initial metadata options (dealers, associates, groups)
  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      setIsLoading(true);
      setError('');
      try {
        const [dealersData, associatesData, groupsData] = await Promise.all([
          getStoredDealers(),
          getStoredAssociates(),
          getStoredGroups(),
        ]);

        if (isMounted) {
          setDealers(dealersData);
          setAssociates(associatesData);
          setGroups(groupsData);
        }
      } catch (err) {
        console.error('Failed to load metadata for filters:', err);
      }
    }

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  const [refreshKey, setRefreshKey] = useState<number>(0);

  const fetchFilteredOrders = () => {
    setRefreshKey((prev) => prev + 1);
  };

  useEffect(() => {
    let isMounted = true;

    async function loadOrders() {
      setIsLoading(true);
      setError('');
      try {
        const filters: OrderFilters = {
          firm,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          associateStatus: 'Submitted', // ALWAYS filter submitted orders only
          approvingStatus,
          packingStatus,
          groupId: selectedGroupId,
          dealerId: selectedDealerId,
          associateId: selectedAssociateId,
        };

        const data = await getOrders(filters);
        if (isMounted) {
          // Filter strictly submitted orders
          const submittedOnly = (data || []).filter((o) => o.associate_status === 'Submitted');
          setOrders(submittedOnly);
        }
      } catch (err: unknown) {
        console.error('Error fetching orders:', err);
        if (isMounted) {
          setError('Could not load submitted orders list.');
          setOrders([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadOrders();

    return () => {
      isMounted = false;
    };
  }, [firm, fromDate, toDate, approvingStatus, packingStatus, selectedGroupId, selectedDealerId, selectedAssociateId, refreshKey]);

  // Client-side text search
  const filteredOrders = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return orders;

    return orders.filter((o) => {
      const num = (o.order_number || '').toLowerCase();
      const dealer = (o.dealer?.name || o.dealer?.shop_name || '').toLowerCase();
      const associate = (o.associate?.name || '').toLowerCase();
      const groupName = (o.dealer?.group?.group_name || '').toLowerCase();
      const notes = (o.notes || '').toLowerCase();
      const firmStr = (o.firm || 'LE').toLowerCase();

      return (
        num.includes(q) ||
        dealer.includes(q) ||
        associate.includes(q) ||
        groupName.includes(q) ||
        notes.includes(q) ||
        firmStr.includes(q)
      );
    });
  }, [orders, searchQuery]);

  // Total order value calculation for selected orders
  const totalOrdersAmount = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  }, [filteredOrders]);

  const clearFilters = () => {
    setFromDate(getLastThreeWeeksDateString());
    setToDate(getTodayDateString());
    setFirm('ALL');
    setApprovingStatus('ALL');
    setPackingStatus('ALL');
    setSelectedGroupId('ALL');
    setSelectedDealerId('ALL');
    setSelectedAssociateId('ALL');
    setSearchQuery('');
  };

  // Helper badge renderers for approving and packing statuses
  const renderApprovingStatusBadge = (status: ApprovingStatus) => {
    switch (status) {
      case 'Approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Approved
          </span>
        );
      case 'Partially Approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            Partially Approved
          </span>
        );
      case 'Pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
            <Clock className="w-3 h-3 text-orange-500" />
            Pending Approval
          </span>
        );
    }
  };

  const renderPackingStatusBadge = (status: PackingStatus) => {
    switch (status) {
      case 'Packed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <PackageCheck className="w-3 h-3 text-purple-600" />
            Packed
          </span>
        );
      case 'partially_packed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
            <PackageX className="w-3 h-3 text-indigo-500" />
            Partially Packed
          </span>
        );
      case 'Pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <Clock className="w-3 h-3 text-slate-400" />
            Pending Packing
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 text-white flex items-center justify-center shadow-xs shrink-0">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Submitted Orders
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                Total Orders: {isLoading ? '...' : filteredOrders.length}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center gap-1">
                <IndianRupee className="w-3 h-3" />
                Value: ₹{totalOrdersAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Review and manage associate-submitted dealer orders, approve quantities, and assign packing staff.
            </p>
          </div>
        </div>

        {/* Top Right Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={fetchFilteredOrders}
            disabled={isLoading}
            className="btn-base btn-secondary text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer hover:border-indigo-300 transition-colors"
            title="Refresh orders list"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Clean Filters Card with Sub-borders */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <Filter className="w-4 h-4" />
            </div>
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Order Filters
            </h2>
          </div>
          {(fromDate || toDate || approvingStatus !== 'ALL' || packingStatus !== 'ALL' || selectedDealerId !== 'ALL' || selectedAssociateId !== 'ALL' || searchQuery) && (
            <button
              onClick={clearFilters}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer px-2 py-1 rounded-md hover:bg-indigo-50"
            >
              Reset All Filters
            </button>
          )}
        </div>

        {/* Filter Inputs Grid with Sub-borders */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {/* Firm Select Dropdown */}
          <div className="bg-slate-50/70 border border-slate-200/90 rounded-xl p-3 hover:border-slate-300 focus-within:border-indigo-500 focus-within:bg-white transition-all space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">Firm</label>
            <select
              value={firm}
              onChange={(e) => setFirm(e.target.value)}
              className="w-full py-1.5 px-2.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="ALL">All Firms (LE &amp; SLSA)</option>
              <option value="LE">LE (Lakshmi Enterprises)</option>
              <option value="SLSA">SLSA</option>
            </select>
          </div>

          {/* Group Select Dropdown */}
          <div className="bg-slate-50/70 border border-slate-200/90 rounded-xl p-3 hover:border-slate-300 focus-within:border-indigo-500 focus-within:bg-white transition-all space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">Group</label>
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="w-full py-1.5 px-2.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="ALL">All Groups</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.group_name} ({g.group_id})
                </option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div className="bg-slate-50/70 border border-slate-200/90 rounded-xl p-3 hover:border-slate-300 focus-within:border-indigo-500 focus-within:bg-white transition-all space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">From Date</label>
            <div className="relative">
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full pl-8 pr-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Date To */}
          <div className="bg-slate-50/70 border border-slate-200/90 rounded-xl p-3 hover:border-slate-300 focus-within:border-indigo-500 focus-within:bg-white transition-all space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">To Date</label>
            <div className="relative">
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full pl-8 pr-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Approving Status Dropdown */}
          <div className="bg-slate-50/70 border border-slate-200/90 rounded-xl p-3 hover:border-slate-300 focus-within:border-indigo-500 focus-within:bg-white transition-all space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">Approving Status</label>
            <select
              value={approvingStatus}
              onChange={(e) => setApprovingStatus(e.target.value)}
              className="w-full py-1.5 px-2.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="ALL">All Approving Statuses</option>
              <option value="Pending">Pending Approval</option>
              <option value="Partially Approved">Partially Approved</option>
              <option value="Approved">Approved</option>
            </select>
          </div>

          {/* Packing Status Dropdown */}
          <div className="bg-slate-50/70 border border-slate-200/90 rounded-xl p-3 hover:border-slate-300 focus-within:border-indigo-500 focus-within:bg-white transition-all space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">Packing Status</label>
            <select
              value={packingStatus}
              onChange={(e) => setPackingStatus(e.target.value)}
              className="w-full py-1.5 px-2.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="ALL">All Packing Statuses</option>
              <option value="Pending">Pending Packing</option>
              <option value="partially_packed">Partially Packed</option>
              <option value="Packed">Packed</option>
            </select>
          </div>

          {/* Dealer Select Dropdown */}
          <div className="bg-slate-50/70 border border-slate-200/90 rounded-xl p-3 hover:border-slate-300 focus-within:border-indigo-500 focus-within:bg-white transition-all space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">Dealer</label>
            <select
              value={selectedDealerId}
              onChange={(e) => setSelectedDealerId(e.target.value)}
              className="w-full py-1.5 px-2.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="ALL">All Dealers</option>
              {dealers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.dealer_code})
                </option>
              ))}
            </select>
          </div>

          {/* Associate Select Dropdown */}
          <div className="bg-slate-50/70 border border-slate-200/90 rounded-xl p-3 hover:border-slate-300 focus-within:border-indigo-500 focus-within:bg-white transition-all space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">Associate</label>
            <select
              value={selectedAssociateId}
              onChange={(e) => setSelectedAssociateId(e.target.value)}
              className="w-full py-1.5 px-2.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="ALL">All Associates</option>
              {associates.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.email})
                </option>
              ))}
            </select>
          </div>

          {/* Search Bar */}
          <div className="bg-slate-50/70 border border-slate-200/90 rounded-xl p-3 hover:border-slate-300 focus-within:border-indigo-500 focus-within:bg-white transition-all space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">Search Keywords</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search order #, dealer, associate, group, firm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Orders Table & Cards Display */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-16 text-center text-slate-500 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
            <p className="text-sm font-semibold text-slate-700">Loading submitted orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          /* Empty Screen State */
          <div className="py-16 px-6 text-center text-slate-500 flex flex-col items-center justify-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-4 border border-slate-200 shadow-2xs">
              <PackageX className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">No Submitted Orders Found</h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
              There are currently no submitted dealer orders matching your selected criteria.
            </p>
            {(fromDate || toDate || approvingStatus !== 'ALL' || packingStatus !== 'ALL' || selectedGroupId !== 'ALL' || selectedDealerId !== 'ALL' || selectedAssociateId !== 'ALL' || searchQuery) && (
              <button
                onClick={clearFilters}
                className="btn-base btn-secondary text-xs mt-5 px-4 py-2 cursor-pointer hover:border-slate-300"
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop / Tablet Table - Clean & Wider */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/90 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="py-4 px-5">Order # &amp; Date</th>
                    <th className="py-4 px-5">Firm</th>
                    <th className="py-4 px-5">Dealer Name</th>
                    <th className="py-4 px-5">Associate</th>
                    <th className="py-4 px-5 text-center">No. of Items</th>
                    <th className="py-4 px-5">Approval / Packing Status</th>
                    <th className="py-4 px-5 text-right">Total Amount</th>
                    <th className="py-4 px-5 text-right">Balance Amount</th>
                    <th className="py-4 px-5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 text-xs sm:text-sm">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Order Number & Date */}
                      <td className="py-4 px-5">
                        <div className="font-bold font-mono text-indigo-600 text-sm">{order.order_number}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>
                            {order.created_at
                              ? new Date(order.created_at).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'N/A'}
                          </span>
                        </div>
                      </td>

                      {/* Firm Column */}
                      <td className="py-4 px-5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                          order.firm === 'SLSA'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}>
                          {order.firm || 'LE'}
                        </span>
                      </td>

                      {/* Dealer Name */}
                      <td className="py-4 px-5">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{order.dealer?.name || order.dealer?.shop_name || 'N/A'}</span>
                        </div>
                        {order.dealer?.dealer_code && (
                          <div className="text-[11px] text-slate-400 font-mono pl-5">
                            Code: {order.dealer.dealer_code}
                          </div>
                        )}
                        {order.dealer?.group?.group_name && (
                          <div className="text-[11px] text-indigo-600 font-medium pl-5">
                            Group: {order.dealer.group.group_name}
                          </div>
                        )}
                      </td>

                      {/* Associate */}
                      <td className="py-4 px-5">
                        <div className="text-slate-800 font-medium">
                          {order.associate?.name || 'Direct / Unknown'}
                        </div>
                        {order.associate?.email && (
                          <div className="text-[11px] text-slate-400">{order.associate.email}</div>
                        )}
                      </td>

                      {/* No. of Items */}
                      <td className="py-4 px-5 text-center">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200/90 shadow-2xs">
                          <Package className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{order.item_count ?? 0} {order.item_count === 1 ? 'Item' : 'Items'}</span>
                        </span>
                      </td>

                      {/* Approval & Packing Statuses */}
                      <td className="py-4 px-5 space-y-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {renderApprovingStatusBadge(order.approving_status)}
                          {renderPackingStatusBadge(order.packing_status)}
                        </div>
                        {order.notes && (
                          <div className="text-[11px] text-slate-500 italic max-w-xs truncate flex items-center gap-1">
                            <FileText className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{order.notes}</span>
                          </div>
                        )}
                      </td>

                      {/* Total Amount */}
                      <td className="py-4 px-5 text-right font-bold text-slate-900 font-mono text-sm">
                        ₹{(Number(order.total_amount) || 0).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                        })}
                      </td>

                      {/* Balance Amount */}
                      <td className="py-4 px-5 text-right font-mono text-sm">
                        {(() => {
                          const bal = Number(order.balance_amount ?? 0);
                          const isOverdue = isDeliveredOverdue(order.delivered_date, bal);
                          return (
                            <span
                              className={
                                isOverdue
                                  ? 'text-red-600 font-extrabold'
                                  : 'text-slate-700 font-bold'
                              }
                            >
                              ₹{bal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          );
                        })()}
                      </td>

                      {/* Action */}
                      <td className="py-4 px-5 text-center">
                        <div className="flex flex-col items-center gap-1.5 justify-center">
                          <button
                            onClick={() => router.push(`/admin/openOrder?id=${order.id}`)}
                            className="btn-base btn-primary py-1.5 px-3 text-xs w-full inline-flex items-center justify-center gap-1 shadow-2xs cursor-pointer hover:bg-indigo-700 transition-all"
                          >
                            <span>Open Order</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => router.push(`/admin/orderpayments?orderId=${order.id}`)}
                            className="py-1 px-2.5 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 w-full inline-flex items-center justify-center gap-1 cursor-pointer transition-all shadow-2xs"
                          >
                            <CreditCard className="w-3 h-3 text-emerald-600" />
                            <span>Payments</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards Layout */}
            <div className="md:hidden divide-y divide-slate-200">
              {filteredOrders.map((order) => (
                <div key={order.id} className="p-4 space-y-3 bg-white">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold font-mono text-indigo-600 text-sm">
                          {order.order_number}
                        </span>
                        <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold ${
                          order.firm === 'SLSA'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}>
                          {order.firm || 'LE'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {order.created_at
                            ? new Date(order.created_at).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })
                            : ''}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900 text-sm font-mono">
                        ₹{(Number(order.total_amount) || 0).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                      <div className="text-xs font-mono mt-0.5">
                        <span className="text-slate-500 mr-1">Bal:</span>
                        {(() => {
                          const bal = Number(order.balance_amount ?? 0);
                          const isOverdue = isDeliveredOverdue(order.delivered_date, bal);
                          return (
                            <span
                              className={
                                isOverdue
                                  ? 'text-red-600 font-extrabold'
                                  : 'text-slate-700 font-bold'
                              }
                            >
                              ₹{bal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          );
                        })()}
                      </div>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md mt-1 border border-slate-200/80">
                        <Package className="w-3 h-3 text-indigo-600" />
                        {order.item_count ?? 0} {order.item_count === 1 ? 'Item' : 'Items'}
                      </span>
                    </div>
                  </div>

                  {/* Dealer & Associate Block with Sub-border */}
                  <div className="text-xs space-y-1.5 bg-slate-50/80 p-3 rounded-xl border border-slate-200/80">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{order.dealer?.name || 'Dealer N/A'}</span>
                    </div>
                    {order.dealer?.group?.group_name && (
                      <div className="text-indigo-600 text-[11px] font-medium">
                        Group: {order.dealer.group.group_name}
                      </div>
                    )}
                    <div className="text-slate-600 text-[11px] flex items-center justify-between">
                      <span>Associate: <strong className="text-slate-800">{order.associate?.name || 'N/A'}</strong></span>
                    </div>
                  </div>

                  {/* Statuses */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    {renderApprovingStatusBadge(order.approving_status)}
                    {renderPackingStatusBadge(order.packing_status)}
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      onClick={() => router.push(`/admin/orderpayments?orderId=${order.id}`)}
                      className="py-1.5 px-3 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                    >
                      <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Payments</span>
                    </button>
                    <button
                      onClick={() => router.push(`/admin/openOrder?id=${order.id}`)}
                      className="btn-base btn-primary text-xs py-1.5 px-3.5 flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Open Order</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function AdminOrdersDashboardPage() {
  return (
    <div className="h-screen bg-slate-50 flex flex-col font-sans overflow-hidden">
      <AdminHeader />

      <div className="flex-1 flex overflow-hidden">
        <AdminSidebar />

        <main className="flex-1 h-full overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
          <Suspense
            fallback={
              <div className="p-8 text-center text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
                Loading orders dashboard...
              </div>
            }
          >
            <OrdersDashboardContent />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
