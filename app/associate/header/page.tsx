'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { LogOut, User } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

export default function AssociateHeader() {
  const router = useRouter();
  const [associateName, setAssociateName] = useState<string>('Associate');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchProfileName() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', session.user.id)
            .single();

          if (profile && profile.name && isMounted) {
            setAssociateName(profile.name);
          } else if (session.user.user_metadata?.name && isMounted) {
            setAssociateName(session.user.user_metadata.name);
          } else if (session.user.email && isMounted) {
            setAssociateName(session.user.email.split('@')[0]);
          }
        }
      } catch (err) {
        console.error('Error fetching associate profile:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchProfileName();

    return () => {
      isMounted = false;
    };
  }, []);

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
    <header className="w-full h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Left: Logo & Lakshmi Enterprises */}
      <div className="flex items-center gap-3">
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
        <span className="text-sm font-bold text-slate-800 tracking-tight">
          Lakshmi Enterprises
        </span>
      </div>

      {/* Middle: Hello, Associate Name(profiles.name) */}
      <div className="flex items-center gap-2 text-center">
        <div className="hidden sm:flex w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 items-center justify-center text-xs font-semibold border border-indigo-200">
          <User className="w-4 h-4 text-indigo-600" />
        </div>
        <h1 className="text-sm sm:text-base font-semibold text-slate-800">
          Hello, <span className="font-bold text-indigo-600">{loading ? '...' : associateName}</span>
        </h1>
      </div>

      {/* Top right: Log out */}
      <div className="flex items-center">
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
