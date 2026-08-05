'use client';

import AdminHeader from '../header/page';
import AdminSidebar from '../sidebar/page';

export default function AdminDashboardPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Header Component */}
      <AdminHeader />

      {/* Main Layout: Sidebar & Center Blank Space */}
      <div className="flex-1 flex flex-col md:flex-row min-h-[calc(100vh-4rem)]">
        {/* Sidebar Component */}
        <AdminSidebar />

        {/* Center Blank Workspace Area */}
        <main className="flex-1 bg-white p-6 md:p-8 flex items-center justify-center border-l border-slate-200">
          <div className="w-full h-full min-h-[400px] border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 flex flex-col items-center justify-center p-8 text-center">
            {/* Blank space left intentionally */}
          </div>
        </main>
      </div>
    </div>
  );
}
