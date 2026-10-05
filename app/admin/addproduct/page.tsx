'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AdminHeader from '../header/page';
import AdminSidebar from '../sidebar/page';
import { addMultipleProducts, getStoredProducts } from '@/lib/productsStore';
import { getStoredCompanies, Company } from '@/lib/companiesStore';
import { getStoredCategories, Category } from '@/lib/categoriesStore';
import {
  Package,
  ArrowLeft,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Boxes,
  ChevronDown,
} from 'lucide-react';

interface ProductRowItem {
  id: string;
  product_code: string;
  product_name: string;
  company_id: string;
  category_id: string;
  mrp: string;
  selling_price: string;
}

export default function AddMultipleProductsPage() {
  const router = useRouter();

  // Dropdowns loaded from database
  const [companies, setCompanies] = useState<Company[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(true);

  // Status and submission states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [baseProductCount, setBaseProductCount] = useState(0);
  const rowIdCounter = useRef(1);

  // Multi-row product state (Starts with PRD-1001)
  const [rows, setRows] = useState<ProductRowItem[]>([
    {
      id: 'row-1',
      product_code: 'PRD-1001',
      product_name: '',
      company_id: '',
      category_id: '',
      mrp: '',
      selling_price: '',
    },
  ]);

  // Dropdown open state per field: key is `${rowIndex}-company` or `${rowIndex}-category`
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);

  // Ref map to store DOM focusable elements: key is `${rowIndex}-${colIndex}`
  // Column Index Mapping:
  // 0: product_code
  // 1: product_name
  // 2: company
  // 3: category
  // 4: mrp
  // 5: selling_price
  const inputRefs = useRef<Map<string, HTMLElement>>(new Map());
  const pendingFocusTarget = useRef<{ rowIndex: number; colIndex: number } | null>({
    rowIndex: 0,
    colIndex: 1, // product_name initially
  });

  // Focus a specific field in the grid
  const focusField = useCallback((rowIndex: number, colIndex: number) => {
    const key = `${rowIndex}-${colIndex}`;
    const el = inputRefs.current.get(key);
    if (el) {
      el.focus();
      if (el instanceof HTMLInputElement && el.type === 'text') {
        el.select();
      }
    }
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-dropdown-container]')) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initialize data from Supabase
  useEffect(() => {
    let isMounted = true;
    Promise.all([getStoredProducts(), getStoredCompanies(), getStoredCategories()])
      .then(([existingProducts, comps, cats]) => {
        if (!isMounted) return;
        setCompanies(comps);
        setCategories(cats);
        setBaseProductCount(existingProducts.length);
        setIsLoadingDropdowns(false);

        // Product code starts from PRD-1001 and increments +1
        const initialCode = `PRD-${1001 + existingProducts.length}`;
        rowIdCounter.current += 1;
        setRows([
          {
            id: `row-${rowIdCounter.current}`,
            product_code: initialCode,
            product_name: '',
            company_id: '',
            category_id: '',
            mrp: '',
            selling_price: '',
          },
        ]);

        // Trigger focus on first product_name
        pendingFocusTarget.current = { rowIndex: 0, colIndex: 1 };
      })
      .catch((err) => {
        console.error('Error initializing add product page:', err);
        if (isMounted) setIsLoadingDropdowns(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Execute pending focus whenever rows update
  useEffect(() => {
    if (pendingFocusTarget.current) {
      const { rowIndex, colIndex } = pendingFocusTarget.current;
      pendingFocusTarget.current = null;
      const timer = setTimeout(() => {
        focusField(rowIndex, colIndex);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [rows, focusField]);

  // Update a single field in a row
  const updateRowField = (
    index: number,
    field: keyof Omit<ProductRowItem, 'id'>,
    value: string
  ) => {
    setRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Add a new product row (PRD-1001 + 1 on every new one)
  const handleAddRow = (shouldFocus = true) => {
    const nextRowIndex = rows.length;
    const nextCodeNumber = 1001 + baseProductCount + nextRowIndex;
    rowIdCounter.current += 1;
    const newRow: ProductRowItem = {
      id: `row-${rowIdCounter.current}`,
      product_code: `PRD-${nextCodeNumber}`,
      product_name: '',
      company_id: '',
      category_id: '',
      mrp: '',
      selling_price: '',
    };

    if (shouldFocus) {
      pendingFocusTarget.current = { rowIndex: nextRowIndex, colIndex: 1 }; // Focus product_name
    }

    setRows((prev) => [...prev, newRow]);
  };

  // Remove a product row
  const handleRemoveRow = (indexToRemove: number) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Handle Keyboard Navigation for Inputs
  const handleInputKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    colIndex: number
  ) => {
    // Enter Key Navigation
    if (e.key === 'Enter') {
      e.preventDefault();
      if (colIndex === 5) {
        // Last field (S.P) -> Add new product row and focus at product name
        if (rowIndex === rows.length - 1) {
          handleAddRow(true);
        } else {
          focusField(rowIndex + 1, 1);
        }
      } else {
        // Move to next input
        focusField(rowIndex, colIndex + 1);
      }
      return;
    }

    // Right Arrow Key Navigation
    if (e.key === 'ArrowRight') {
      const input = e.currentTarget;
      const isAtEnd =
        input.selectionStart === null ||
        input.selectionStart === input.value.length;
      if (isAtEnd) {
        if (colIndex < 5) {
          e.preventDefault();
          focusField(rowIndex, colIndex + 1);
        } else if (rowIndex < rows.length - 1) {
          e.preventDefault();
          focusField(rowIndex + 1, 0);
        }
      }
      return;
    }

    // Left Arrow Key Navigation
    if (e.key === 'ArrowLeft') {
      const input = e.currentTarget;
      const isAtStart =
        input.selectionStart === 0 && input.selectionEnd === 0;
      if (isAtStart) {
        if (colIndex > 0) {
          e.preventDefault();
          focusField(rowIndex, colIndex - 1);
        } else if (rowIndex > 0) {
          e.preventDefault();
          focusField(rowIndex - 1, 5);
        }
      }
      return;
    }

    // Down Arrow (Vertical Navigation across rows)
    if (e.key === 'ArrowDown') {
      if (rowIndex < rows.length - 1) {
        e.preventDefault();
        focusField(rowIndex + 1, colIndex);
      }
    }

    // Up Arrow (Vertical Navigation across rows)
    if (e.key === 'ArrowUp') {
      if (rowIndex > 0) {
        e.preventDefault();
        focusField(rowIndex - 1, colIndex);
      }
    }
  };

  // Keyboard navigation for Company Dropdown
  const handleCompanyKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    rowIndex: number
  ) => {
    const dropdownKey = `${rowIndex}-company`;
    const isOpen = openDropdown === dropdownKey;

    if (e.key === 'Enter') {
      e.preventDefault();
      if (!isOpen) {
        // Open dropdown and set highlighted index
        const currentIdx = companies.findIndex((c) => c.id === rows[rowIndex].company_id);
        setHighlightedIndex(currentIdx >= 0 ? currentIdx : 0);
        setOpenDropdown(dropdownKey);
      } else {
        // Select highlighted company, close dropdown and move to Category (Col 3)
        if (companies.length > 0 && highlightedIndex >= 0 && highlightedIndex < companies.length) {
          updateRowField(rowIndex, 'company_id', companies[highlightedIndex].id);
        }
        setOpenDropdown(null);
        focusField(rowIndex, 3); // Move to Category
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        const currentIdx = companies.findIndex((c) => c.id === rows[rowIndex].company_id);
        setHighlightedIndex(currentIdx >= 0 ? currentIdx : 0);
        setOpenDropdown(dropdownKey);
      } else {
        setHighlightedIndex((prev) => (prev < companies.length - 1 ? prev + 1 : 0));
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (isOpen) {
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : companies.length - 1));
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setOpenDropdown(null);
      return;
    }

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setOpenDropdown(null);
      focusField(rowIndex, 3); // Move to Category
      return;
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setOpenDropdown(null);
      focusField(rowIndex, 1); // Move to Product Name
      return;
    }
  };

  // Keyboard navigation for Category Dropdown
  const handleCategoryKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    rowIndex: number
  ) => {
    const dropdownKey = `${rowIndex}-category`;
    const isOpen = openDropdown === dropdownKey;

    if (e.key === 'Enter') {
      e.preventDefault();
      if (!isOpen) {
        // Open dropdown and set highlighted index
        const currentIdx = categories.findIndex((c) => c.id === rows[rowIndex].category_id);
        setHighlightedIndex(currentIdx >= 0 ? currentIdx : 0);
        setOpenDropdown(dropdownKey);
      } else {
        // Select highlighted category, close dropdown and move to MRP (Col 4)
        if (categories.length > 0 && highlightedIndex >= 0 && highlightedIndex < categories.length) {
          updateRowField(rowIndex, 'category_id', categories[highlightedIndex].id);
        }
        setOpenDropdown(null);
        focusField(rowIndex, 4); // Move to MRP
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        const currentIdx = categories.findIndex((c) => c.id === rows[rowIndex].category_id);
        setHighlightedIndex(currentIdx >= 0 ? currentIdx : 0);
        setOpenDropdown(dropdownKey);
      } else {
        setHighlightedIndex((prev) => (prev < categories.length - 1 ? prev + 1 : 0));
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (isOpen) {
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : categories.length - 1));
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setOpenDropdown(null);
      return;
    }

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setOpenDropdown(null);
      focusField(rowIndex, 4); // Move to MRP
      return;
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setOpenDropdown(null);
      focusField(rowIndex, 2); // Move to Company
      return;
    }
  };

  // Submit and Insert all products
  const handleConfirmProducts = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    const invalidRows: string[] = [];
    const productCodes = new Set<string>();

    const payload = rows.map((row, idx) => {
      const rowNum = idx + 1;
      const code = row.product_code.trim();
      const name = row.product_name.trim();

      if (!code) {
        invalidRows.push(`Row #${rowNum}: Product Code is required.`);
      } else if (productCodes.has(code.toLowerCase())) {
        invalidRows.push(`Row #${rowNum}: Duplicate Product Code "${code}".`);
      } else {
        productCodes.add(code.toLowerCase());
      }

      if (!name) {
        invalidRows.push(`Row #${rowNum}: Product Name is required.`);
      }

      return {
        product_code: code,
        barcode: null,
        name: name,
        company_id: row.company_id || null,
        category_id: row.category_id || null,
        purchase_price: 0,
        selling_price: Number(row.selling_price) || 0,
        mrp: Number(row.mrp) || 0,
        ad_disc: 0,
        current_stock: 0,
        low_stock: 10,
        unit: 'pcs',
        status: true,
      };
    });

    if (invalidRows.length > 0) {
      setError(invalidRows[0]);
      return;
    }

    setIsSubmitting(true);
    try {
      const inserted = await addMultipleProducts(payload);
      const insertedCount = inserted.length || payload.length;

      setSuccess(
        `Successfully inserted ${insertedCount} product${
          insertedCount > 1 ? 's' : ''
        } into database! Redirecting...`
      );

      setTimeout(() => {
        router.push('/admin/products/dashboard');
      }, 900);
    } catch (err: unknown) {
      console.error('Failed to insert products:', err);
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to insert products into Supabase.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <AdminHeader />

      <div className="flex-1 flex flex-col md:flex-row">
        <AdminSidebar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto space-y-6">
          {/* Back Button */}
          <div>
            <button
              type="button"
              onClick={() => router.push('/admin/products/dashboard')}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-indigo-600 transition-colors shadow-2xs cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Products Dashboard</span>
            </button>
          </div>

          {/* Header Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-900/10 flex items-center justify-center text-amber-900 shrink-0">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Add New Products
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Enter products in single-row format. Use Left / Right arrow keys
                  and Enter to navigate across fields.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs">
                <Boxes className="w-4 h-4 text-slate-500" />
                <span>Total Rows: {rows.length}</span>
              </div>
            </div>
          </div>

          {/* Alert Messages */}
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm rounded-xl flex items-center justify-between shadow-xs animate-fade-in">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => setError('')}
                className="text-red-500 hover:text-red-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {success && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs sm:text-sm rounded-xl flex items-center justify-between shadow-xs animate-fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>{success}</span>
              </div>
            </div>
          )}

          {/* Product Entry Table Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Table Header Section */}
            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-slate-700" />
                <h2 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wider">
                  Product Entry Table ({rows.length} {rows.length === 1 ? 'Product' : 'Products'})
                </h2>
              </div>
              <span className="text-xs text-slate-500">
                Tap Enter on Company/Category to open list, Up/Down to navigate, Enter to select & move next
              </span>
            </div>

            {/* Horizontal Entry Table */}
            <form onSubmit={handleConfirmProducts}>
              <div className="overflow-x-auto min-h-[320px]">
                <table className="w-full text-left border-collapse min-w-[960px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      <th className="py-3 px-3 w-10 text-center">#</th>
                      <th className="py-3 px-3 w-36">Product Code *</th>
                      <th className="py-3 px-3 min-w-[220px]">Product Name *</th>
                      <th className="py-3 px-3 w-48">Company *</th>
                      <th className="py-3 px-3 w-48">Category *</th>
                      <th className="py-3 px-3 w-28">MRP (₹)</th>
                      <th className="py-3 px-3 w-28">S.P (₹)</th>
                      <th className="py-3 px-3 w-12 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {rows.map((row, rowIndex) => {
                      const selectedCompany = companies.find((c) => c.id === row.company_id);
                      const selectedCategory = categories.find((c) => c.id === row.category_id);
                      const isCompanyOpen = openDropdown === `${rowIndex}-company`;
                      const isCategoryOpen = openDropdown === `${rowIndex}-category`;

                      return (
                        <tr
                          key={row.id}
                          className="hover:bg-slate-50/60 transition-colors"
                        >
                          {/* Row Index */}
                          <td className="py-2.5 px-3 text-center font-bold text-slate-500 select-none">
                            {rowIndex + 1}
                          </td>

                          {/* Product Code (Col 0) */}
                          <td className="py-2.5 px-3">
                            <input
                              ref={(el) => {
                                if (el) inputRefs.current.set(`${rowIndex}-0`, el);
                                else inputRefs.current.delete(`${rowIndex}-0`);
                              }}
                              type="text"
                              required
                              value={row.product_code}
                              onChange={(e) =>
                                updateRowField(rowIndex, 'product_code', e.target.value)
                              }
                              onKeyDown={(e) => handleInputKeyDown(e, rowIndex, 0)}
                              className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-slate-900 font-mono text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                              placeholder="PRD-1001"
                            />
                          </td>

                          {/* Product Name (Col 1) */}
                          <td className="py-2.5 px-3">
                            <input
                              ref={(el) => {
                                if (el) inputRefs.current.set(`${rowIndex}-1`, el);
                                else inputRefs.current.delete(`${rowIndex}-1`);
                              }}
                              type="text"
                              required
                              value={row.product_name}
                              onChange={(e) =>
                                updateRowField(rowIndex, 'product_name', e.target.value)
                              }
                              onKeyDown={(e) => handleInputKeyDown(e, rowIndex, 1)}
                              className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-700/80 focus:border-amber-700 transition-all"
                              placeholder="e.g. Milton bottle"
                            />
                          </td>

                          {/* Company Dropdown (Col 2) */}
                          <td className="py-2.5 px-3 relative" data-dropdown-container>
                            <button
                              ref={(el) => {
                                if (el) inputRefs.current.set(`${rowIndex}-2`, el);
                                else inputRefs.current.delete(`${rowIndex}-2`);
                              }}
                              type="button"
                              onClick={() => {
                                if (isCompanyOpen) {
                                  setOpenDropdown(null);
                                } else {
                                  const currentIdx = companies.findIndex((c) => c.id === row.company_id);
                                  setHighlightedIndex(currentIdx >= 0 ? currentIdx : 0);
                                  setOpenDropdown(`${rowIndex}-company`);
                                }
                              }}
                              onKeyDown={(e) => handleCompanyKeyDown(e, rowIndex)}
                              disabled={isLoadingDropdowns}
                              className={`w-full h-10 px-3 rounded-lg border ${
                                isCompanyOpen
                                  ? 'border-indigo-500 ring-2 ring-indigo-500 bg-white'
                                  : 'border-slate-300 bg-white'
                              } text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all flex items-center justify-between gap-1 text-left cursor-pointer`}
                            >
                              <span className={`truncate ${selectedCompany ? 'text-slate-900 font-semibold' : 'text-slate-400'}`}>
                                {selectedCompany ? selectedCompany.name : 'Select Company'}
                              </span>
                              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            </button>

                            {/* Dropdown Popup */}
                            {isCompanyOpen && (
                              <div className="absolute top-full left-3 right-3 mt-1 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-50 divide-y divide-slate-100 animate-scale-in">
                                {companies.length === 0 ? (
                                  <div className="p-3 text-xs text-slate-400 text-center">
                                    No companies available
                                  </div>
                                ) : (
                                  companies.map((comp, cIdx) => (
                                    <div
                                      key={comp.id}
                                      onClick={() => {
                                        updateRowField(rowIndex, 'company_id', comp.id);
                                        setOpenDropdown(null);
                                        focusField(rowIndex, 3); // Move to category
                                      }}
                                      onMouseEnter={() => setHighlightedIndex(cIdx)}
                                      className={`px-3 py-2.5 text-xs cursor-pointer flex items-center justify-between transition-colors ${
                                        cIdx === highlightedIndex
                                          ? 'bg-indigo-50 text-indigo-700 font-semibold'
                                          : 'text-slate-700 hover:bg-slate-50'
                                      }`}
                                    >
                                      <span>{comp.name}</span>
                                      {comp.id === row.company_id && (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </td>

                          {/* Category Dropdown (Col 3) */}
                          <td className="py-2.5 px-3 relative" data-dropdown-container>
                            <button
                              ref={(el) => {
                                if (el) inputRefs.current.set(`${rowIndex}-3`, el);
                                else inputRefs.current.delete(`${rowIndex}-3`);
                              }}
                              type="button"
                              onClick={() => {
                                if (isCategoryOpen) {
                                  setOpenDropdown(null);
                                } else {
                                  const currentIdx = categories.findIndex((c) => c.id === row.category_id);
                                  setHighlightedIndex(currentIdx >= 0 ? currentIdx : 0);
                                  setOpenDropdown(`${rowIndex}-category`);
                                }
                              }}
                              onKeyDown={(e) => handleCategoryKeyDown(e, rowIndex)}
                              disabled={isLoadingDropdowns}
                              className={`w-full h-10 px-3 rounded-lg border ${
                                isCategoryOpen
                                  ? 'border-indigo-500 ring-2 ring-indigo-500 bg-white'
                                  : 'border-slate-300 bg-white'
                              } text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all flex items-center justify-between gap-1 text-left cursor-pointer`}
                            >
                              <span className={`truncate ${selectedCategory ? 'text-slate-900 font-semibold' : 'text-slate-400'}`}>
                                {selectedCategory ? selectedCategory.name : 'Select Category'}
                              </span>
                              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            </button>

                            {/* Dropdown Popup */}
                            {isCategoryOpen && (
                              <div className="absolute top-full left-3 right-3 mt-1 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-50 divide-y divide-slate-100 animate-scale-in">
                                {categories.length === 0 ? (
                                  <div className="p-3 text-xs text-slate-400 text-center">
                                    No categories available
                                  </div>
                                ) : (
                                  categories.map((cat, catIdx) => (
                                    <div
                                      key={cat.id}
                                      onClick={() => {
                                        updateRowField(rowIndex, 'category_id', cat.id);
                                        setOpenDropdown(null);
                                        focusField(rowIndex, 4); // Move to MRP
                                      }}
                                      onMouseEnter={() => setHighlightedIndex(catIdx)}
                                      className={`px-3 py-2.5 text-xs cursor-pointer flex items-center justify-between transition-colors ${
                                        catIdx === highlightedIndex
                                          ? 'bg-indigo-50 text-indigo-700 font-semibold'
                                          : 'text-slate-700 hover:bg-slate-50'
                                      }`}
                                    >
                                      <span>{cat.name}</span>
                                      {cat.id === row.category_id && (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </td>

                          {/* MRP (Col 4) */}
                          <td className="py-2.5 px-3">
                            <input
                              ref={(el) => {
                                if (el) inputRefs.current.set(`${rowIndex}-4`, el);
                                else inputRefs.current.delete(`${rowIndex}-4`);
                              }}
                              type="number"
                              step="0.01"
                              min="0"
                              value={row.mrp}
                              onChange={(e) =>
                                updateRowField(rowIndex, 'mrp', e.target.value)
                              }
                              onKeyDown={(e) => handleInputKeyDown(e, rowIndex, 4)}
                              className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-right"
                              placeholder="0.00"
                            />
                          </td>

                          {/* S.P (Col 5) */}
                          <td className="py-2.5 px-3">
                            <input
                              ref={(el) => {
                                if (el) inputRefs.current.set(`${rowIndex}-5`, el);
                                else inputRefs.current.delete(`${rowIndex}-5`);
                              }}
                              type="number"
                              step="0.01"
                              min="0"
                              value={row.selling_price}
                              onChange={(e) =>
                                updateRowField(rowIndex, 'selling_price', e.target.value)
                              }
                              onKeyDown={(e) => handleInputKeyDown(e, rowIndex, 5)}
                              className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-right"
                              placeholder="0.00"
                            />
                          </td>

                          {/* Delete Row Action */}
                          <td className="py-2.5 px-3 text-center">
                            {rows.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveRow(rowIndex)}
                                title="Delete Row"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Add Row Button Row */}
              <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => handleAddRow(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-900 text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors cursor-pointer w-fit"
                >
                  <Plus className="w-4 h-4" />
                  <span>(+) Add Another Product Row</span>
                </button>

                <span className="text-xs text-slate-500 font-medium">
                  Ready to insert {rows.filter((r) => r.product_name.trim()).length || rows.length} product item into the database
                </span>
              </div>

              {/* Submit & Cancel Actions Bar */}
              <div className="p-4 sm:p-5 border-t border-slate-200 bg-white flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => router.push('/admin/products/dashboard')}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-stone-900 hover:bg-black text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Inserting Products...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Confirm products (Insert into products)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
