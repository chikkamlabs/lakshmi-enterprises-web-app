'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  const isPublicRoute = pathname === '/login';

  useEffect(() => {
    if (isPublicRoute) return;

    let isMounted = true;

    async function checkAuth() {
      try {
        // 1. Check active Supabase auth session
        const { data: { session } } = await supabase.auth.getSession();

        // 2. Check local session marker stored upon successful login
        const localActive = typeof window !== 'undefined' ? sessionStorage.getItem('lakshmi_auth_active') === 'true' : false;

        const hasValidSession = Boolean(session || localActive);

        if (isMounted) {
          if (hasValidSession) {
            setIsAuthorized(true);
          } else {
            setIsAuthorized(false);
            router.replace('/login');
          }
        }
      } catch (err) {
        console.error('Error verifying auth state:', err);
        if (isMounted) {
          setIsAuthorized(false);
          router.replace('/login');
        }
      }
    }

    checkAuth();

    // Listen for auth state changes in Supabase
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      const localActive = typeof window !== 'undefined' ? sessionStorage.getItem('lakshmi_auth_active') === 'true' : false;
      if (!session && !localActive) {
        setIsAuthorized(false);
        router.replace('/login');
      } else if (session) {
        setIsAuthorized(true);
      }
    });

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, [isPublicRoute, router]);

  // Bypass AuthGuard for public login route
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // While checking auth status on protected routes
  if (isAuthorized === null) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 p-6">
        <div className="flex flex-col items-center max-w-sm text-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
          <p className="text-sm font-semibold text-slate-700">Verifying security credentials...</p>
          <p className="text-xs text-slate-400 mt-1">Checking active session privileges</p>
        </div>
      </div>
    );
  }

  // If unauthorized on a protected route, prevent rendering child component entirely
  if (isAuthorized === false) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 p-6">
        <div className="card-base max-w-sm w-full text-center p-6 bg-white border border-red-200 shadow-md">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900">Access Restricted</h2>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            You must be authenticated to view this portal page. Redirecting to login...
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

  return <>{children}</>;
}

