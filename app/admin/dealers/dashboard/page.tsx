'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import AdminHeader from '../../header/page';
import AdminSidebar from '../../sidebar/page';
import { getStoredDealers, Dealer } from '@/lib/dealersStore';
import {
  Plus,
  Search,
  Store,
  CreditCard,
  Edit2,
  Phone,
  MapPin,
  Building,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2,
} from 'lucide-react';

export default function AdminDealersDashboardPage() {
  const router = useRouter();
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');

  const fetchDealers = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getStoredDealers();
      setDealers(data);
    } catch (err: unknown) {
      console.error('Failed to load dealers:', err);
      setError('Could not load dealers from database.');
      setDealers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    getStoredDealers()
      .then((data) => {
        if (isMounted) {
          setDealers(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load dealers:', err);
        if (isMounted) {
          setDealers([]);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Compute metrics: Total Dealers & Total Credit (Sum of dealers.current_credit)
  const totalDealers = dealers.length;
  const totalCredit = useMemo(() => {
    return dealers.reduce((sum, dealer) => sum + (Number(dealer.current_credit) || 0), 0);
  }, [dealers]);

  // Filter dealers
  const filteredDealers = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return dealers;
    return dealers.filter(
      (d) =>
        (d.name || '').toLowerCase().includes(query) ||
        (d.dealer_code || '').toLowerCase().includes(query) ||
        (d.mobile || '').toLowerCase().includes(query) ||
        (d.shop_name || '').toLowerCase().includes(query) ||
        (d.address || '').toLowerCase().includes(query)
    );
  }, [dealers, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <AdminHeader />

      <div className="flex-1 flex flex-col md:flex-row">
        <AdminSidebar />

        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Top Title & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Store className="w-6 h-6 text-indigo-600" />
                <span>Dealers Management</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Monitor dealer accounts, credit balances, and store details.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchDealers}
                disabled={isLoading}
                className="btn-base btn-secondary text-xs flex items-center gap-1.5"
                title="Refresh from Supabase"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              <button
                onClick={() => router.push('/admin/adddealer')}
                className="btn-base btn-primary text-xs sm:text-sm flex items-center gap-2 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Add Dealer</span>
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm rounded-lg flex items-center justify-between">
              <span>{error}</span>
            </div>
          )}

          {/* Metrics Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Card 1: Total Dealers (Count) */}
            <div className="card-base bg-white border border-slate-200 shadow-xs p-5 flex items-center justify-between rounded-xl">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Total Dealers
                </p>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                  {isLoading ? '...' : totalDealers}
                </h3>
                <p className="text-xs text-slate-400 mt-1">Registered dealer network</p>
              </div>
              <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                <Store className="w-6 h-6" />
              </div>
            </div>

            {/* Card 2: Total Credit (Sum of current_credit) */}
            <div className="card-base bg-white border border-slate-200 shadow-xs p-5 flex items-center justify-between rounded-xl">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Total Credit
                </p>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-indigo-700 mt-1 flex items-center">
                  <span className="text-lg font-bold mr-0.5">₹</span>
                  {isLoading ? '...' : totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </h3>
                <p className="text-xs text-slate-400 mt-1">Sum of all dealers.current_credit</p>
              </div>
              <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                <CreditCard className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Search & Counter Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, code, shop, or mobile..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input pl-9 pr-4 py-2 text-xs sm:text-sm w-full rounded-lg border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div className="text-xs text-slate-500 self-end sm:self-center">
              Showing <span className="font-semibold text-slate-800">{filteredDealers.length}</span> of{' '}
              <span className="font-semibold text-slate-800">{dealers.length}</span> dealers
            </div>
          </div>

          {/* Dealers Data Table & Mobile List */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            {isLoading ? (
              <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
                <p className="text-sm font-medium">Loading dealers from database...</p>
              </div>
            ) : filteredDealers.length === 0 ? (
              <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center">
                <Store className="w-12 h-12 text-slate-300 mb-3" />
                <p className="text-base font-semibold text-slate-700">No dealers available</p>
                <p className="text-xs text-slate-400 max-w-xs mt-1">
                  {searchQuery ? 'Try clearing search filter.' : 'Click "Add Dealer" to register your first dealer entry.'}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => router.push('/admin/adddealer')}
                    className="btn-base btn-primary text-xs mt-4 flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Dealer</span>
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Desktop & Laptop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        <th className="py-3.5 px-4">Dealer</th>
                        <th className="py-3.5 px-4">Shop Name</th>
                        <th className="py-3.5 px-4">Mobile</th>
                        <th className="py-3.5 px-4">Credit Balance</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
                      {filteredDealers.map((dealer) => (
                        <tr key={dealer.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-900">{dealer.name}</div>
                            <div className="text-xs text-indigo-600 font-mono font-medium">{dealer.dealer_code}</div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-700 font-medium">
                            {dealer.shop_name || <span className="text-slate-400 italic">Not set</span>}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            {dealer.mobile ? (
                              <span className="flex items-center gap-1 font-mono text-xs">
                                <Phone className="w-3 h-3 text-slate-400" />
                                {dealer.mobile}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">-</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            ₹{(Number(dealer.current_credit) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4">
                            {dealer.status ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                <XCircle className="w-3 h-3" />
                                Inactive
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => router.push(`/admin/editdealer?id=${dealer.id}`)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Responsive Card List View */}
                <div className="md:hidden divide-y divide-slate-200">
                  {filteredDealers.map((dealer) => (
                    <div key={dealer.id} className="p-4 space-y-3 bg-white">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-xs font-mono font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                            {dealer.dealer_code}
                          </span>
                          <h4 className="font-bold text-slate-900 text-base mt-1">{dealer.name}</h4>
                          {dealer.shop_name && (
                            <p className="text-xs text-slate-600 font-medium flex items-center gap-1 mt-0.5">
                              <Building className="w-3.5 h-3.5 text-slate-400" />
                              {dealer.shop_name}
                            </p>
                          )}
                        </div>

                        {dealer.status ? (
                          <span className="px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 rounded-full border border-slate-200">
                            Inactive
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Credit Balance</span>
                          <span className="font-extrabold text-slate-900 text-sm">
                            ₹{(Number(dealer.current_credit) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Mobile</span>
                          <span className="font-medium text-slate-700">
                            {dealer.mobile || '-'}
                          </span>
                        </div>
                      </div>

                      {dealer.address && (
                        <div className="text-xs text-slate-500 flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{dealer.address}</span>
                        </div>
                      )}

                      <div className="pt-2 flex justify-end">
                        <button
                          onClick={() => router.push(`/admin/editdealer?id=${dealer.id}`)}
                          className="w-full btn-base btn-secondary text-xs flex items-center justify-center gap-1.5 py-2 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Edit Dealer</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
