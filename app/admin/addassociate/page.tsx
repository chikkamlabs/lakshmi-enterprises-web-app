'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminHeader from '../header/page';
import AdminSidebar from '../sidebar/page';
import { addAssociate } from '@/lib/associatesStore';
import {
  UserPlus,
  ArrowLeft,
  Loader2,
  Save,
  X,
  AlertCircle,
  CheckCircle2,
  Mail,
  Phone,
  Lock,
  User,
  Info,
} from 'lucide-react';

export default function AddAssociatePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states: Name, mobile, email, password
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim()) {
      setError('Associate Name is required.');
      return;
    }
    if (!mobile.trim()) {
      setError('Mobile number is required.');
      return;
    }
    if (!email.trim()) {
      setError('Email address is required.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await addAssociate({
        name: name.trim(),
        mobile: mobile.trim(),
        email: email.trim().toLowerCase(),
        password: password,
      });

      if (created) {
        setSuccess(`Associate "${created.name}" created successfully! Redirecting...`);
        setTimeout(() => {
          router.push('/admin/associates/dashboard');
        }, 800);
      }
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Failed to add associate.';
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

        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-3xl w-full mx-auto space-y-6">
          {/* Top Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <button
                onClick={() => router.push('/admin/associates/dashboard')}
                className="text-xs font-semibold text-slate-500 hover:text-indigo-600 flex items-center gap-1 mb-1 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Associates List</span>
              </button>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <UserPlus className="w-6 h-6 text-indigo-600" />
                <span>Add New Associate</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Register a new sales associate account with login credentials.
              </p>
            </div>
          </div>

          {/* Prominent Note Banner (as requested in prompt) */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 shadow-xs text-amber-900">
            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm">
              <span className="font-bold text-amber-950 block">Important Security & Login Note:</span>
              <p className="mt-0.5 font-medium">
                Please remember email &amp; password. Use for login in the Associate portal.
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

          {/* Form Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Associate Details Form
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs sm:text-sm">
              {/* Full Name */}
              <div>
                <label htmlFor="associateName" className="form-label font-semibold text-slate-700 block mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="associateName"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="form-input w-full pl-9 rounded-lg border-slate-300 font-medium"
                    placeholder="Enter associate full name"
                  />
                </div>
              </div>

              {/* Mobile Number */}
              <div>
                <label htmlFor="associateMobile" className="form-label font-semibold text-slate-700 block mb-1">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="associateMobile"
                    type="tel"
                    required
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="form-input w-full pl-9 rounded-lg border-slate-300 font-mono"
                    placeholder="e.g. 9876543210"
                  />
                </div>
              </div>

              {/* Email Address (Login ID) */}
              <div>
                <label htmlFor="associateEmail" className="form-label font-semibold text-slate-700 block mb-1">
                  Email Address (Login Username) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="associateEmail"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input w-full pl-9 rounded-lg border-slate-300 font-medium"
                    placeholder="associate@company.com"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="associatePassword" className="form-label font-semibold text-slate-700 block mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="associatePassword"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input w-full pl-9 rounded-lg border-slate-300 font-mono"
                    placeholder="Minimum 6 characters"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  This password will allow the associate to sign into their associate panel.
                </p>
              </div>

              {/* Form Actions */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => router.push('/admin/associates/dashboard')}
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
                      <span>Saving Associate...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Associate</span>
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
