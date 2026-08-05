import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import AuthGuard from './AuthGuard';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Lakshmi Enterprises ERP',
  description: 'Enterprise Resource Planning & Business Management System',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="main-container min-h-screen antialiased" suppressHydrationWarning>
        <AuthGuard>{children}</AuthGuard>
      </body>
    </html>
  );
}


