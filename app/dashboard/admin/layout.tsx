'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import {
  Shield, Users, Store, Briefcase, Calendar, Building,
  Newspaper, Image, LayoutDashboard, ChevronRight,
  MessageSquare, Users2, AlertTriangle
} from 'lucide-react';

const adminNav = [
  { href: '/dashboard/admin',            label: 'Overview',   icon: LayoutDashboard },
  { href: '/dashboard/admin/users',      label: 'Users',      icon: Users },
  { href: '/dashboard/admin/posts',      label: 'Posts',      icon: MessageSquare },
  { href: '/dashboard/admin/groups',     label: 'Groups',     icon: Users2 },
  { href: '/dashboard/admin/events',     label: 'Events',     icon: Calendar },
  { href: '/dashboard/admin/jobs',       label: 'Jobs',       icon: Briefcase },
  { href: '/dashboard/admin/businesses', label: 'Businesses', icon: Store },
  { href: '/dashboard/admin/mosques',    label: 'Mosques',    icon: Building },
  { href: '/dashboard/admin/news',       label: 'News',       icon: Newspaper },
  { href: '/dashboard/admin/ads',        label: 'Ads',        icon: Image },
  { href: '/dashboard/admin/reports',    label: 'Reports',    icon: AlertTriangle },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile, loading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && profile && !isAdmin) {
      router.replace('/dashboard');
    }
  }, [profile, loading, isAdmin]);

  if (loading || !profile) return null;

  return (
    <div className="flex min-h-[calc(100vh-60px)]">
      <aside className="w-56 flex-shrink-0 border-r border-white/[0.06] bg-[#060606] flex flex-col py-4">
        <div className="px-4 mb-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-widest">
            <Shield className="w-3.5 h-3.5" /> Admin
          </div>
        </div>
        <nav className="flex flex-col gap-0.5 px-2">
          {adminNav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-white/50 hover:text-white hover:bg-white/6 transition-all"
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
