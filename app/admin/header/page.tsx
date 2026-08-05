'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { LogOut, UserCheck } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

export default function AdminHeader() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error signing out:', err);
    }
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('lakshmi_auth_active');
      sessionStorage.removeItem('lakshmi_user_role');
    }
    router.replace('/login');
  };

  return (
    <header className="w-full h-20 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Admin Name on left */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold text-sm border border-indigo-200">
          <UserCheck className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-800 leading-tight">
            Hello Sai Garu
          </h1>
          <span className="text-xs text-slate-500 font-medium hidden sm:inline-block">
            Lakshmi Enterprises Management
          </span>
        </div>
      </div>

      {/* Right: Logo and Log out */}
      <div className="flex items-center gap-4 sm:gap-6">
        <div className="flex items-center gap-2">
          <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center shadow-2xs">
            <Image
              src="/Le_Logo.svg"
              alt="Lakshmi Enterprises Logo"
              width={32}
              height={32}
              className="object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <span className="hidden md:inline-block text-sm font-semibold text-slate-700 tracking-tight">
            Lakshmi Enterprises
          </span>
        </div>

        <div className="h-5 w-px bg-slate-200" />

        <button
          onClick={handleLogout}
          type="button"
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Log Out</span>
        </button>
      </div>
    </header>
  );
}

