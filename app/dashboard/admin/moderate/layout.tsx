'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import { Shield, MessageSquare, AlertTriangle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const moderatorNav = [
  { href: '/dashboard/admin/moderate',         label: 'Overview',  icon: Shield,        exact: true },
  { href: '/dashboard/admin/moderate/posts',   label: 'Posts',     icon: MessageSquare, exact: false },
  { href: '/dashboard/admin/moderate/reports', label: 'Reports',   icon: AlertTriangle, exact: false },
];

export default function ModeratorLayout({ children }: { children: React.ReactNode }) {
  const { profile, loading, isModerator } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && profile && !isModerator) {
      router.replace('/dashboard');
    }
  }, [profile, loading, isModerator]);

  if (loading || !profile) return null;

  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <div className="flex min-h-[calc(100vh-60px)]">
      <aside className="w-56 flex-shrink-0 border-r border-white/[0.06] bg-[#060606] flex flex-col py-4">
        <div className="px-4 mb-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-widest">
            <Shield className="w-3.5 h-3.5" /> Moderator
          </div>
        </div>
        <nav className="flex flex-col gap-0.5 px-2">
          {moderatorNav.map(({ href, label, icon: Icon, exact }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all',
                isActive(href, exact)
                  ? 'text-white bg-white/8'
                  : 'text-white/50 hover:text-white hover:bg-white/6'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{label}</span>
              <ChevronRight className="w-3.5 h-3.5 opacity-30" />
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex-1 min-w-0 p-8">
        {children}
      </div>
    </div>
  );
}
