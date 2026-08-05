'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import AdminHeader from '../../header/page';
import AdminSidebar from '../../sidebar/page';
import { getStoredStaff, StaffMember } from '@/lib/staffStore';
import {
  UserCheck,
  UserPlus,
  Search,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Mail,
  Phone,
  ShieldCheck,
  Edit2,
} from 'lucide-react';

export default function AdminStaffDashboardPage() {
  const router = useRouter();
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getStoredStaff();
      setStaffList(data);
    } catch (err: unknown) {
      console.error('Failed to load staff:', err);
      setError('Could not load staff list.');
      setStaffList([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function initData() {
      setIsLoading(true);
      setError('');
      try {
        const data = await getStoredStaff();
        if (isMounted) {
          setStaffList(data);
        }
      } catch (err: unknown) {
        console.error('Failed to load staff:', err);
        if (isMounted) {
          setError('Could not load staff list.');
          setStaffList([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Filter Staff by Name, Mobile, and Email
  const filteredStaff = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return staffList;

    return staffList.filter((member) => {
      const name = (member.name || '').toLowerCase();
      const mobile = (member.mobile || '').toLowerCase();
      const email = (member.email || '').toLowerCase();

      return name.includes(q) || mobile.includes(q) || email.includes(q);
    });
  }, [staffList, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <AdminHeader />

      <div className="flex-1 flex flex-col md:flex-row">
        <AdminSidebar />

        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Top Header Row: Left Count + Right Add Button */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Top Left: How many staff */}
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                      Staff Dashboard
                    </h1>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Total Staff: {isLoading ? '...' : staffList.length}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    Manage office and store staff members, login credentials, and contact details.
                  </p>
                </div>
              </div>
            </div>

            {/* Top Right: Add Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={loadData}
                disabled={isLoading}
                className="btn-base btn-secondary text-xs flex items-center gap-1.5"
                title="Refresh staff list from database"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>

              <button
                onClick={() => router.push('/admin/addstaff')}
                className="btn-base btn-primary text-xs sm:text-sm flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add Staff</span>
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm rounded-lg flex items-center justify-between">
              <span>{error}</span>
            </div>
          )}

          {/* Search Bar (Name, Mobile, and Email) */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search staff members by name, mobile number, or email address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input pl-9 pr-4 py-2 text-xs sm:text-sm w-full rounded-lg border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div className="text-xs text-slate-500 self-end sm:self-center shrink-0">
              Showing <span className="font-semibold text-slate-800">{filteredStaff.length}</span> of{' '}
              <span className="font-semibold text-slate-800">{staffList.length}</span> staff members
            </div>
          </div>

          {/* Display Staff List */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            {isLoading ? (
              <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
                <p className="text-sm font-medium">Loading staff from database...</p>
              </div>
            ) : filteredStaff.length === 0 ? (
              <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center">
                <UserCheck className="w-12 h-12 text-slate-300 mb-3" />
                <p className="text-base font-semibold text-slate-700">No staff members found</p>
                <p className="text-xs text-slate-400 max-w-sm mt-1">
                  {searchQuery
                    ? 'No staff members matched your search terms.'
                    : 'Click "Add Staff" to add staff members to the system.'}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => router.push('/admin/addstaff')}
                    className="btn-base btn-primary text-xs mt-4 flex items-center gap-1.5"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Add Staff</span>
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Desktop & Tablet Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        <th className="py-3.5 px-4">Name</th>
                        <th className="py-3.5 px-4">Mobile</th>
                        <th className="py-3.5 px-4">Email (Login ID)</th>
                        <th className="py-3.5 px-4">Role</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
                      {filteredStaff.map((member) => (
                        <tr key={member.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Name */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs shrink-0">
                                {member.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-semibold text-slate-900">{member.name}</div>
                                <div className="text-[11px] text-slate-400 font-mono">ID: {member.id}</div>
                              </div>
                            </div>
                          </td>

                          {/* Mobile */}
                          <td className="py-3.5 px-4 text-slate-700">
                            <div className="flex items-center gap-1.5 font-mono">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              <span>{member.mobile || 'N/A'}</span>
                            </div>
                          </td>

                          {/* Email */}
                          <td className="py-3.5 px-4 text-slate-700">
                            <div className="flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-slate-400" />
                              <span className="font-medium text-slate-800">{member.email}</span>
                            </div>
                          </td>

                          {/* Role */}
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase tracking-wider">
                              <ShieldCheck className="w-3 h-3" />
                              {member.role}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              {member.status === 'inactive' ? 'Inactive' : 'Active'}
                            </span>
                          </td>

                          {/* Action */}
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => router.push(`/admin/editstaff?id=${member.id}`)}
                              className="btn-base btn-secondary py-1 px-2.5 text-xs inline-flex items-center gap-1 hover:border-indigo-300 hover:text-indigo-600 cursor-pointer"
                              title="Edit Staff Member"
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

                {/* Mobile Responsive Cards */}
                <div className="md:hidden divide-y divide-slate-200">
                  {filteredStaff.map((member) => (
                    <div key={member.id} className="p-4 space-y-3 bg-white">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs shrink-0">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 text-base">{member.name}</h4>
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 uppercase">
                              Staff
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                            {member.status === 'inactive' ? 'Inactive' : 'Active'}
                          </span>
                          <button
                            onClick={() => router.push(`/admin/editstaff?id=${member.id}`)}
                            className="btn-base btn-secondary py-1 px-2 text-xs flex items-center gap-1 hover:border-indigo-300 hover:text-indigo-600 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <div className="flex items-center gap-2 text-slate-700">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-mono">{member.mobile || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-700">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-medium">{member.email}</span>
                        </div>
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
