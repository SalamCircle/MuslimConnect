'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import DashboardSidebar from '@/components/navigation/dashboard-sidebar';
import AdBanner from '@/components/feed/ad-banner';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#050505] flex">
      <DashboardSidebar />
      <main className="flex-1 min-w-0 md:ml-64 pt-14 md:pt-0 pb-16 md:pb-0 flex flex-col">
        {/* Desktop top banner — full-width strip at top of content area */}
        <div className="hidden md:block flex-shrink-0">
          <AdBanner placement="desktop_top" variant="bar" />
        </div>

        {/* Mobile top ad bar — directly below fixed top menu */}
        <div className="md:hidden flex-shrink-0">
          <AdBanner placement="mobile_top" variant="bar" dismissible />
        </div>

        <div className="flex-1 flex flex-col">
          {children}
        </div>

        {/* Mobile bottom ad bar — directly above fixed bottom tab bar */}
        <div className="md:hidden flex-shrink-0">
          <AdBanner placement="mobile_bottom" variant="bar" dismissible />
        </div>
      </main>
    </div>
  );
}
