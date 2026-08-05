'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AdminHeader from '../header/page';
import AdminSidebar from '../sidebar/page';
import { getCompanyByIdOrCode, updateCompany, getStoredCompanies, Company } from '@/lib/companiesStore';
import { ArrowLeft, Building2, Save, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

function EditCompanyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const companyId = searchParams.get('id') || '';

  const [company, setCompany] = useState<Company | null>(null);
  const [companyCode, setCompanyCode] = useState('');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState<boolean>(true);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const populate = (c: Company) => {
    setCompany(c);
    setCompanyCode(c.company_code);
    setName(c.name);
    setMobile(c.mobile || '');
    setAddress(c.address || '');
    setStatus(c.status);
  };

  useEffect(() => {
    async function loadCompany() {
      if (!companyId) {
        // Fallback: take the first company from Supabase if no ID passed
        const list = await getStoredCompanies();
        if (list.length > 0) {
          populate(list[0]);
        } else {
          setError('No company ID specified and no company records found in database.');
        }
        setLoaded(true);
        return;
      }

      const found = await getCompanyByIdOrCode(companyId);
      if (found) {
        populate(found);
      } else {
        setError(`Company with ID "${companyId}" was not found in database.`);
      }
      setLoaded(true);
    }

    loadCompany();
  }, [companyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!companyCode.trim()) {
      setError('Company Code is required');
      return;
    }

    if (!name.trim()) {
      setError('Company Name is required');
      return;
    }

    const targetId = company?.id || companyId;
    if (!targetId) {
      setError('Cannot save: Invalid company target.');
      return;
    }

    setIsSubmitting(true);

    try {
      const updated = await updateCompany(targetId, {
        company_code: companyCode.trim(),
        name: name.trim(),
        mobile: mobile.trim(),
        address: address.trim(),
        status: status,
      });

      if (updated) {
        setSuccess('Company updated successfully!');
        setTimeout(() => {
          router.push('/admin/companies/dashbaord');
        }, 600);
      } else {
        setError('Failed to find and update company in Supabase.');
      }
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Failed to update company details.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!loaded) {
    return (
      <div className="p-12 text-center text-slate-500">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
        <p className="text-sm">Loading company details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/companies/dashbaord"
            className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-white rounded-xl border border-slate-200 transition-colors"
            title="Back to Companies"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">
              Edit Company
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Update existing company details ({companyCode || 'N/A'})
            </p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Edit Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6"
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-800">Company Information</h2>
          </div>
          {company?.created_at && (
            <span className="text-xs text-slate-400 font-mono">
              Created: {new Date(company.created_at).toLocaleDateString()}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* 1. Company Code */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Company Code / Unique ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={companyCode}
              onChange={(e) => setCompanyCode(e.target.value)}
              placeholder="e.g. COMP-101"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>

          {/* 2. Company Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Company Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Company Name"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>

          {/* 3. Mobile */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Mobile Number
            </label>
            <input
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="Mobile Number"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>

          {/* 4. Status */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Status
            </label>
            <select
              value={status ? 'active' : 'inactive'}
              onChange={(e) => setStatus(e.target.value === 'active')}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* 5. Address */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Address
            </label>
            <textarea
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Full Address"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Link
            href="/admin/companies/dashbaord"
            className="px-4 py-2.5 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl text-sm font-semibold transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors border border-indigo-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSubmitting ? 'Updating...' : 'Save Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

export default function EditCompanyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Continuous Admin Header */}
      <AdminHeader />

      {/* Main Layout */}
      <div className="flex-1 flex flex-col md:flex-row min-h-[calc(100vh-4rem)]">
        {/* Admin Sidebar */}
        <AdminSidebar />

        {/* Content Workspace */}
        <main className="flex-1 bg-slate-50 p-4 sm:p-6 md:p-8">
          <Suspense fallback={
            <div className="p-12 text-center text-slate-500">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
              <p className="text-sm">Loading...</p>
            </div>
          }>
            <EditCompanyForm />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
