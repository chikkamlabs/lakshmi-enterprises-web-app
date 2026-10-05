'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AdminHeader from '../header/page';
import AdminSidebar from '../sidebar/page';
import { addDealer, getStoredDealers, DealerFirmType } from '@/lib/dealersStore';
import { getStoredGroups, Group } from '@/lib/groupsStore';
import {
  Store,
  ArrowLeft,
  Loader2,
  Save,
  X,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';

export default function AddDealerPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [dealerCode, setDealerCode] = useState('DLR-101');
  const [name, setName] = useState('');
  const [hasCustomShopName, setHasCustomShopName] = useState(false);
  const [shopName, setShopName] = useState('');
  const [groupId, setGroupId] = useState('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [firmType, setFirmType] = useState<DealerFirmType>('BOTH');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [leCredit, setLeCredit] = useState('0');
  const [leCreditLimit, setLeCreditLimit] = useState('0');
  const [slsaCredit, setSlsaCredit] = useState('0');
  const [slsaCreditLimit, setSlsaCreditLimit] = useState('0');
  const [status, setStatus] = useState(true);

  // Group Dropdown state
  const [isGroupOpen, setIsGroupOpen] = useState(false);
  const [highlightedGroupIdx, setHighlightedGroupIdx] = useState(0);

  // Focusable refs
  const dealerNameRef = useRef<HTMLInputElement | null>(null);
  const groupButtonRef = useRef<HTMLButtonElement | null>(null);
  const shopNameRef = useRef<HTMLInputElement | null>(null);
  const mobileRef = useRef<HTMLInputElement | null>(null);
  const firmTypeRef = useRef<HTMLSelectElement | null>(null);
  const addressRef = useRef<HTMLTextAreaElement | null>(null);
  const leCreditRef = useRef<HTMLInputElement | null>(null);
  const leCreditLimitRef = useRef<HTMLInputElement | null>(null);
  const slsaCreditRef = useRef<HTMLInputElement | null>(null);
  const slsaCreditLimitRef = useRef<HTMLInputElement | null>(null);
  const statusRef = useRef<HTMLSelectElement | null>(null);

  // Direct focus on Dealer Name on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      dealerNameRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-group-dropdown-container]')) {
        setIsGroupOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-generate code & load groups
  useEffect(() => {
    let isMounted = true;
    Promise.all([getStoredDealers(), getStoredGroups()]).then(([dealers, groupsList]) => {
      if (isMounted) {
        if (dealers.length > 0) {
          setDealerCode(`DLR-${101 + dealers.length}`);
        }
        setGroups(groupsList);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle Dealer Name change with auto-snapshot to Shop / Firm Name
  const handleDealerNameChange = (val: string) => {
    setName(val);
    if (!hasCustomShopName) {
      setShopName(val);
    }
  };

  // Keyboard navigation on Dealer Name
  const handleDealerNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      groupButtonRef.current?.focus();
      return;
    }
    if (e.key === 'ArrowRight') {
      const input = e.currentTarget;
      if (input.selectionStart === input.value.length) {
        e.preventDefault();
        groupButtonRef.current?.focus();
      }
    }
  };

  // Keyboard navigation on Group Dropdown
  const handleGroupKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const totalOptions = groups.length + 1; // including "-- None / Optional --"

    if (e.key === 'Enter') {
      e.preventDefault();
      if (!isGroupOpen) {
        // Open dropdown
        const currentIdx = groups.findIndex((g) => g.id === groupId);
        setHighlightedGroupIdx(currentIdx >= 0 ? currentIdx + 1 : 0);
        setIsGroupOpen(true);
      } else {
        // Select highlighted group, close, and move to shopName
        if (highlightedGroupIdx === 0) {
          setGroupId('');
        } else if (highlightedGroupIdx - 1 < groups.length) {
          setGroupId(groups[highlightedGroupIdx - 1].id);
        }
        setIsGroupOpen(false);
        shopNameRef.current?.focus();
        shopNameRef.current?.select();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isGroupOpen) {
        const currentIdx = groups.findIndex((g) => g.id === groupId);
        setHighlightedGroupIdx(currentIdx >= 0 ? currentIdx + 1 : 0);
        setIsGroupOpen(true);
      } else {
        setHighlightedGroupIdx((prev) => (prev < totalOptions - 1 ? prev + 1 : 0));
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (isGroupOpen) {
        setHighlightedGroupIdx((prev) => (prev > 0 ? prev - 1 : totalOptions - 1));
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsGroupOpen(false);
      return;
    }

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setIsGroupOpen(false);
      shopNameRef.current?.focus();
      shopNameRef.current?.select();
      return;
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setIsGroupOpen(false);
      dealerNameRef.current?.focus();
      return;
    }
  };

  // Keyboard navigation on Shop Name
  const handleShopNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      mobileRef.current?.focus();
      return;
    }
    if (e.key === 'ArrowRight') {
      const input = e.currentTarget;
      if (input.selectionStart === input.value.length) {
        e.preventDefault();
        mobileRef.current?.focus();
      }
    } else if (e.key === 'ArrowLeft') {
      const input = e.currentTarget;
      if (input.selectionStart === 0) {
        e.preventDefault();
        groupButtonRef.current?.focus();
      }
    }
  };

  // Keyboard navigation for Mobile
  const handleMobileKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      firmTypeRef.current?.focus();
      return;
    }
    if (e.key === 'ArrowRight') {
      const input = e.currentTarget;
      if (input.selectionStart === input.value.length) {
        e.preventDefault();
        firmTypeRef.current?.focus();
      }
    } else if (e.key === 'ArrowLeft') {
      const input = e.currentTarget;
      if (input.selectionStart === 0) {
        e.preventDefault();
        shopNameRef.current?.focus();
      }
    }
  };

  // Keyboard navigation for Firm Type
  const handleFirmTypeKeyDown = (e: React.KeyboardEvent<HTMLSelectElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addressRef.current?.focus();
      return;
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      addressRef.current?.focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      mobileRef.current?.focus();
    }
  };

  // Keyboard navigation for Address
  const handleAddressKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      leCreditRef.current?.focus();
      return;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim()) {
      setError('Dealer Name is required.');
      return;
    }
    if (!dealerCode.trim()) {
      setError('Dealer Code is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await addDealer({
        dealer_code: dealerCode.trim(),
        group_id: groupId || null,
        name: name.trim(),
        firm_type: firmType,
        mobile: mobile.trim() || null,
        shop_name: shopName.trim() || null,
        address: address.trim() || null,
        le_credit: Number(leCredit) || 0,
        le_credit_limit: Number(leCreditLimit) || 0,
        slsa_credit: Number(slsaCredit) || 0,
        slsa_credit_limit: Number(slsaCreditLimit) || 0,
        status: status,
      });

      if (created) {
        setSuccess(`Dealer "${created.name}" created successfully! Redirecting...`);
        setTimeout(() => {
          router.push('/admin/dealers/dashboard');
        }, 800);
      }
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Failed to save dealer to Supabase.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedGroup = groups.find((g) => g.id === groupId);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <AdminHeader />

      <div className="flex-1 flex flex-col md:flex-row">
        <AdminSidebar />

        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-4xl w-full mx-auto space-y-6">
          {/* Top Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <button
                type="button"
                onClick={() => router.push('/admin/dealers/dashboard')}
                className="text-xs font-semibold text-slate-500 hover:text-indigo-600 flex items-center gap-1 mb-1 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Dealers List</span>
              </button>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Store className="w-6 h-6 text-indigo-600" />
                <span>Add New Dealer</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Register a new dealer account directly in Supabase.
              </p>
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

          {/* Form Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Dealer Information Form
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs sm:text-sm">
              {/* Row 1: Dealer Code & Dealer Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="dealerCode" className="form-label font-semibold text-slate-700 block mb-1">
                    Dealer Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="dealerCode"
                    type="text"
                    required
                    value={dealerCode}
                    onChange={(e) => setDealerCode(e.target.value)}
                    className="form-input w-full rounded-lg border-slate-300 font-mono"
                    placeholder="e.g. DLR-101"
                  />
                </div>

                <div>
                  <label htmlFor="dealerName" className="form-label font-semibold text-slate-700 block mb-1">
                    Dealer Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={dealerNameRef}
                    id="dealerName"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => handleDealerNameChange(e.target.value)}
                    onKeyDown={handleDealerNameKeyDown}
                    className="form-input w-full rounded-lg border-slate-300 font-medium focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter full contact name"
                  />
                </div>
              </div>

              {/* Row 2: Group Classification & Shop / Firm Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative" data-group-dropdown-container>
                  <label className="form-label font-semibold text-slate-700 block mb-1">
                    Group Classification
                  </label>
                  <button
                    ref={groupButtonRef}
                    type="button"
                    onClick={() => {
                      if (isGroupOpen) {
                        setIsGroupOpen(false);
                      } else {
                        const currentIdx = groups.findIndex((g) => g.id === groupId);
                        setHighlightedGroupIdx(currentIdx >= 0 ? currentIdx + 1 : 0);
                        setIsGroupOpen(true);
                      }
                    }}
                    onKeyDown={handleGroupKeyDown}
                    className={`form-input w-full rounded-lg border ${
                      isGroupOpen ? 'border-indigo-500 ring-2 ring-indigo-500 bg-white' : 'border-slate-300 bg-white'
                    } text-left flex items-center justify-between gap-1 cursor-pointer min-h-[42px] px-3`}
                  >
                    <span className={`truncate ${selectedGroup ? 'text-slate-900 font-medium' : 'text-slate-500'}`}>
                      {selectedGroup ? `${selectedGroup.group_name} (${selectedGroup.group_id})` : '-- Select Group (Optional) --'}
                    </span>
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  </button>

                  {/* Custom Dropdown Popup */}
                  {isGroupOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-50 divide-y divide-slate-100 animate-scale-in">
                      <div
                        onClick={() => {
                          setGroupId('');
                          setIsGroupOpen(false);
                          shopNameRef.current?.focus();
                        }}
                        onMouseEnter={() => setHighlightedGroupIdx(0)}
                        className={`px-3.5 py-2.5 text-xs cursor-pointer flex items-center justify-between transition-colors ${
                          highlightedGroupIdx === 0
                            ? 'bg-indigo-50 text-indigo-700 font-semibold'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span>-- None / No Group --</span>
                        {!groupId && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
                      </div>

                      {groups.map((grp, gIdx) => {
                        const optionIndex = gIdx + 1;
                        return (
                          <div
                            key={grp.id}
                            onClick={() => {
                              setGroupId(grp.id);
                              setIsGroupOpen(false);
                              shopNameRef.current?.focus();
                            }}
                            onMouseEnter={() => setHighlightedGroupIdx(optionIndex)}
                            className={`px-3.5 py-2.5 text-xs cursor-pointer flex items-center justify-between transition-colors ${
                              highlightedGroupIdx === optionIndex
                                ? 'bg-indigo-50 text-indigo-700 font-semibold'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span>
                              {grp.group_name} <span className="text-slate-400 font-mono">({grp.group_id})</span>
                            </span>
                            {grp.id === groupId && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="shopName" className="form-label font-semibold text-slate-700 block mb-1">
                    Shop / Firm Name
                  </label>
                  <input
                    ref={shopNameRef}
                    id="shopName"
                    type="text"
                    value={shopName}
                    onChange={(e) => {
                      setShopName(e.target.value);
                      setHasCustomShopName(true);
                    }}
                    onKeyDown={handleShopNameKeyDown}
                    className="form-input w-full rounded-lg border-slate-300"
                    placeholder="Enter shop or business name"
                  />
                </div>
              </div>

              {/* Row 3: Mobile Number & Firm Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="mobile" className="form-label font-semibold text-slate-700 block mb-1">
                    Mobile Number
                  </label>
                  <input
                    ref={mobileRef}
                    id="mobile"
                    type="text"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    onKeyDown={handleMobileKeyDown}
                    className="form-input w-full rounded-lg border-slate-300"
                    placeholder="10-digit mobile number"
                  />
                </div>

                <div>
                  <label htmlFor="firmType" className="form-label font-semibold text-slate-700 block mb-1">
                    Firm Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    ref={firmTypeRef}
                    id="firmType"
                    value={firmType}
                    onChange={(e) => setFirmType(e.target.value as DealerFirmType)}
                    onKeyDown={handleFirmTypeKeyDown}
                    className="form-input w-full rounded-lg border-slate-300 bg-white font-medium cursor-pointer"
                    required
                  >
                    <option value="BOTH">BOTH (LE & SLSA)</option>
                    <option value="LE">LE (Lakshmi Enterprises)</option>
                    <option value="SLSA">SLSA</option>
                  </select>
                </div>
              </div>

              {/* Row 4: Address (Asked right after Firm Type) */}
              <div>
                <label htmlFor="address" className="form-label font-semibold text-slate-700 block mb-1">
                  Full Address
                </label>
                <textarea
                  ref={addressRef}
                  id="address"
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  onKeyDown={handleAddressKeyDown}
                  className="form-input w-full rounded-lg border-slate-300"
                  placeholder="Street address, city, district, state, pin code"
                />
              </div>

              {/* LE Firm Credit Section */}
              <div className="p-4 bg-indigo-50/40 rounded-xl border border-indigo-100 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                    LE (Lakshmi Enterprises) Credit Configuration
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="leCredit" className="form-label font-semibold text-slate-700 block mb-1">
                      LE Initial Credit (₹)
                    </label>
                    <input
                      ref={leCreditRef}
                      id="leCredit"
                      type="number"
                      step="0.01"
                      min="0"
                      value={leCredit}
                      onChange={(e) => setLeCredit(e.target.value)}
                      className="form-input w-full rounded-lg border-slate-300 font-bold text-indigo-950 bg-white"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label htmlFor="leCreditLimit" className="form-label font-semibold text-slate-700 block mb-1">
                      LE Credit Limit (₹)
                    </label>
                    <input
                      ref={leCreditLimitRef}
                      id="leCreditLimit"
                      type="number"
                      step="0.01"
                      min="0"
                      value={leCreditLimit}
                      onChange={(e) => setLeCreditLimit(e.target.value)}
                      className="form-input w-full rounded-lg border-slate-300 bg-white"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              {/* SLSA Firm Credit Section */}
              <div className="p-4 bg-purple-50/40 rounded-xl border border-purple-100 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-purple-900">
                    SLSA Credit Configuration
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="slsaCredit" className="form-label font-semibold text-slate-700 block mb-1">
                      SLSA Initial Credit (₹)
                    </label>
                    <input
                      ref={slsaCreditRef}
                      id="slsaCredit"
                      type="number"
                      step="0.01"
                      min="0"
                      value={slsaCredit}
                      onChange={(e) => setSlsaCredit(e.target.value)}
                      className="form-input w-full rounded-lg border-slate-300 font-bold text-purple-950 bg-white"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label htmlFor="slsaCreditLimit" className="form-label font-semibold text-slate-700 block mb-1">
                      SLSA Credit Limit (₹)
                    </label>
                    <input
                      ref={slsaCreditLimitRef}
                      id="slsaCreditLimit"
                      type="number"
                      step="0.01"
                      min="0"
                      value={slsaCreditLimit}
                      onChange={(e) => setSlsaCreditLimit(e.target.value)}
                      className="form-input w-full rounded-lg border-slate-300 bg-white"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              {/* Account Status */}
              <div>
                <label htmlFor="status" className="form-label font-semibold text-slate-700 block mb-1">
                  Account Status
                </label>
                <select
                  ref={statusRef}
                  id="status"
                  value={status ? 'true' : 'false'}
                  onChange={(e) => setStatus(e.target.value === 'true')}
                  className="form-input w-full rounded-lg border-slate-300 bg-white cursor-pointer"
                >
                  <option value="true">Active Dealer</option>
                  <option value="false">Inactive Dealer</option>
                </select>
              </div>

              {/* Actions */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => router.push('/admin/dealers/dashboard')}
                  className="btn-base btn-secondary text-xs sm:text-sm px-4 py-2 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-base btn-primary text-xs sm:text-sm px-5 py-2 flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Dealer...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Dealer</span>
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
