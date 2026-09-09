'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  ShoppingBag,
  Minus,
  Lock,
  Building,
  Check,
} from 'lucide-react';
import {
  getDealersForOrder,
  searchProductsForOrder,
  saveOrderToDatabase,
  getOrderByIdForEdit,
  updateOrderInDatabase,
  ProductSearchResult,
} from '../../../lib/createOrder';
import { updateSingleOrderItem } from '../../../lib/ordersStore';
import { Dealer } from '../../../lib/dealersStore';
import AssociateHeader from '../header/page';
import AssociateBottomNavigation from '../buttomnavigation/page';

export interface SelectedOrderItem {
  id?: string;
  product: ProductSearchResult;
  requested_quantity: number;
  approved_quantity?: number;
  released_quantity?: number;
  line_total?: number;
  mrp: number;
  associate_mrp: number;
  discount: number;
  selling_price: number;
  notes: string;
  isDirty?: boolean;
}

function CreateOrderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editOrderId = searchParams.get('id');

  // Edit State
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isReadOnly, setIsReadOnly] = useState<boolean>(false);
  const [existingOrderNumber, setExistingOrderNumber] = useState<string>('');
  const [approvingStatus, setApprovingStatus] = useState<string>('Pending');
  const [loadingOrder, setLoadingOrder] = useState<boolean>(false);

  // State: Firm Selection ('LE' or 'SLSA')
  const [selectedFirm, setSelectedFirm] = useState<'LE' | 'SLSA'>('LE');

  // State: Dealers
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [loadingDealers, setLoadingDealers] = useState<boolean>(true);
  const [dealerSearch, setDealerSearch] = useState<string>('');
  const [selectedDealer, setSelectedDealer] = useState<Dealer | null>(null);
  const [dealerDropdownOpen, setDealerDropdownOpen] = useState<boolean>(false);

  // State: Products
  const [products, setProducts] = useState<ProductSearchResult[]>([]);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(true);
  const [productSearch, setProductSearch] = useState<string>('');
  const [showProductResults, setShowProductResults] = useState<boolean>(false);

  // State: Order Items
  const [orderItems, setOrderItems] = useState<SelectedOrderItem[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [savingItemKey, setSavingItemKey] = useState<string | null>(null);
  const [savedItemKeys, setSavedItemKeys] = useState<{ [key: string]: boolean }>({});

  // State: Form Status
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    orderNumber: string;
    status: 'Draft' | 'Submitted';
    isUpdate?: boolean;
  } | null>(null);

  // Fetch initial Dealers and Products
  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      setLoadingDealers(true);
      setLoadingProducts(true);

      try {
        const [dealersData, productsData] = await Promise.all([
          getDealersForOrder(),
          searchProductsForOrder(''),
        ]);

        if (isMounted) {
          setDealers(dealersData);
          setProducts(productsData);
        }
      } catch (err) {
        console.error('Failed to load initial order data:', err);
      } finally {
        if (isMounted) {
          setLoadingDealers(false);
          setLoadingProducts(false);
        }
      }
    }

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Load existing order if editing
  useEffect(() => {
    if (!editOrderId) return;
    const currentId = editOrderId;

    let isMounted = true;
    async function loadExistingOrder(id: string) {
      setLoadingOrder(true);
      setErrorMsg(null);
      try {
        const result = await getOrderByIdForEdit(id);
        if (!isMounted) return;

        if (result.order) {
          setIsEditing(true);
          setExistingOrderNumber(result.order.order_number || id);
          setApprovingStatus(result.order.approving_status || 'Pending');
          setIsReadOnly(!result.editable);
          setNotes(result.order.notes || '');
          if (result.order.firm) {
            setSelectedFirm(result.order.firm === 'SLSA' ? 'SLSA' : 'LE');
          }

          if (result.dealer) {
            setSelectedDealer(result.dealer);
          }

          if (result.items && result.items.length > 0) {
            // Initially load database values exactly without recalculating
            const mapped: SelectedOrderItem[] = result.items.map((it) => {
              const prodMrp = Number(it.product?.mrp ?? 0);
              const rawMrp = Number(it.mrp !== undefined && it.mrp !== null ? it.mrp : prodMrp);
              const rawAssocMrp = Number(
                it.associate_mrp !== undefined && it.associate_mrp !== null
                  ? it.associate_mrp
                  : (it.mrp ?? prodMrp)
              );
              const rawDisc = Number(it.discount ?? 0);
              const rawSp = Number(
                it.selling_price !== undefined && it.selling_price !== null
                  ? it.selling_price
                  : rawDisc > 0
                  ? rawAssocMrp - (rawAssocMrp * rawDisc) / 100
                  : rawAssocMrp
              );
              const rawReqQty = it.requested_quantity !== undefined && it.requested_quantity !== null ? Number(it.requested_quantity) : 1;
              const rawAppQty = it.approved_quantity !== undefined && it.approved_quantity !== null ? Number(it.approved_quantity) : 0;
              const rawRelQty = it.released_quantity !== undefined && it.released_quantity !== null ? Number(it.released_quantity) : 0;
              const rawLineTotal = it.line_total !== undefined && it.line_total !== null ? Number(it.line_total) : rawReqQty * rawSp;

              return {
                id: it.id,
                product: it.product || {
                  id: it.product_id,
                  name: 'Product ID: ' + it.product_id,
                  product_code: it.product_id,
                  selling_price: rawSp,
                  mrp: rawMrp,
                },
                requested_quantity: rawReqQty,
                approved_quantity: rawAppQty,
                released_quantity: rawRelQty,
                line_total: rawLineTotal,
                mrp: rawMrp,
                associate_mrp: rawAssocMrp,
                discount: rawDisc,
                selling_price: rawSp,
                notes: it.notes || '',
                isDirty: false,
              };
            });
            setOrderItems(mapped);
          }
        } else {
          setErrorMsg(result.error || 'Could not find the requested order.');
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMsg(err?.message || 'Failed to load order.');
        }
      } finally {
        if (isMounted) setLoadingOrder(false);
      }
    }

    loadExistingOrder(currentId);

    return () => {
      isMounted = false;
    };
  }, [editOrderId]);

  // Filter Dealers
  const filteredDealers = useMemo(() => {
    if (!dealerSearch.trim()) return dealers;
    const q = dealerSearch.toLowerCase();
    return dealers.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.dealer_code.toLowerCase().includes(q) ||
        (d.mobile && d.mobile.includes(q))
    );
  }, [dealers, dealerSearch]);

  // Filter Products
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products.slice(0, 30);
    const q = productSearch.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.product_code.toLowerCase().includes(q) ||
        (p.company_name && p.company_name.toLowerCase().includes(q))
    );
  }, [products, productSearch]);

  // Add Product to Order
  const handleAddProduct = (product: ProductSearchResult) => {
    if (isReadOnly) return;
    setOrderItems((prev) => {
      const existingIndex = prev.findIndex((it) => it.product.id === product.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          requested_quantity: updated[existingIndex].requested_quantity + 1,
          isDirty: true,
        };
        return updated;
      }
      const prodMrp = Number(product.mrp || product.selling_price || 0);
      const assocMrp = prodMrp;
      const initialDiscount = 0;
      const initialSellingPrice = Number(product.selling_price || prodMrp);

      return [
        ...prev,
        {
          product,
          requested_quantity: 1,
          approved_quantity: 0,
          released_quantity: 0,
          line_total: initialSellingPrice,
          mrp: prodMrp,
          associate_mrp: assocMrp,
          discount: initialDiscount,
          selling_price: initialSellingPrice,
          notes: '',
          isDirty: true,
        },
      ];
    });
    setProductSearch('');
    setShowProductResults(false);
  };

  // Update Item Quantity
  const handleQuantityChange = (productId: string, newQty: number) => {
    if (isReadOnly) return;
    const qty = Math.max(1, isNaN(newQty) ? 1 : newQty);
    setOrderItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, requested_quantity: qty, isDirty: true } : item
      )
    );
  };

  // Update Product MRP (order_items.mrp)
  const handleMrpChange = (productId: string, newMrp: number) => {
    if (isReadOnly) return;
    const mrp = Math.max(0, isNaN(newMrp) ? 0 : newMrp);
    setOrderItems((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          return {
            ...item,
            mrp: mrp,
            isDirty: true,
          };
        }
        return item;
      })
    );
  };

  // Update Associate MRP (when edited, recalculates selling price based on discount)
  const handleAssociateMrpChange = (productId: string, newMrp: number) => {
    if (isReadOnly) return;
    const mrp = Math.max(0, isNaN(newMrp) ? 0 : newMrp);
    setOrderItems((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const sp = item.discount > 0 ? mrp - (mrp * item.discount) / 100 : mrp;
          return {
            ...item,
            associate_mrp: mrp,
            selling_price: Math.round(sp * 100) / 100,
            isDirty: true,
          };
        }
        return item;
      })
    );
  };

  // Update Discount (recalculates selling_price from associate_mrp)
  const handleDiscountChange = (productId: string, newDisc: number) => {
    if (isReadOnly) return;
    const disc = Math.max(0, isNaN(newDisc) ? 0 : newDisc);
    setOrderItems((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const mrp = item.associate_mrp;
          const sp = disc > 0 ? mrp - (mrp * disc) / 100 : mrp;
          return {
            ...item,
            discount: disc,
            selling_price: Math.round(sp * 100) / 100,
            isDirty: true,
          };
        }
        return item;
      })
    );
  };

  // Directly edit Selling Price (sets discount to 0)
  const handleSellingPriceChange = (productId: string, newSp: number) => {
    if (isReadOnly) return;
    const sp = Math.max(0, isNaN(newSp) ? 0 : newSp);
    setOrderItems((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          return {
            ...item,
            selling_price: sp,
            discount: 0,
            isDirty: true,
          };
        }
        return item;
      })
    );
  };

  // Update Item Notes
  const handleItemNotesChange = (productId: string, newNotes: string) => {
    if (isReadOnly) return;
    setOrderItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, notes: newNotes, isDirty: true } : item
      )
    );
  };

  // Save single item row to database
  const handleSaveSingleItem = async (item: SelectedOrderItem) => {
    if (isReadOnly) return;
    const itemKey = item.id || item.product.id;
    setSavingItemKey(itemKey);

    try {
      if (isEditing && editOrderId && item.id) {
        await updateSingleOrderItem({
          itemId: item.id,
          orderId: editOrderId,
          requested_quantity: item.requested_quantity,
          mrp: item.mrp,
          associate_mrp: item.associate_mrp,
          discount: item.discount,
          selling_price: item.selling_price,
          notes: item.notes,
          line_total: item.requested_quantity * item.selling_price,
        });
      }

      setSavedItemKeys((prev) => ({ ...prev, [itemKey]: true }));
      setTimeout(() => {
        setSavedItemKeys((prev) => ({ ...prev, [itemKey]: false }));
      }, 2500);

      setOrderItems((prev) =>
        prev.map((it) =>
          (it.id && it.id === item.id) || it.product.id === item.product.id
            ? { ...it, isDirty: false }
            : it
        )
      );
    } catch (err) {
      console.error('Failed to save single order item:', err);
    } finally {
      setSavingItemKey(null);
    }
  };

  // Remove Item
  const handleRemoveItem = (productId: string) => {
    if (isReadOnly) return;
    setOrderItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const isApprovingPending = approvingStatus?.toLowerCase() === 'pending';

  // Total order amount (sum of line totals)
  const totalOrderAmount = useMemo(() => {
    return orderItems.reduce((sum, item) => {
      const lineTotal = isApprovingPending
        ? (Number(item.selling_price) || 0) * (Number(item.requested_quantity) || 0)
        : (item.line_total !== undefined && item.line_total !== null
            ? Number(item.line_total)
            : (Number(item.selling_price) || 0) * (Number(item.requested_quantity) || 0));
      return sum + lineTotal;
    }, 0);
  }, [orderItems, isApprovingPending]);

  // Save / Update Order Action
  const handleSaveOrder = async (associateStatus: 'Draft' | 'Submitted') => {
    setErrorMsg(null);

    if (isReadOnly) {
      setErrorMsg(
        `This order has approving status "${approvingStatus}" and cannot be edited.`
      );
      return;
    }

    if (!selectedDealer) {
      setErrorMsg('Please select a dealer before saving the order.');
      return;
    }

    if (orderItems.length === 0) {
      setErrorMsg('Please add at least one product to the order.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditing && editOrderId) {
        // Update existing order
        const result = await updateOrderInDatabase(editOrderId, {
          firm: selectedFirm,
          dealer_id: selectedDealer.id,
          associate_status: associateStatus,
          notes: notes.trim() || undefined,
          items: orderItems.map((item) => ({
            product_id: item.product.id,
            requested_quantity: item.requested_quantity,
            selling_price: item.selling_price,
            associate_mrp: item.associate_mrp,
            mrp: item.mrp,
            discount: item.discount,
            notes: item.notes.trim() || undefined,
          })),
        });

        if (result.success && result.orderNumber) {
          setSuccessResult({
            orderNumber: result.orderNumber,
            status: associateStatus,
            isUpdate: true,
          });
        } else {
          setErrorMsg(result.error || 'Failed to update order. Please try again.');
        }
      } else {
        // Save new order
        const result = await saveOrderToDatabase({
          firm: selectedFirm,
          dealer_id: selectedDealer.id,
          associate_status: associateStatus,
          notes: notes.trim() || undefined,
          items: orderItems.map((item) => ({
            product_id: item.product.id,
            requested_quantity: item.requested_quantity,
            selling_price: item.selling_price,
            associate_mrp: item.associate_mrp,
            mrp: item.mrp,
            discount: item.discount,
            notes: item.notes.trim() || undefined,
          })),
        });

        if (result.success && result.orderNumber) {
          setSuccessResult({
            orderNumber: result.orderNumber,
            status: associateStatus,
            isUpdate: false,
          });
        } else {
          setErrorMsg(result.error || 'Failed to save order. Please try again.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'An error occurred while saving the order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingOrder) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center space-y-2">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-xs text-slate-500 font-medium">Loading order details...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 pb-20 md:pb-6">
      {/* Header */}
      <AssociateHeader />

      {/* Sticky Top Bar - Sits right below Associate Header */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-2 shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              href="/associate/orders"
              className="p-1 rounded-md text-slate-600 hover:bg-slate-100 transition-colors"
              title="Back to Orders"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-sm font-bold text-slate-900">
              {isEditing ? `Edit Order #${existingOrderNumber}` : 'Create New Order'}
            </h1>
          </div>
          <span className="badge badge-info text-[10px] px-2 py-0.5 font-semibold">
            Associate
          </span>
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-3 md:p-5 space-y-3">
        {/* Read-Only Status Banner (If Approving Status != Pending) */}
        {isReadOnly && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 flex items-start gap-2.5 text-amber-900 shadow-xs text-xs">
            <Lock className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Order Locked (Read-Only Mode):</span> This order has approving status{' '}
              <span className="font-bold underline">{approvingStatus}</span>. You can only edit or change details if the approving status is <span className="font-bold">Pending</span>.
            </div>
          </div>
        )}

        {/* Success Modal / Banner */}
        {successResult && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center space-y-3 animate-fade-in shadow-xs">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-emerald-900">
                {successResult.isUpdate ? 'Order Updated Successfully!' : 'Order Saved Successfully!'}
              </h2>
              <p className="text-xs text-emerald-700 mt-0.5">
                Order <span className="font-mono font-bold">{successResult.orderNumber}</span> saved as{' '}
                <span className="font-bold uppercase underline">{successResult.status}</span>.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
              <Link href="/associate/orders" className="btn-base btn-secondary w-full sm:w-auto text-xs py-1.5">
                View All Orders
              </Link>
              <button
                onClick={() => {
                  setSuccessResult(null);
                  setSelectedDealer(null);
                  setOrderItems([]);
                  setNotes('');
                  setDealerSearch('');
                  setProductSearch('');
                  setIsEditing(false);
                  router.push('/associate/createorder');
                }}
                className="btn-base btn-primary w-full sm:w-auto text-xs py-1.5"
              >
                + Create Another Order
              </button>
            </div>
          </div>
        )}

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 text-red-800 animate-slide-up text-xs">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">{errorMsg}</div>
            <button
              onClick={() => setErrorMsg(null)}
              className="text-red-500 hover:text-red-700 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* 0. Select Firm Card */}
        <section className="bg-white rounded-lg border border-slate-200 p-3 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-indigo-600" />
              <div>
                <h2 className="text-xs font-bold text-slate-900">Select Firm</h2>
                <p className="text-[10px] text-slate-500">Choose the operating firm for this order</p>
              </div>
            </div>
            <span className="badge badge-info text-[10px] font-bold">
              {selectedFirm === 'LE' ? 'Lakshmi Enterprises' : 'SLSA'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-0.5">
            <button
              type="button"
              disabled={isReadOnly}
              onClick={() => setSelectedFirm('LE')}
              className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                selectedFirm === 'LE'
                  ? 'bg-indigo-50/80 border-indigo-600 ring-2 ring-indigo-500/20'
                  : 'bg-slate-50/50 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Lakshmi Enterprises</span>
                <span className="badge badge-info text-[10px]">LE</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Main Firm Distribution</p>
            </button>

            <button
              type="button"
              disabled={isReadOnly}
              onClick={() => setSelectedFirm('SLSA')}
              className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                selectedFirm === 'SLSA'
                  ? 'bg-purple-50/80 border-purple-600 ring-2 ring-purple-500/20'
                  : 'bg-slate-50/50 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">SLSA</span>
                <span className="badge badge-neutral text-[10px]">SLSA</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Secondary Firm Distribution</p>
            </button>
          </div>
        </section>

        {/* 1. Select Dealer Card */}
        <section className="bg-white rounded-lg border border-slate-200 p-3 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
            <div>
              <h2 className="text-xs font-bold text-slate-900">Select Dealer</h2>
              <p className="text-[10px] text-slate-500">Choose dealer to assign this order to</p>
            </div>
            {selectedDealer && !isReadOnly && (
              <button
                type="button"
                onClick={() => setSelectedDealer(null)}
                className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold"
              >
                Change Dealer
              </button>
            )}
          </div>

          {!selectedDealer ? (
            <div className="relative">
              <div className="input-group">
                <Search className="input-icon-left w-3.5 h-3.5" />
                <input
                  type="text"
                  disabled={isReadOnly}
                  placeholder={isReadOnly ? 'Order is locked' : 'Search dealers by name, ID or mobile...'}
                  value={dealerSearch}
                  onChange={(e) => {
                    setDealerSearch(e.target.value);
                    setDealerDropdownOpen(true);
                  }}
                  onFocus={() => !isReadOnly && setDealerDropdownOpen(true)}
                  className="input-field has-left-icon text-xs py-1.5 disabled:bg-slate-100"
                />
                {dealerSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setDealerSearch('');
                      setDealerDropdownOpen(false);
                    }}
                    className="input-icon-btn"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Dealer Dropdown */}
              {dealerDropdownOpen && !isReadOnly && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-30 max-h-56 overflow-y-auto divide-y divide-slate-100">
                  {loadingDealers ? (
                    <div className="p-3 flex items-center justify-center gap-2 text-slate-500 text-xs">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                      Loading dealers...
                    </div>
                  ) : filteredDealers.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-500">
                      No matching dealers found.
                    </div>
                  ) : (
                    filteredDealers.map((dealer) => (
                      <button
                        key={dealer.id}
                        type="button"
                        onClick={() => {
                          setSelectedDealer(dealer);
                          setDealerDropdownOpen(false);
                          setDealerSearch('');
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-indigo-50/70 transition-colors flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-slate-900 truncate">{dealer.name}</div>
                          {dealer.mobile && (
                            <div className="text-[10px] text-slate-500">Mobile: {dealer.mobile}</div>
                          )}
                        </div>
                        <span className="badge badge-neutral text-[10px] shrink-0">{dealer.dealer_code}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Selected Dealer Card: Just Name, ID, Mobile */
            <div className="bg-indigo-50/60 border border-indigo-200 rounded-lg p-2.5 flex items-center justify-between gap-2">
              <div className="text-xs space-y-0.5 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-indigo-950 truncate">{selectedDealer.name}</span>
                  <span className="badge badge-info text-[10px] font-mono shrink-0">{selectedDealer.dealer_code}</span>
                </div>
                {selectedDealer.mobile && (
                  <p className="text-[11px] text-slate-600">Mobile: {selectedDealer.mobile}</p>
                )}
              </div>
              <div className="flex items-center gap-1 text-emerald-700 text-[10px] font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Selected
              </div>
            </div>
          )}
        </section>

        {/* 2. Search & Add Products Card */}
        <section className="bg-white rounded-lg border border-slate-200 p-3 shadow-xs space-y-2.5">
          <div className="border-b border-slate-100 pb-1.5">
            <h2 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4 text-indigo-600" /> Search &amp; Add Products
            </h2>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Search by product id, name or company
            </p>
          </div>

          <div className="relative">
            <div className="input-group">
              <Search className="input-icon-left w-3.5 h-3.5" />
              <input
                type="text"
                disabled={isReadOnly}
                placeholder={isReadOnly ? 'Order is locked' : 'Search products...'}
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  setShowProductResults(true);
                }}
                onFocus={() => !isReadOnly && setShowProductResults(true)}
                className="input-field has-left-icon text-xs py-1.5 disabled:bg-slate-100"
              />
              {productSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setProductSearch('');
                    setShowProductResults(false);
                  }}
                  className="input-icon-btn"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Product Search Results */}
            {showProductResults && !isReadOnly && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto divide-y divide-slate-100">
                {loadingProducts ? (
                  <div className="p-3 flex items-center justify-center gap-2 text-slate-500 text-xs">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                    Loading products...
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-500">
                    No matching products found.
                  </div>
                ) : (
                  filteredProducts.map((product) => {
                    const isAdded = orderItems.some((it) => it.product.id === product.id);
                    return (
                      <div
                        key={product.id}
                        className="px-3 py-2 hover:bg-slate-50 transition-colors flex items-center justify-between gap-2"
                      >
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-slate-900 truncate">{product.name}</span>
                            <span className="badge badge-neutral text-[10px] font-mono shrink-0">{product.product_code}</span>
                          </div>
                          {product.company_name && (
                            <div className="text-[10px] text-slate-500 truncate">
                              Company: {product.company_name}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddProduct(product)}
                          className={`p-1.5 rounded-md text-xs font-bold transition-colors shrink-0 ${
                            isAdded
                              ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                              : 'bg-indigo-600 text-white hover:bg-indigo-700'
                          }`}
                          title={isAdded ? 'Add another' : 'Add to order'}
                        >
                          <Plus className="w-4 h-4 stroke-[2.5]" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </section>

        {/* 3. Order Items Card */}
        <section className="bg-white rounded-lg border border-slate-200 p-3 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4 text-indigo-600" /> Order Items ({orderItems.length})
            </h2>
            {orderItems.length > 0 && !isReadOnly && (
              <button
                type="button"
                onClick={() => setOrderItems([])}
                className="text-[11px] text-red-600 hover:text-red-800 font-medium cursor-pointer"
              >
                Clear All
              </button>
            )}
          </div>

          {orderItems.length === 0 ? (
            <div className="p-6 text-center border border-dashed border-slate-200 rounded-lg bg-slate-50/50 space-y-1">
              <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-600">No items added</p>
              <p className="text-[10px] text-slate-400">Search and tap (+) to add products</p>
            </div>
          ) : (
            <div className="space-y-3 divide-y divide-slate-100">
              {orderItems.map((item, idx) => {
                const itemLineTotal = isApprovingPending
                  ? (Number(item.selling_price) || 0) * (Number(item.requested_quantity) || 0)
                  : (item.line_total !== undefined && item.line_total !== null
                      ? Number(item.line_total)
                      : (Number(item.selling_price) || 0) * (Number(item.requested_quantity) || 0));
                const itemKey = item.id || item.product.id;
                const isItemSaving = savingItemKey === itemKey;
                const isItemSaved = savedItemKeys[itemKey];

                return (
                  <div
                    key={item.product.id}
                    className="pt-3 first:pt-0 space-y-2.5"
                  >
                    {/* Item Top: Name, Code, Company, Remove */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-bold text-slate-400">#{idx + 1}</span>
                          <span className="text-xs font-bold text-slate-900 truncate">{item.product.name}</span>
                          <span className="badge badge-neutral text-[10px] font-mono shrink-0">{item.product.product_code}</span>
                        </div>
                        {item.product.company_name && (
                          <div className="text-[10px] text-slate-500 truncate">
                            Company: {item.product.company_name}
                          </div>
                        )}
                      </div>

                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.product.id)}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                          title="Remove Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Pricing, Discount, Quantity, App qty, Rel qty, Line Total & Tick Button Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-9 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200/70 text-xs items-end">
                      {/* Product MRP (order_items.mrp) */}
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                          MRP (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          disabled={isReadOnly}
                          value={item.mrp}
                          onChange={(e) => handleMrpChange(item.product.id, parseFloat(e.target.value) || 0)}
                          className="w-full text-xs font-medium py-1 px-1.5 bg-white border border-slate-200 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100 text-right"
                        />
                      </div>

                      {/* Associate MRP */}
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                          Assoc MRP (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          disabled={isReadOnly}
                          value={item.associate_mrp}
                          onChange={(e) => handleAssociateMrpChange(item.product.id, parseFloat(e.target.value) || 0)}
                          className="w-full text-xs font-semibold py-1 px-1.5 bg-white border border-slate-200 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100 text-right"
                        />
                      </div>

                      {/* Discount % */}
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                          Discount (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          disabled={isReadOnly}
                          value={item.discount}
                          onChange={(e) => handleDiscountChange(item.product.id, parseFloat(e.target.value) || 0)}
                          className="w-full text-xs font-medium py-1 px-1 bg-white border border-slate-200 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100 text-center"
                        />
                      </div>

                      {/* Selling Price */}
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                          Selling Price (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          disabled={isReadOnly}
                          value={item.selling_price}
                          onChange={(e) => handleSellingPriceChange(item.product.id, parseFloat(e.target.value) || 0)}
                          className="w-full text-xs font-semibold py-1 px-1.5 bg-white border border-slate-200 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100 text-right"
                        />
                      </div>

                      {/* Quantity */}
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                          Quantity
                        </label>
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            disabled={isReadOnly}
                            onClick={() => handleQuantityChange(item.product.id, item.requested_quantity - 1)}
                            className="w-5 h-6 flex items-center justify-center rounded bg-white text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors font-bold text-xs shadow-2xs disabled:opacity-50 cursor-pointer shrink-0"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            disabled={isReadOnly}
                            value={item.requested_quantity}
                            onChange={(e) => handleQuantityChange(item.product.id, parseInt(e.target.value, 10) || 1)}
                            className="w-full min-w-0 h-6 text-center text-xs font-bold bg-white border border-slate-200 rounded focus:outline-none focus:border-indigo-500 disabled:bg-slate-100 px-0.5"
                          />
                          <button
                            type="button"
                            disabled={isReadOnly}
                            onClick={() => handleQuantityChange(item.product.id, item.requested_quantity + 1)}
                            className="w-5 h-6 flex items-center justify-center rounded bg-white text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors font-bold text-xs shadow-2xs disabled:opacity-50 cursor-pointer shrink-0"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>

                      {/* App qty (approved_quantity) */}
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 block mb-0.5 whitespace-nowrap">
                          App qty
                        </label>
                        <div className="h-6 py-1 px-1.5 bg-emerald-50/70 border border-emerald-200/80 rounded text-xs font-bold font-mono text-emerald-800 text-center flex items-center justify-center">
                          {item.approved_quantity !== undefined && item.approved_quantity !== null ? item.approved_quantity : 0}
                        </div>
                      </div>

                      {/* Rel qty (released_quantity) */}
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 block mb-0.5 whitespace-nowrap">
                          Rel qty
                        </label>
                        <div className="h-6 py-1 px-1.5 bg-sky-50/70 border border-sky-200/80 rounded text-xs font-bold font-mono text-sky-800 text-center flex items-center justify-center">
                          {item.released_quantity !== undefined && item.released_quantity !== null ? item.released_quantity : 0}
                        </div>
                      </div>

                      {/* Line Total */}
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 block mb-0.5 whitespace-nowrap">
                          Line Total (₹)
                        </label>
                        <div className="h-6 py-1 px-1.5 bg-indigo-50/70 border border-indigo-100 rounded text-xs font-bold font-mono text-indigo-900 text-right whitespace-nowrap flex items-center justify-end">
                          ₹{itemLineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                      </div>

                      {/* Small Tick Button to Save Item Row */}
                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={() => handleSaveSingleItem(item)}
                          disabled={isReadOnly || isItemSaving}
                          title={item.id ? 'Save changes for this item to database' : 'Confirm item changes'}
                          className={`w-full h-6 rounded flex items-center justify-center transition-all cursor-pointer ${
                            isItemSaved
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : item.isDirty
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-400 hover:bg-emerald-600 hover:text-white ring-2 ring-emerald-400/40'
                              : 'bg-slate-200 text-slate-600 hover:bg-emerald-600 hover:text-white'
                          }`}
                        >
                          {isItemSaving ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Item Notes */}
                    <div className="pt-0.5">
                      <input
                        type="text"
                        disabled={isReadOnly}
                        placeholder="Item notes / specifications (optional)..."
                        value={item.notes}
                        onChange={(e) => handleItemNotesChange(item.product.id, e.target.value)}
                        className="w-full text-xs py-1 px-2.5 bg-slate-50/50 border border-slate-200 rounded-md focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100 placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Total (Sum of line totals) */}
          {orderItems.length > 0 && (
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between bg-indigo-50/80 p-3 rounded-lg border border-indigo-100">
              <span className="text-xs font-bold text-indigo-950">Total Amount:</span>
              <span className="text-base font-extrabold font-mono text-indigo-700">
                ₹{totalOrderAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </section>

        {/* 4. Order Notes Card */}
        <section className="bg-white rounded-lg border border-slate-200 p-3 shadow-xs space-y-1.5">
          <label className="text-xs font-bold text-slate-900 block">
            General Order Notes (Optional)
          </label>
          <textarea
            rows={2}
            disabled={isReadOnly}
            placeholder={isReadOnly ? 'Order is locked' : 'Add delivery instructions or overall order notes...'}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full text-xs p-2 bg-slate-50/50 border border-slate-200 rounded-md focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100"
          />
        </section>

        {/* 5. Sticky Action Footer */}
        {!isReadOnly && (
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-slate-900">
                {isEditing ? 'Ready to update order?' : 'Ready to place order?'}
              </p>
              <p className="text-[10px] text-slate-500">
                Save as draft to edit later, or submit directly for admin approval.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSaveOrder('Draft')}
                className="btn-base btn-secondary flex-1 sm:flex-initial text-xs py-2 px-3 flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <span>Save Draft</span>
                )}
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSaveOrder('Submitted')}
                className="btn-base btn-primary flex-1 sm:flex-initial text-xs py-2 px-4 flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isEditing ? 'Update & Submit' : 'Submit Order'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Associate Mobile Bottom Navigation */}
      <AssociateBottomNavigation />
    </div>
  );
}

export default function CreateOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center flex flex-col items-center justify-center space-y-2">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-xs text-slate-500 font-medium">Loading create order page...</p>
        </div>
      }
    >
      <CreateOrderContent />
    </Suspense>
  );
}
