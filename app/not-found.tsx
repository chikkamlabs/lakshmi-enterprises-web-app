import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm max-w-md w-full space-y-4">
        <h2 className="text-2xl font-bold text-slate-800">404 - Page Not Found</h2>
        <p className="text-sm text-slate-500">
          The requested page could not be found. Please check the URL or return to the home page.
        </p>
        <Link
          href="/"
          className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 py-2 rounded-lg transition-colors"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
