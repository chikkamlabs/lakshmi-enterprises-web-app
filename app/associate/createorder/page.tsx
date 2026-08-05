'use client';

import { useEffect, useState, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  Save,
  Send,
  Store,
  Package,
  Loader2,
  X,
  ChevronDown,
  AlertCircle,
  ShoppingBag,
  Minus,
  Lock,
} from 'lucide-react';
import {
  getDealersForOrder,
  searchProductsForOrder,
  saveOrderToDatabase,
  getOrderByIdForEdit,
  updateOrderInDatabase,
  ProductSearchResult,
} from '../../../lib/createOrder';
import { Dealer } from '../../../lib/dealersStore';
import AssociateHeader from '../header/page';
import AssociateBottomNavigation from '../buttomnavigation/page';

export interface SelectedOrderItem {
  product: ProductSearchResult;
  requested_quantity: number;
  selling_price: number;
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

          if (result.dealer) {
            setSelectedDealer(result.dealer);
          }

          if (result.items && result.items.length > 0) {
            const mapped: SelectedOrderItem[] = result.items.map((it) => ({
              product: it.product || {
                id: it.product_id,
                name: 'Product ID: ' + it.product_id,
                product_code: it.product_id,
                selling_price: it.selling_price || 0,
              },
              requested_quantity: it.requested_quantity || 1,
              selling_price: it.selling_price || 0,
            }));
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
        if (isMounted) {
          setLoadingOrder(false);
        }
      }
    }

    loadExistingOrder(currentId);

    return () => {
      isMounted = false;
    };
  }, [editOrderId]);

  // Filtered dealers list
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

  // Handle product search filter
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products.slice(0, 10);
    const q = productSearch.toLowerCase().trim();
    return products.filter(
      (p) =>
        (p.product_code && p.product_code.toLowerCase().includes(q)) ||
        (p.id && p.id.toLowerCase().includes(q)) ||
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.company_name && p.company_name.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.toLowerCase().includes(q))
    );
  }, [products, productSearch]);

  // Add Product to Order Items
  const handleAddProduct = (product: ProductSearchResult) => {
    if (isReadOnly) return;
    setOrderItems((prev) => {
      const existingIdx = prev.findIndex((item) => item.product.id === product.id);
      if (existingIdx !== -1) {
        const updated = [...prev];
        updated[existingIdx].requested_quantity += 1;
        return updated;
      }
      return [
        ...prev,
        {
          product,
          requested_quantity: 1,
          selling_price: Number(product.selling_price) || 0,
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
        item.product.id === productId ? { ...item, requested_quantity: qty } : item
      )
    );
  };

  // Remove Item
  const handleRemoveItem = (productId: string) => {
    if (isReadOnly) return;
    setOrderItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

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
          dealer_id: selectedDealer.id,
          associate_status: associateStatus,
          notes: notes.trim() || undefined,
          items: orderItems.map((item) => ({
            product_id: item.product.id,
            requested_quantity: item.requested_quantity,
            selling_price: item.selling_price,
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
          dealer_id: selectedDealer.id,
          associate_status: associateStatus,
          notes: notes.trim() || undefined,
          items: orderItems.map((item) => ({
            product_id: item.product.id,
            requested_quantity: item.requested_quantity,
            selling_price: item.selling_price,
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

        {/* 1. Select Dealer Card */}
        <section className="bg-white rounded-lg border border-slate-200 p-3 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-indigo-600" />
              <div>
                <h2 className="text-xs font-bold text-slate-900">Select Dealer</h2>
                <p className="text-[10px] text-slate-500">Search dealer by name, code, shop or mobile</p>
              </div>
            </div>
            {selectedDealer && !isReadOnly && (
              <button
                onClick={() => {
                  setSelectedDealer(null);
                  setDealerSearch('');
                }}
                className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
              >
                Change
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
                  placeholder="Search dealer (name, code, mobile)..."
                  value={dealerSearch}
                  onChange={(e) => {
                    setDealerSearch(e.target.value);
                    setDealerDropdownOpen(true);
                  }}
                  onFocus={() => !isReadOnly && setDealerDropdownOpen(true)}
                  className="input-field has-left-icon pr-8 text-xs py-1.5 disabled:bg-slate-100"
                />
                <button
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => setDealerDropdownOpen(!dealerDropdownOpen)}
                  className="input-icon-btn"
                >
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${dealerDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Dealer Dropdown List: Only show Name, ID, Mobile */}
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
              <Package className="w-4 h-4 text-indigo-600" /> Search & Add Products
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

            {/* Product Search Results: Only show Name, ID, Company and (+) button */}
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

        {/* 3. Order Items Card: Just Name, ID, Company & ask quantity (No line total) */}
        <section className="bg-white rounded-lg border border-slate-200 p-3 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
            <h2 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4 text-indigo-600" /> Order Items ({orderItems.length})
            </h2>
            {orderItems.length > 0 && !isReadOnly && (
              <button
                type="button"
                onClick={() => setOrderItems([])}
                className="text-[11px] text-red-600 hover:text-red-800 font-medium"
              >
                Clear All
              </button>
            )}
          </div>

          {orderItems.length === 0 ? (
            <div className="p-6 text-center border border-dashed border-slate-200 rounded-lg bg-slate-50/50 space-y-1">
              <Package className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-600">No items added</p>
              <p className="text-[10px] text-slate-400">Search and tap (+) to add products</p>
            </div>
          ) : (
            <div className="space-y-2.5 divide-y divide-slate-100">
              {orderItems.map((item, idx) => (
                <div
                  key={item.product.id}
                  className="pt-2 first:pt-0 flex items-center justify-between gap-2"
                >
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold text-slate-400">#{idx + 1}</span>
                      <span className="text-xs font-semibold text-slate-900 truncate">{item.product.name}</span>
                      <span className="badge badge-neutral text-[10px] font-mono shrink-0">{item.product.product_code}</span>
                    </div>
                    {item.product.company_name && (
                      <div className="text-[10px] text-slate-500 truncate">
                        Company: {item.product.company_name}
                      </div>
                    )}
                  </div>

                  {/* Quantity input without line total */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md border border-slate-200">
                      <button
                        type="button"
                        disabled={isReadOnly}
                        onClick={() => handleQuantityChange(item.product.id, item.requested_quantity - 1)}
                        className="w-6 h-6 flex items-center justify-center rounded bg-white text-slate-700 hover:bg-slate-200 transition-colors font-bold text-xs shadow-xs disabled:opacity-50"
                        title="Decrease"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        disabled={isReadOnly}
                        value={item.requested_quantity}
                        onChange={(e) => handleQuantityChange(item.product.id, parseInt(e.target.value, 10))}
                        className="w-12 h-6 text-center text-xs font-bold bg-white border border-slate-200 rounded focus:outline-none focus:border-indigo-500 disabled:bg-slate-100"
                      />
                      <button
                        type="button"
                        disabled={isReadOnly}
                        onClick={() => handleQuantityChange(item.product.id, item.requested_quantity + 1)}
                        className="w-6 h-6 flex items-center justify-center rounded bg-white text-slate-700 hover:bg-slate-200 transition-colors font-bold text-xs shadow-xs disabled:opacity-50"
                        title="Increase"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.product.id)}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Remove Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Notes & Actions */}
        <section className="bg-white rounded-lg border border-slate-200 p-3 shadow-xs space-y-3">
          <div>
            <label className="form-label text-xs font-semibold">Order Notes / Remarks (Optional)</label>
            <textarea
              rows={2}
              disabled={isReadOnly}
              placeholder="Add any instructions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="textarea-field text-xs py-1.5 disabled:bg-slate-100"
            />
          </div>

          {!isReadOnly && (
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSaveOrder('Draft')}
                className="btn-base btn-secondary flex-1 sm:flex-none text-xs py-2 px-4"
              >
                {isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5 text-slate-600" />
                )}
                {isEditing ? 'Update Draft' : 'Save Draft'}
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSaveOrder('Submitted')}
                className="btn-base btn-primary flex-1 sm:flex-none text-xs py-2 px-4"
              >
                {isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                {isEditing ? 'Update & Submit' : 'Submit Order'}
              </button>
            </div>
          )}
        </section>
      </main>

      {/* Bottom Navigation */}
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
          <p className="text-xs text-slate-500 font-medium">Loading create order...</p>
        </div>
      }
    >
      <CreateOrderContent />
    </Suspense>
  );
}
