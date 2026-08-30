'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AdminHeader from '../header/page';
import AdminSidebar from '../sidebar/page';
import { getDealerById, getStoredDealers, updateDealer, Dealer } from '@/lib/dealersStore';
import { getStoredGroups, Group } from '@/lib/groupsStore';
import { Edit2, ArrowLeft, Loader2, Save, X, AlertCircle, CheckCircle2, Store, Layers } from 'lucide-react';

function EditDealerForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dealerId = searchParams.get('id');

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [targetDealer, setTargetDealer] = useState<Dealer | null>(null);

  // Form states
  const [dealerCode, setDealerCode] = useState('');
  const [name, setName] = useState('');
  const [groupId, setGroupId] = useState('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [mobile, setMobile] = useState('');
  const [shopName, setShopName] = useState('');
  const [address, setAddress] = useState('');
  const [leCredit, setLeCredit] = useState('0');
  const [leCreditLimit, setLeCreditLimit] = useState('0');
  const [slsaCredit, setSlsaCredit] = useState('0');
  const [slsaCreditLimit, setSlsaCreditLimit] = useState('0');
  const [status, setStatus] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadDealer() {
      if (!dealerId) {
        setIsLoading(false);
        setError('No Dealer ID provided in URL parameters.');
        return;
      }

      setIsLoading(true);
      setError('');
      try {
        const [groupsList, fetchedDealer] = await Promise.all([
          getStoredGroups(),
          getDealerById(dealerId),
        ]);

        let dealer = fetchedDealer;

        // Fallback search if direct ID lookup fails
        if (!dealer) {
          const all = await getStoredDealers();
          dealer = all.find((d) => d.id === dealerId || d.dealer_code === dealerId) || null;
        }

        if (isMounted) {
          setGroups(groupsList);
          if (dealer) {
            setTargetDealer(dealer);
            setDealerCode(dealer.dealer_code || '');
            setName(dealer.name || '');
            setGroupId(dealer.group_id || dealer.group?.id || '');
            setMobile(dealer.mobile || '');
            setShopName(dealer.shop_name || '');
            setAddress(dealer.address || '');
            setLeCredit(String(dealer.le_credit ?? dealer.current_credit ?? 0));
            setLeCreditLimit(String(dealer.le_credit_limit ?? dealer.credit_limit ?? 0));
            setSlsaCredit(String(dealer.slsa_credit ?? 0));
            setSlsaCreditLimit(String(dealer.slsa_credit_limit ?? 0));
            setStatus(dealer.status ?? true);
          } else {
            setError('Dealer record not found in database.');
          }
        }
      } catch (err: unknown) {
        console.error('Error fetching dealer details:', err);
        if (isMounted) {
          setError('Failed to fetch dealer details from Supabase.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadDealer();

    return () => {
      isMounted = false;
    };
  }, [dealerId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetDealer) return;

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
      const updated = await updateDealer(targetDealer.id, {
        dealer_code: dealerCode.trim(),
        group_id: groupId || null,
        name: name.trim(),
        mobile: mobile.trim() || null,
        shop_name: shopName.trim() || null,
        address: address.trim() || null,
        le_credit: Number(leCredit) || 0,
        le_credit_limit: Number(leCreditLimit) || 0,
        slsa_credit: Number(slsaCredit) || 0,
        slsa_credit_limit: Number(slsaCreditLimit) || 0,
        status: status,
      });

      if (updated) {
        setSuccess(`Dealer "${updated.name}" updated successfully! Redirecting...`);
        setTimeout(() => {
          router.push('/admin/dealers/dashboard');
        }, 800);
      }
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Failed to update dealer in Supabase.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-700">Loading dealer record...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <button
          onClick={() => router.push('/admin/dealers/dashboard')}
          className="text-xs font-semibold text-slate-500 hover:text-indigo-600 flex items-center gap-1 mb-1 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dealers List</span>
        </button>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Edit2 className="w-6 h-6 text-indigo-600" />
          <span>Edit Dealer Details</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Update account information and credit limits for <span className="font-semibold text-slate-800">{name || 'Dealer'}</span>.
        </p>
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

      {!targetDealer ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-3">
          <Store className="w-12 h-12 text-slate-300 mx-auto" />
          <p className="text-base font-semibold text-slate-800">Dealer Not Found</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            The requested dealer ID does not exist or was removed.
          </p>
          <button
            onClick={() => router.push('/admin/dealers/dashboard')}
            className="btn-base btn-primary text-xs inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Dealers List</span>
          </button>
        </div>
      ) : (
        /* Form Card */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Dealer ID: <span className="font-mono text-indigo-600">{dealerCode}</span>
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs sm:text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="editDealerCode" className="form-label font-semibold text-slate-700 block mb-1">
                  Dealer Code <span className="text-red-500">*</span>
                </label>
                <input
                  id="editDealerCode"
                  type="text"
                  required
                  value={dealerCode}
                  onChange={(e) => setDealerCode(e.target.value)}
                  className="form-input w-full rounded-lg border-slate-300 font-mono"
                />
              </div>

              <div>
                <label htmlFor="editDealerName" className="form-label font-semibold text-slate-700 block mb-1">
                  Dealer Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="editDealerName"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="form-input w-full rounded-lg border-slate-300"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="editDealerGroup" className="form-label font-semibold text-slate-700 block mb-1">
                  Group Classification
                </label>
                <select
                  id="editDealerGroup"
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  className="form-input w-full rounded-lg border-slate-300 bg-white"
                >
                  <option value="">-- No Group / Select Group --</option>
                  {groups.map((grp) => (
                    <option key={grp.id} value={grp.id}>
                      {grp.group_name} ({grp.group_id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="editShopName" className="form-label font-semibold text-slate-700 block mb-1">
                  Shop / Firm Name
                </label>
                <input
                  id="editShopName"
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="form-input w-full rounded-lg border-slate-300"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="editMobile" className="form-label font-semibold text-slate-700 block mb-1">
                  Mobile Number
                </label>
                <input
                  id="editMobile"
                  type="text"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="form-input w-full rounded-lg border-slate-300"
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
                  <label htmlFor="editLeCredit" className="form-label font-semibold text-slate-700 block mb-1">
                    LE Credit Balance (₹)
                  </label>
                  <input
                    id="editLeCredit"
                    type="number"
                    step="0.01"
                    min="0"
                    value={leCredit}
                    onChange={(e) => setLeCredit(e.target.value)}
                    className="form-input w-full rounded-lg border-slate-300 font-bold text-indigo-950 bg-white"
                  />
                </div>

                <div>
                  <label htmlFor="editLeCreditLimit" className="form-label font-semibold text-slate-700 block mb-1">
                    LE Credit Limit (₹)
                  </label>
                  <input
                    id="editLeCreditLimit"
                    type="number"
                    step="0.01"
                    min="0"
                    value={leCreditLimit}
                    onChange={(e) => setLeCreditLimit(e.target.value)}
                    className="form-input w-full rounded-lg border-slate-300 bg-white"
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
                  <label htmlFor="editSlsaCredit" className="form-label font-semibold text-slate-700 block mb-1">
                    SLSA Credit Balance (₹)
                  </label>
                  <input
                    id="editSlsaCredit"
                    type="number"
                    step="0.01"
                    min="0"
                    value={slsaCredit}
                    onChange={(e) => setSlsaCredit(e.target.value)}
                    className="form-input w-full rounded-lg border-slate-300 font-bold text-purple-950 bg-white"
                  />
                </div>

                <div>
                  <label htmlFor="editSlsaCreditLimit" className="form-label font-semibold text-slate-700 block mb-1">
                    SLSA Credit Limit (₹)
                  </label>
                  <input
                    id="editSlsaCreditLimit"
                    type="number"
                    step="0.01"
                    min="0"
                    value={slsaCreditLimit}
                    onChange={(e) => setSlsaCreditLimit(e.target.value)}
                    className="form-input w-full rounded-lg border-slate-300 bg-white"
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="editAddress" className="form-label font-semibold text-slate-700 block mb-1">
                Full Address
              </label>
              <textarea
                id="editAddress"
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="form-input w-full rounded-lg border-slate-300"
              />
            </div>

            <div>
              <label htmlFor="editStatus" className="form-label font-semibold text-slate-700 block mb-1">
                Account Status
              </label>
              <select
                id="editStatus"
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
                    <span>Updating Dealer...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Update Dealer</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default function EditDealerPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <AdminHeader />

      <div className="flex-1 flex flex-col md:flex-row">
        <AdminSidebar />

        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-4xl w-full mx-auto space-y-6">
          <Suspense
            fallback={
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
                <p className="text-sm font-medium text-slate-700">Loading form component...</p>
              </div>
            }
          >
            <EditDealerForm />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
