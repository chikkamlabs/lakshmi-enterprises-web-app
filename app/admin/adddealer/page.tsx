'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminHeader from '../header/page';
import AdminSidebar from '../sidebar/page';
import { addDealer, getStoredDealers } from '@/lib/dealersStore';
import { Store, ArrowLeft, Loader2, Save, X, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function AddDealerPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [dealerCode, setDealerCode] = useState('DLR-101');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [shopName, setShopName] = useState('');
  const [address, setAddress] = useState('');
  const [leCredit, setLeCredit] = useState('0');
  const [leCreditLimit, setLeCreditLimit] = useState('0');
  const [slsaCredit, setSlsaCredit] = useState('0');
  const [slsaCreditLimit, setSlsaCreditLimit] = useState('0');
  const [status, setStatus] = useState(true);

  // Auto-generate code
  useEffect(() => {
    let isMounted = true;
    getStoredDealers().then((dealers) => {
      if (isMounted && dealers.length > 0) {
        setDealerCode(`DLR-${101 + dealers.length}`);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

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
        name: name.trim(),
        mobile: mobile.trim() || null,
        shop_name: shopName.trim() || null,
        address: address.trim() || null,
        le_credit: Number(leCredit) || 0,
        le_credit_limit: Number(leCreditLimit) || 0,
        slsa_credit: Number(slsaCredit) || 0,
        slsa_credit_limit: Number(slsaCreditLimit) || 0,
        current_credit: Number(leCredit) || 0,
        credit_limit: Number(leCreditLimit) || 0,
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
                onClick={() => router.push('/admin/dealers/dashboard')}
                className="text-xs font-semibold text-slate-500 hover:text-indigo-600 flex items-center gap-1 mb-1 transition-colors"
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
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm rounded-xl flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
              <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {success && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs sm:text-sm rounded-xl flex items-center justify-between shadow-xs">
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
                    id="dealerName"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="form-input w-full rounded-lg border-slate-300"
                    placeholder="Enter full contact name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="shopName" className="form-label font-semibold text-slate-700 block mb-1">
                    Shop / Firm Name
                  </label>
                  <input
                    id="shopName"
                    type="text"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    className="form-input w-full rounded-lg border-slate-300"
                    placeholder="Enter shop or business name"
                  />
                </div>

                <div>
                  <label htmlFor="mobile" className="form-label font-semibold text-slate-700 block mb-1">
                    Mobile Number
                  </label>
                  <input
                    id="mobile"
                    type="text"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="form-input w-full rounded-lg border-slate-300"
                    placeholder="10-digit mobile number"
                  />
                </div>
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

              <div>
                <label htmlFor="address" className="form-label font-semibold text-slate-700 block mb-1">
                  Full Address
                </label>
                <textarea
                  id="address"
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="form-input w-full rounded-lg border-slate-300"
                  placeholder="Street address, city, district, state, pin code"
                />
              </div>

              <div>
                <label htmlFor="status" className="form-label font-semibold text-slate-700 block mb-1">
                  Account Status
                </label>
                <select
                  id="status"
                  value={status ? 'true' : 'false'}
                  onChange={(e) => setStatus(e.target.value === 'true')}
                  className="form-input w-full rounded-lg border-slate-300 bg-white"
                >
                  <option value="true">Active Dealer</option>
                  <option value="false">Inactive Dealer</option>
                </select>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => router.push('/admin/dealers/dashboard')}
                  className="btn-base btn-secondary text-xs sm:text-sm px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-base btn-primary text-xs sm:text-sm px-5 py-2 flex items-center gap-2 shadow-sm"
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
