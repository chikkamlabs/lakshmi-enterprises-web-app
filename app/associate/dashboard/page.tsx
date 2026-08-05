'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldAlert, Loader2, Plus } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import AssociateHeader from '../header/page';
import AssociateBottomNavigation from '../buttomnavigation/page';

export default function AssociateDashboardPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function checkAssociateAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const localActive = typeof window !== 'undefined' ? sessionStorage.getItem('lakshmi_auth_active') === 'true' : false;
        const localRole = typeof window !== 'undefined' ? sessionStorage.getItem('lakshmi_user_role') : null;

        if (!session && !localActive) {
          if (isMounted) {
            setIsAuthorized(false);
            router.replace('/login');
          }
          return;
        }

        if (session?.user?.id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

          const role = profile?.role || localRole || 'associate';

          if (role === 'associate' || role === 'admin') {
            if (isMounted) setIsAuthorized(true);
          } else {
            if (isMounted) {
              setIsAuthorized(false);
              router.replace('/login');
            }
          }
        } else if (localActive && (localRole === 'associate' || localRole === 'admin')) {
          if (isMounted) setIsAuthorized(true);
        } else {
          if (isMounted) {
            setIsAuthorized(false);
            router.replace('/login');
          }
        }
      } catch (err) {
        console.error('Error checking associate authorization:', err);
        if (isMounted) {
          setIsAuthorized(false);
          router.replace('/login');
        }
      }
    }

    checkAssociateAuth();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (isAuthorized === null) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 p-6">
        <div className="flex flex-col items-center max-w-sm text-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
          <p className="text-sm font-semibold text-slate-700">Verifying security credentials...</p>
          <p className="text-xs text-slate-400 mt-1">Checking associate portal authorization</p>
        </div>
      </div>
    );
  }

  if (isAuthorized === false) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 p-6">
        <div className="card-base max-w-sm w-full text-center p-6 bg-white border border-red-200 shadow-md">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900">Access Restricted</h2>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Only authenticated users with Associate role can access this page. Redirecting to login...
          </p>
          <button
            onClick={() => router.replace('/login')}
            className="btn-base btn-primary w-full text-xs"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 relative">
      {/* Header Component */}
      <AssociateHeader />

      {/* Main Layout: Empty space as instructed */}
      <main className="flex-1 bg-white p-6 md:p-8 flex items-end justify-start border-l border-r border-slate-200 min-h-[calc(100vh-8rem)] relative">
        {/* Empty space */}
      </main>

      {/* + Add Order Button on Bottom Right */}
      <div className="fixed bottom-20 right-4 md:right-8 z-40">
        <Link
          href="/associate/createorder"
          className="flex items-center gap-2 px-5 py-3 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-xl transition-all hover:scale-105 active:scale-95"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>+ Add Order</span>
        </Link>
      </div>

      {/* Bottom Navigation Component */}
      <AssociateBottomNavigation />
    </div>
  );
}
