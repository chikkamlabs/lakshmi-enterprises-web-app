'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AdminHeader from '../header/page';
import AdminSidebar from '../sidebar/page';
import { getStaffById, getStoredStaff, updateStaffMember, StaffMember } from '@/lib/staffStore';
import {
  Edit2,
  ArrowLeft,
  Loader2,
  Save,
  X,
  AlertCircle,
  CheckCircle2,
  UserCheck,
  Phone,
  Mail,
  ShieldCheck,
} from 'lucide-react';

function EditStaffForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const staffId = searchParams.get('id');

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [targetStaff, setTargetStaff] = useState<StaffMember | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  useEffect(() => {
    let isMounted = true;

    async function loadStaff() {
      if (!staffId) {
        setIsLoading(false);
        setError('No Staff ID provided in URL parameters.');
        return;
      }

      setIsLoading(true);
      setError('');
      try {
        let staffMember = await getStaffById(staffId);

        if (!staffMember) {
          const all = await getStoredStaff();
          staffMember = all.find((s) => s.id === staffId || s.email === staffId) || null;
        }

        if (isMounted) {
          if (staffMember) {
            setTargetStaff(staffMember);
            setName(staffMember.name || '');
            setMobile(staffMember.mobile || '');
            setEmail(staffMember.email || '');
            setStatus(staffMember.status || 'active');
          } else {
            setError('Staff member record not found in database.');
          }
        }
      } catch (err: unknown) {
        console.error('Error fetching staff member details:', err);
        if (isMounted) {
          setError('Failed to fetch staff member details.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadStaff();

    return () => {
      isMounted = false;
    };
  }, [staffId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStaff) return;

    setError('');
    setSuccess('');

    if (!name.trim()) {
      setError('Staff Name is required.');
      return;
    }
    if (!mobile.trim()) {
      setError('Mobile number is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = await updateStaffMember(targetStaff.id, {
        name: name.trim(),
        mobile: mobile.trim(),
        email: email.trim(),
        status,
      });

      if (updated) {
        setSuccess(`Staff member "${updated.name}" updated successfully! Redirecting...`);
        setTimeout(() => {
          router.push('/admin/staff/dashboard');
        }, 800);
      }
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Failed to update staff member.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-700">Loading staff member details...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <button
          onClick={() => router.push('/admin/staff/dashboard')}
          className="text-xs font-semibold text-slate-500 hover:text-indigo-600 flex items-center gap-1 mb-1 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Staff List</span>
        </button>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Edit2 className="w-6 h-6 text-indigo-600" />
          <span>Edit Staff Member</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Update account details and contact information for <span className="font-semibold text-slate-800">{name || 'Staff Member'}</span>.
        </p>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm rounded-xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-700 cursor-pointer">
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

      {!targetStaff ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-3">
          <UserCheck className="w-12 h-12 text-slate-300 mx-auto" />
          <p className="text-base font-semibold text-slate-800">Staff Member Not Found</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            The requested staff member record does not exist or was removed.
          </p>
          <button
            onClick={() => router.push('/admin/staff/dashboard')}
            className="btn-base btn-primary text-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Staff List</span>
          </button>
        </div>
      ) : (
        /* Form Card */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Staff ID: <span className="font-mono text-indigo-600">{targetStaff.id}</span></span>
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs sm:text-sm">
            {/* Full Name */}
            <div>
              <label htmlFor="editStaffName" className="form-label font-semibold text-slate-700 block mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <UserCheck className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="editStaffName"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="form-input w-full pl-9 rounded-lg border-slate-300 font-medium"
                />
              </div>
            </div>

            {/* Mobile Number */}
            <div>
              <label htmlFor="editStaffMobile" className="form-label font-semibold text-slate-700 block mb-1">
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="editStaffMobile"
                  type="tel"
                  required
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="form-input w-full pl-9 rounded-lg border-slate-300 font-mono"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label htmlFor="editStaffEmail" className="form-label font-semibold text-slate-700 block mb-1">
                Email Address (Login ID)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="editStaffEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input w-full pl-9 rounded-lg border-slate-300 font-medium"
                />
              </div>
            </div>

            {/* Account Status */}
            <div>
              <label htmlFor="editStaffStatus" className="form-label font-semibold text-slate-700 block mb-1">
                Account Status
              </label>
              <select
                id="editStaffStatus"
                value={status}
                onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                className="form-input w-full rounded-lg border-slate-300 bg-white cursor-pointer"
              >
                <option value="active">Active Staff Member</option>
                <option value="inactive">Inactive Staff Member</option>
              </select>
            </div>

            {/* Form Actions */}
            <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => router.push('/admin/staff/dashboard')}
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
                    <span>Updating Staff Member...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Update Staff Member</span>
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

export default function EditStaffPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <AdminHeader />

      <div className="flex-1 flex flex-col md:flex-row">
        <AdminSidebar />

        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-3xl w-full mx-auto space-y-6">
          <Suspense
            fallback={
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
                <p className="text-sm font-medium text-slate-700">Loading edit form...</p>
              </div>
            }
          >
            <EditStaffForm />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
