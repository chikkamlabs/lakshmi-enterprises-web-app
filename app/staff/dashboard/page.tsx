'use client';

import { useEffect, useState, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  ChevronDown,
  ChevronRight,
  X,
  Calendar,
  Store,
  UserCheck,
  Package,
  Loader2,
  Filter,
  RotateCcw,
  ShoppingBag,
  Layers,
  FileText,
  Boxes,
} from 'lucide-react';
import StaffHeader from '../header/page';
import { getOrders, Order, getOrderById } from '../../../lib/ordersStore';
import { getStoredDealers, Dealer } from '../../../lib/dealersStore';
import { getStoredAssociates, Associate } from '../../../lib/associatesStore';
import { getStoredGroups, Group } from '../../../lib/groupsStore';

function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function StaffDashboardContent() {
  const router = useRouter();

  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState<boolean>(true);

  // Filters State
  const [approvingStatusFilter, setApprovingStatusFilter] = useState<'ALL' | 'Partially Approved' | 'Approved'>('ALL');
  const [packingStatusFilter, setPackingStatusFilter] = useState<'ALL' | 'Pending' | 'Partially Packed' | 'Packed'>('ALL');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('ALL');

  // Date Filter State (default to today)
  const [fromDate, setFromDate] = useState<string>(getTodayString());
  const [toDate, setToDate] = useState<string>(getTodayString());

  // Dealer Search & Select State
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [loadingDealers, setLoadingDealers] = useState<boolean>(true);
  const [dealerSearch, setDealerSearch] = useState<string>('');
  const [selectedDealer, setSelectedDealer] = useState<Dealer | null>(null);
  const [dealerDropdownOpen, setDealerDropdownOpen] = useState<boolean>(false);

  // Associate Search & Select State
  const [associates, setAssociates] = useState<Associate[]>([]);
  const [loadingAssociates, setLoadingAssociates] = useState<boolean>(true);
  const [associateSearch, setAssociateSearch] = useState<string>('');
  const [selectedAssociate, setSelectedAssociate] = useState<Associate | null>(null);
  const [associateDropdownOpen, setAssociateDropdownOpen] = useState<boolean>(false);

  // Groups State
  const [groups, setGroups] = useState<Group[]>([]);

  // Selected Order for Details View (Drawer/Modal)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);
  const [orderDetailsData, setOrderDetailsData] = useState<Order | null>(null);

  // Fetch Dealers, Associates and Groups
  useEffect(() => {
    let isMounted = true;

    async function loadFilterOptions() {
      setLoadingDealers(true);
      setLoadingAssociates(true);

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
        console.error('Failed to load filter options:', err);
      } finally {
        if (isMounted) {
          setLoadingDealers(false);
          setLoadingAssociates(false);
        }
      }
    }

    loadFilterOptions();

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch Orders based on filters
  useEffect(() => {
    let isMounted = true;

    async function fetchStaffOrders() {
      setLoadingOrders(true);
      try {
        const data = await getOrders({
          dealerId: selectedDealer?.id,
          associateId: selectedAssociate?.id,
          groupId: selectedGroupId !== 'ALL' ? selectedGroupId : undefined,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          approvingStatus: approvingStatusFilter === 'ALL' ? undefined : approvingStatusFilter,
          packingStatus: packingStatusFilter === 'ALL' ? undefined : packingStatusFilter,
        });

        if (isMounted) {
          // Strictly filter only Partially Approved and Approved orders
          let staffApprovedOnly = data.filter(
            (o) =>
              o.approving_status === 'Partially Approved' ||
              o.approving_status === 'Approved'
          );

          // Additional memory filter for packing status if set
          if (packingStatusFilter !== 'ALL') {
            staffApprovedOnly = staffApprovedOnly.filter(
              (o) => (o.packing_status || 'Pending').toLowerCase() === packingStatusFilter.toLowerCase()
            );
          }

          // Additional group filter if set
          if (selectedGroupId !== 'ALL') {
            staffApprovedOnly = staffApprovedOnly.filter(
              (o) => o.dealer?.group_id === selectedGroupId || o.dealer?.group?.id === selectedGroupId
            );
          }

          setOrders(staffApprovedOnly);
        }
      } catch (err) {
        console.error('Error fetching staff orders:', err);
      } finally {
        if (isMounted) {
          setLoadingOrders(false);
        }
      }
    }

    fetchStaffOrders();

    return () => {
      isMounted = false;
    };
  }, [
    selectedDealer,
    selectedAssociate,
    selectedGroupId,
    fromDate,
    toDate,
    approvingStatusFilter,
    packingStatusFilter,
  ]);

  // Filtered Dealers list for search dropdown
  const filteredDealers = useMemo(() => {
    if (!dealerSearch.trim()) return dealers;
    const q = dealerSearch.toLowerCase().trim();
    return dealers.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.shop_name && d.shop_name.toLowerCase().includes(q)) ||
        d.dealer_code.toLowerCase().includes(q) ||
        (d.mobile && d.mobile.toLowerCase().includes(q))
    );
  }, [dealers, dealerSearch]);

  // Filtered Associates list for search dropdown
  const filteredAssociates = useMemo(() => {
    if (!associateSearch.trim()) return associates;
    const q = associateSearch.toLowerCase().trim();
    return associates.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.mobile && a.mobile.toLowerCase().includes(q)) ||
        (a.email && a.email.toLowerCase().includes(q))
    );
  }, [associates, associateSearch]);

  // Clear All Filters (Resets date to today)
  const handleResetFilters = () => {
    setApprovingStatusFilter('ALL');
    setPackingStatusFilter('ALL');
    setSelectedGroupId('ALL');
    setSelectedDealer(null);
    setDealerSearch('');
    setSelectedAssociate(null);
    setAssociateSearch('');
    const today = getTodayString();
    setFromDate(today);
    setToDate(today);
  };

  const todayStr = getTodayString();
  const hasActiveFilters =
    approvingStatusFilter !== 'ALL' ||
    packingStatusFilter !== 'ALL' ||
    selectedGroupId !== 'ALL' ||
    selectedDealer !== null ||
    selectedAssociate !== null ||
    fromDate !== todayStr ||
    toDate !== todayStr;

  // Handle Opening Order Details
  const handleOpenOrderDetails = (order: Order) => {
    router.push(`/staff/order?id=${order.id}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12 flex flex-col">
      {/* Attached Header Sticky on Top */}
      <StaffHeader />

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-2.5 sm:p-4 space-y-3">
        {/* Total Orders Bar */}
        <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-2xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Total Orders:
            </span>
            <span className="badge badge-success text-xs font-bold px-2 py-0.5">
              {orders.length}
            </span>
          </div>
          <div className="text-[11px] font-medium text-slate-500 truncate">
            {fromDate === toDate ? (
              <span>Date: <span className="font-bold text-slate-700">{fromDate}</span></span>
            ) : (
              <span><span className="font-bold text-slate-700">{fromDate}</span> to <span className="font-bold text-slate-700">{toDate}</span></span>
            )}
          </div>
        </div>

        {/* COMPACT FILTERS CARD */}
        <section className="bg-white border border-slate-200 rounded-lg p-2.5 sm:p-3 shadow-2xs space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-emerald-700" />
              <h2 className="text-xs font-bold text-slate-900">Filters</h2>
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            )}
          </div>

          {/* Compact 7-Column Grid Layout on Desktop / 2-Column on Mobile */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
            {/* 1. From Date */}
            <div>
              <label className="text-[10px] font-bold text-slate-600 mb-0.5 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" /> From
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="input-field text-[11px] py-1 px-2 h-7 bg-slate-50 focus:bg-white"
              />
            </div>

            {/* 2. To Date */}
            <div>
              <label className="text-[10px] font-bold text-slate-600 mb-0.5 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" /> To
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="input-field text-[11px] py-1 px-2 h-7 bg-slate-50 focus:bg-white"
              />
            </div>

            {/* 3. APS (Approving Status) */}
            <div>
              <label className="text-[10px] font-bold text-slate-600 mb-0.5 flex items-center gap-1">
                <Layers className="w-3 h-3 text-slate-400" /> APS
              </label>
              <select
                value={approvingStatusFilter}
                onChange={(e) =>
                  setApprovingStatusFilter(
                    e.target.value as 'ALL' | 'Partially Approved' | 'Approved'
                  )
                }
                className="input-field text-[11px] py-1 px-1.5 h-7 bg-slate-50 border-slate-200 focus:bg-white"
              >
                <option value="ALL">All (Appr/Part)</option>
                <option value="Partially Approved">Partially Approved</option>
                <option value="Approved">Approved</option>
              </select>
            </div>

            {/* 4. PS (Packing Status) */}
            <div>
              <label className="text-[10px] font-bold text-slate-600 mb-0.5 flex items-center gap-1">
                <Boxes className="w-3 h-3 text-slate-400" /> PS
              </label>
              <select
                value={packingStatusFilter}
                onChange={(e) =>
                  setPackingStatusFilter(
                    e.target.value as 'ALL' | 'Pending' | 'Partially Packed' | 'Packed'
                  )
                }
                className="input-field text-[11px] py-1 px-1.5 h-7 bg-slate-50 border-slate-200 focus:bg-white"
              >
                <option value="ALL">All Packing</option>
                <option value="Pending">Pending</option>
                <option value="Partially Packed">Partially Packed</option>
                <option value="Packed">Packed</option>
              </select>
            </div>

            {/* 5. Group Filter */}
            <div>
              <label className="text-[10px] font-bold text-slate-600 mb-0.5 flex items-center gap-1">
                <Layers className="w-3 h-3 text-slate-400" /> Group
              </label>
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="input-field text-[11px] py-1 px-1.5 h-7 bg-slate-50 border-slate-200 focus:bg-white"
              >
                <option value="ALL">All Groups</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.group_name}
                  </option>
                ))}
              </select>
            </div>

            {/* 6. DLR (Dealer Search/Select) */}
            <div className="relative">
              <label className="text-[10px] font-bold text-slate-600 mb-0.5 flex items-center gap-1">
                <Store className="w-3 h-3 text-slate-400" /> DLR
              </label>
              {!selectedDealer ? (
                <div className="input-group h-7">
                  <input
                    type="text"
                    placeholder="Search dlr..."
                    value={dealerSearch}
                    onChange={(e) => {
                      setDealerSearch(e.target.value);
                      setDealerDropdownOpen(true);
                    }}
                    onFocus={() => setDealerDropdownOpen(true)}
                    className="input-field text-[11px] py-1 px-2 h-7 pr-6 bg-slate-50 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setDealerDropdownOpen(!dealerDropdownOpen)}
                    className="input-icon-btn"
                  >
                    <ChevronDown className="w-3 h-3 text-slate-500" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-1 bg-emerald-50 border border-emerald-200 rounded-md px-1.5 h-7 text-[11px]">
                  <span className="font-semibold text-emerald-950 truncate">
                    {selectedDealer.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDealer(null);
                      setDealerSearch('');
                    }}
                    className="text-emerald-700 hover:text-emerald-900 shrink-0 p-0.5"
                    title="Clear dealer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Dealer Dropdown */}
              {dealerDropdownOpen && !selectedDealer && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-30 max-h-48 overflow-y-auto divide-y divide-slate-100">
                  {loadingDealers ? (
                    <div className="p-2 text-center text-[11px] text-slate-500 flex items-center justify-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin text-emerald-700" />
                      Loading...
                    </div>
                  ) : filteredDealers.length === 0 ? (
                    <div className="p-2 text-center text-[11px] text-slate-500">
                      No match
                    </div>
                  ) : (
                    filteredDealers.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => {
                          setSelectedDealer(d);
                          setDealerDropdownOpen(false);
                          setDealerSearch('');
                        }}
                        className="w-full text-left px-2.5 py-1 hover:bg-emerald-50 transition-colors text-[11px] flex items-center justify-between gap-1"
                      >
                        <span className="font-medium text-slate-900 truncate">{d.name}</span>
                        <span className="text-[9px] text-slate-500 font-mono shrink-0">{d.dealer_code}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* 6. ASC (Associate Search/Select) */}
            <div className="relative">
              <label className="text-[10px] font-bold text-slate-600 mb-0.5 flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-slate-400" /> ASC
              </label>
              {!selectedAssociate ? (
                <div className="input-group h-7">
                  <input
                    type="text"
                    placeholder="Search asc..."
                    value={associateSearch}
                    onChange={(e) => {
                      setAssociateSearch(e.target.value);
                      setAssociateDropdownOpen(true);
                    }}
                    onFocus={() => setAssociateDropdownOpen(true)}
                    className="input-field text-[11px] py-1 px-2 h-7 pr-6 bg-slate-50 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setAssociateDropdownOpen(!associateDropdownOpen)}
                    className="input-icon-btn"
                  >
                    <ChevronDown className="w-3 h-3 text-slate-500" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-1 bg-emerald-50 border border-emerald-200 rounded-md px-1.5 h-7 text-[11px]">
                  <span className="font-semibold text-emerald-950 truncate">
                    {selectedAssociate.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAssociate(null);
                      setAssociateSearch('');
                    }}
                    className="text-emerald-700 hover:text-emerald-900 shrink-0 p-0.5"
                    title="Clear associate"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Associate Dropdown */}
              {associateDropdownOpen && !selectedAssociate && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-30 max-h-48 overflow-y-auto divide-y divide-slate-100">
                  {loadingAssociates ? (
                    <div className="p-2 text-center text-[11px] text-slate-500 flex items-center justify-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin text-emerald-700" />
                      Loading...
                    </div>
                  ) : filteredAssociates.length === 0 ? (
                    <div className="p-2 text-center text-[11px] text-slate-500">
                      No match
                    </div>
                  ) : (
                    filteredAssociates.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => {
                          setSelectedAssociate(a);
                          setAssociateDropdownOpen(false);
                          setAssociateSearch('');
                        }}
                        className="w-full text-left px-2.5 py-1 hover:bg-emerald-50 transition-colors text-[11px] flex items-center justify-between gap-1"
                      >
                        <span className="font-medium text-slate-900 truncate">{a.name}</span>
                        {a.mobile && (
                          <span className="text-[9px] text-slate-500 shrink-0">{a.mobile}</span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ORDERS LIST DISPLAY */}
        <section className="space-y-2.5">
          {loadingOrders ? (
            <div className="bg-white rounded-lg border border-slate-200 p-8 text-center flex flex-col items-center justify-center space-y-2 shadow-2xs">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-700" />
              <p className="text-xs font-medium text-slate-600">
                Loading orders...
              </p>
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-white rounded-lg border border-slate-200 p-6 text-center space-y-2 shadow-2xs">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-bold text-slate-800">
                No Orders Found
              </h3>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                No approved or partially approved orders found for selected dates and filters.
              </p>
              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="btn-base btn-secondary text-[11px] py-1 px-3 mt-1"
                >
                  Reset Filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5">
              {orders.map((order) => {
                const itemCount = order.item_count || order.items?.length || 0;
                const dealerName =
                  order.dealer?.name ||
                  order.dealer?.shop_name ||
                  'Unknown Dealer';
                const associateName =
                  order.associate?.name ||
                  order.associate?.email ||
                  'Direct / Admin';

                const isPartiallyApproved =
                  order.approving_status === 'Partially Approved';

                return (
                  <div
                    key={order.id}
                    onClick={() => handleOpenOrderDetails(order)}
                    className="bg-white border border-slate-200 hover:border-emerald-300 rounded-lg p-3 transition-all shadow-2xs hover:shadow-xs cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                  >
                    {/* Left Details: Order ID, Dealer Name, Associate Name */}
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors font-mono">
                          {order.order_number || order.id}
                        </span>

                        {/* Approving Status Badge */}
                        <span
                          className={`badge text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            isPartiallyApproved
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                          }`}
                        >
                          {order.approving_status}
                        </span>

                        {/* Packing status pill */}
                        {order.packing_status && (
                          <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            PS: {order.packing_status}
                          </span>
                        )}
                      </div>

                      {/* Dealer Name & Associate Name */}
                      <div className="grid grid-cols-1 xs:grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-slate-600 pt-0.5">
                        <div className="flex items-center gap-1 truncate">
                          <Store className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="text-slate-500 font-medium">Dealer:</span>
                          <span className="font-bold text-slate-900 truncate">
                            {dealerName}
                          </span>
                        </div>

                        {/* Associate Name clearly displayed */}
                        <div className="flex items-center gap-1 truncate">
                          <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="text-slate-500 font-medium">Associate:</span>
                          <span className="font-bold text-slate-900 truncate">
                            {associateName}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right side: Items count & BIG Arrow Button */}
                    <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-md px-2 py-1 text-xs">
                        <Package className="w-3.5 h-3.5 text-emerald-700" />
                        <span className="font-bold text-slate-900">
                          {itemCount} {itemCount === 1 ? 'item' : 'items'}
                        </span>
                      </div>

                      {/* Big Action Arrow Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenOrderDetails(order);
                        }}
                        className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all shrink-0 active:scale-95 cursor-pointer"
                        title="View order details"
                      >
                        <span>View</span>
                        <ChevronRight className="w-4 h-4 stroke-[3]" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ORDER DETAILS DRAWER / MODAL */}
        {selectedOrder && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
            <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
              {/* Modal Header */}
              <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 font-mono">
                      Order #{selectedOrder.order_number || selectedOrder.id}
                    </h2>
                    <span
                      className={`badge text-[10px] font-bold px-2 py-0.5 ${
                        selectedOrder.approving_status === 'Partially Approved'
                          ? 'bg-amber-100 text-amber-900 border border-amber-200'
                          : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                      }`}
                    >
                      {selectedOrder.approving_status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Created:{' '}
                    {selectedOrder.created_at
                      ? new Date(selectedOrder.created_at).toLocaleString()
                      : 'N/A'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedOrder(null);
                    setOrderDetailsData(null);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-3.5 overflow-y-auto flex-1 space-y-3 text-xs">
                {loadingDetails ? (
                  <div className="p-8 text-center flex flex-col items-center justify-center space-y-2">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-700" />
                    <span className="text-slate-500 font-medium">Loading details...</span>
                  </div>
                ) : (
                  <>
                    {/* Dealer & Associate Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 space-y-0.5">
                        <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1">
                          <Store className="w-3 h-3 text-emerald-700" /> Dealer Info
                        </span>
                        <div className="font-bold text-slate-900">
                          {orderDetailsData?.dealer?.name || selectedOrder.dealer?.name || 'N/A'}
                        </div>
                        {orderDetailsData?.dealer?.dealer_code && (
                          <div className="text-[11px] text-slate-500 font-mono">
                            Code: {orderDetailsData.dealer.dealer_code}
                          </div>
                        )}
                        {orderDetailsData?.dealer?.mobile && (
                          <div className="text-[11px] text-slate-600">
                            Mobile: {orderDetailsData.dealer.mobile}
                          </div>
                        )}
                      </div>

                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 space-y-0.5">
                        <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1">
                          <UserCheck className="w-3 h-3 text-emerald-700" /> Associate Info
                        </span>
                        <div className="font-bold text-slate-900">
                          {orderDetailsData?.associate?.name || selectedOrder.associate?.name || 'Direct / Admin'}
                        </div>
                        {orderDetailsData?.associate?.email && (
                          <div className="text-[11px] text-slate-500">
                            {orderDetailsData.associate.email}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Order Items Table */}
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <div className="bg-slate-100 px-3 py-1.5 font-bold text-slate-800 flex items-center justify-between">
                        <span>Order Items ({orderDetailsData?.items?.length || selectedOrder.item_count || 0})</span>
                      </div>

                      {orderDetailsData?.items && orderDetailsData.items.length > 0 ? (
                        <div className="divide-y divide-slate-100 overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50 text-[11px] font-semibold text-slate-600 border-b border-slate-100">
                                <th className="p-2">Product</th>
                                <th className="p-2 text-center">Req Qty</th>
                                <th className="p-2 text-center">Appr Qty</th>
                                <th className="p-2 text-right">Price</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {orderDetailsData.items.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/50">
                                  <td className="p-2 min-w-[140px]">
                                    <div className="font-semibold text-slate-900">
                                      {item.product?.name || `Product #${item.product_id}`}
                                    </div>
                                    {item.product?.product_code && (
                                      <div className="text-[10px] font-mono text-slate-500">
                                        {item.product.product_code}
                                      </div>
                                    )}
                                  </td>
                                  <td className="p-2 text-center font-medium text-slate-700">
                                    {item.requested_quantity}
                                  </td>
                                  <td className="p-2 text-center font-bold text-emerald-700">
                                    {item.approved_quantity ?? item.requested_quantity}
                                  </td>
                                  <td className="p-2 text-right font-medium text-slate-900">
                                    ₹{Number(item.selling_price || 0).toLocaleString()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="p-4 text-center text-slate-500">
                          {selectedOrder.item_count || 0} item(s) in this order.
                        </div>
                      )}
                    </div>

                    {/* Order Notes */}
                    {selectedOrder.notes && (
                      <div className="bg-amber-50/60 border border-amber-200 rounded-lg p-2.5 text-amber-900">
                        <span className="font-bold flex items-center gap-1 text-[11px] mb-0.5">
                          <FileText className="w-3.5 h-3.5 text-amber-700" /> Order Notes:
                        </span>
                        <p className="text-xs text-amber-950">{selectedOrder.notes}</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedOrder(null);
                    setOrderDetailsData(null);
                  }}
                  className="btn-base btn-secondary text-xs px-4 py-1.5"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function StaffDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center flex flex-col items-center justify-center space-y-2">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-700" />
          <p className="text-xs text-slate-500 font-medium">Loading staff portal...</p>
        </div>
      }
    >
      <StaffDashboardContent />
    </Suspense>
  );
}
