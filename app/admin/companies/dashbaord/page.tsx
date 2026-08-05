'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AdminHeader from '../../header/page';
import AdminSidebar from '../../sidebar/page';
import { getStoredCompanies, Company } from '@/lib/companiesStore';
import {
  Plus,
  Search,
  Building2,
  Edit,
  Phone,
  MapPin,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from 'lucide-react';

export default function CompaniesDashboardPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await getStoredCompanies();
      setCompanies(data);
    } catch (err) {
      console.error('Failed to load companies:', err);
      setCompanies([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    getStoredCompanies()
      .then((data) => {
        if (isMounted) {
          setCompanies(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load companies:', err);
        if (isMounted) {
          setCompanies([]);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Filter companies based on search input (search by mobile, company_code / unique ID, or name)
  const filteredCompanies = companies.filter(company => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      (company.name || '').toLowerCase().includes(query) ||
      (company.company_code || '').toLowerCase().includes(query) ||
      (company.mobile || '').toLowerCase().includes(query) ||
      (company.address || '').toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Continuous Admin Header */}
      <AdminHeader />

      {/* Main Layout: Sidebar & Content Workspace */}
      <div className="flex-1 flex flex-col md:flex-row min-h-[calc(100vh-4rem)]">
        {/* Admin Sidebar */}
        <AdminSidebar />

        {/* Center Companies Workspace Area */}
        <main className="flex-1 bg-slate-50 p-4 sm:p-6 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Top Bar: Total Count (Top Left) & Add Company Button (Top Right) */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-800 tracking-tight">
                    Companies Directory
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium">
                    Total Companies:{' '}
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700 ml-1">
                      {companies.length}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={loadData}
                  className="p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
                  title="Refresh List"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <Link
                  href="/admin/addcompany"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors border border-indigo-700"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Company</span>
                </Link>
              </div>
            </div>

            {/* Search Bar section */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search company by Name, Mobile Number, or Unique ID (e.g. COMP-101)..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-medium bg-slate-200/60 px-2 py-1 rounded-md"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Companies Data Table / Card Container */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              {isLoading ? (
                <div className="p-12 text-center text-slate-500">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                  <p className="text-sm">Loading companies...</p>
                </div>
              ) : filteredCompanies.length === 0 ? (
                <div className="p-12 text-center">
                  <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-slate-700">No companies found</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    {searchQuery
                      ? `No matching companies found for "${searchQuery}". Try a different keyword.`
                      : 'No company records exist yet. Click "Add Company" above to add one.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3.5 px-4 sm:px-6">Unique ID</th>
                        <th className="py-3.5 px-4 sm:px-6">Company Name</th>
                        <th className="py-3.5 px-4 sm:px-6">Mobile</th>
                        <th className="py-3.5 px-4 sm:px-6 hidden md:table-cell">Address</th>
                        <th className="py-3.5 px-4 sm:px-6">Status</th>
                        <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-sm">
                      {filteredCompanies.map((company) => (
                        <tr
                          key={company.id}
                          className="hover:bg-slate-50/80 transition-colors group"
                        >
                          {/* Unique ID */}
                          <td className="py-4 px-4 sm:px-6 font-mono text-xs font-bold text-indigo-600 whitespace-nowrap">
                            <span className="inline-block px-2.5 py-1 bg-indigo-50 border border-indigo-100 rounded-md">
                              {company.company_code}
                            </span>
                          </td>

                          {/* Company Name */}
                          <td className="py-4 px-4 sm:px-6 font-semibold text-slate-800">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                              <span>{company.name}</span>
                            </div>
                          </td>

                          {/* Mobile */}
                          <td className="py-4 px-4 sm:px-6 text-slate-600 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{company.mobile || 'N/A'}</span>
                            </div>
                          </td>

                          {/* Address */}
                          <td className="py-4 px-4 sm:px-6 text-slate-500 hidden md:table-cell max-w-xs truncate">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{company.address || 'N/A'}</span>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-4 px-4 sm:px-6 whitespace-nowrap">
                            {company.status ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                <XCircle className="w-3.5 h-3.5 text-slate-400" />
                                Inactive
                              </span>
                            )}
                          </td>

                          {/* Actions / Edit button */}
                          <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap">
                            <Link
                              href={`/admin/companyedit?id=${encodeURIComponent(company.id)}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
