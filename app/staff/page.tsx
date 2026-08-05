'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function StaffPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/staff/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center space-y-2">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-700" />
      <p className="text-xs font-medium text-slate-600">Redirecting to Staff Dashboard...</p>
    </div>
  );
}
