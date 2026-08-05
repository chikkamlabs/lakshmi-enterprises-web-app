'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { LogOut, User } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

export default function StaffHeader() {
  const router = useRouter();
  const [userName, setUserName] = useState<string>('Staff Member');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchUserProfile() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          // Fetch profile name
          const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', session.user.id)
            .single();

          if (profile && profile.name && isMounted) {
            setUserName(profile.name);
          } else if (session.user.user_metadata?.name && isMounted) {
            setUserName(session.user.user_metadata.name);
          } else if (session.user.email && isMounted) {
            setUserName(session.user.email.split('@')[0]);
          }
        }
      } catch (err) {
        console.error('Error fetching staff profile header:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchUserProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error signing out staff:', err);
    }

    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('lakshmi_auth_active');
      sessionStorage.removeItem('lakshmi_user_role');
    }

    router.replace('/login');
  };

  return (
    <header className="w-full h-16 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Left: Logo + Brand Name */}
      <div className="flex items-center gap-2.5">
        <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0 shadow-2xs">
          <Image
            src="/Le_Logo.svg"
            alt="Lakshmi Enterprises Logo"
            width={32}
            height={32}
            className="object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="flex flex-col">
          <span className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight leading-none">
            Lakshmi Enterprises
          </span>
          <span className="text-[10px] text-emerald-700 font-semibold mt-0.5">
            Staff Portal
          </span>
        </div>
      </div>

      {/* Center: Greeting */}
      <div className="flex items-center gap-2 text-center">
        <div className="hidden sm:flex w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 items-center justify-center text-xs font-semibold border border-emerald-200">
          <User className="w-4 h-4 text-emerald-700" />
        </div>
        <h1 className="text-xs sm:text-sm font-semibold text-slate-800">
          Hello, <span className="font-bold text-emerald-700">{loading ? '...' : userName}</span>
        </h1>
      </div>

      {/* Right: Logout button */}
      <div className="flex items-center">
        <button
          onClick={handleLogout}
          type="button"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs sm:text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100 cursor-pointer"
          title="Logout from Staff Portal"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden xs:inline">Log Out</span>
        </button>
      </div>
    </header>
  );
}
