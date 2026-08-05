'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Moon, Home, MessageSquare, Users, UserSearch, User, LogOut,
  Calendar, Mail, ChevronRight, Briefcase, Bookmark, FileText,
  Settings, Shield, Bell, Menu, Building, Store,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import { Sheet, SheetContent } from '@/components/ui/sheet';

const mainNav = [
  { href: '/dashboard',            label: 'Home',        icon: Home,           exact: true },
  { href: '/dashboard/feed',       label: 'Community',   icon: MessageSquare,  exact: false },
  { href: '/dashboard/groups',     label: 'Groups',      icon: Users,          exact: false },
  { href: '/dashboard/events',     label: 'Events',      icon: Calendar,       exact: false },
  { href: '/dashboard/mosques',    label: 'Mosques',     icon: Building,       exact: false },
  { href: '/dashboard/businesses', label: 'Businesses',  icon: Store,          exact: false },
  { href: '/dashboard/jobs',       label: 'Jobs',        icon: Briefcase,      exact: false },
  { href: '/dashboard/connect',    label: 'Connect',     icon: UserSearch,     exact: false },
  { href: '/dashboard/messages',   label: 'Chat',        icon: Mail,           exact: false },
];

const myContentNav = [
  { href: '/dashboard/posts', label: 'My Posts',    icon: FileText },
  { href: '/dashboard/saved', label: 'Saved Posts', icon: Bookmark },
];

const bottomTabNav = [
  { href: '/dashboard',          label: 'Home',      icon: Home,          exact: true },
  { href: '/dashboard/feed',     label: 'Community', icon: MessageSquare, exact: false },
  { href: '/dashboard/messages', label: 'Chat',      icon: Mail,          exact: false },
  { href: '/dashboard/groups',   label: 'Groups',    icon: Users,         exact: false },
  { href: '/dashboard/connect',  label: 'Connect',   icon: UserSearch,    exact: false },
];

interface NavInnerProps {
  profile: any;
  isAdmin: boolean;
  isModerator: boolean;
  pathname: string;
  unreadCount: number;
  onSignOut: () => void;
  onNavClick?: () => void;
}

function NavInner({ profile, isAdmin, isModerator, pathname, unreadCount, onSignOut, onNavClick }: NavInnerProps) {
  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + '/');
  }

  const initials = profile?.full_name
    ?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() ?? '?';

  return (
    <>
      <Link
        href="/dashboard"
        onClick={onNavClick}
        className="flex items-center gap-2.5 px-5 h-[60px] border-b border-white/[0.06] flex-shrink-0"
      >
        <div className="w-8 h-8 rounded-xl bg-gradient-brand flex items-center justify-center glow-sm flex-shrink-0">
          <Moon className="w-4 h-4 text-white" fill="white" />
        </div>
        <span className="text-base font-bold text-white tracking-tight">ConnectMuslim</span>
      </Link>

      <nav className="flex-1 px-3 pt-4 pb-2 overflow-y-auto scrollbar-hide flex flex-col gap-0.5">
        {mainNav.map(({ href, label, icon: Icon, exact }) => (
          <Link
            key={href}
            href={href}
            onClick={onNavClick}
            className={cn('nav-item', isActive(href, exact) && 'active')}
          >
            <Icon style={{ width: '18px', height: '18px' }} className="flex-shrink-0" />
            <span className="flex-1">{label}</span>
          </Link>
        ))}

        <div className="my-3 border-t border-white/[0.05]" />
        <p className="px-3 pb-2 text-xs font-semibold text-white/20 uppercase tracking-widest">My Content</p>

        {myContentNav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={onNavClick}
            className={cn('nav-item', isActive(href, false) && 'active')}
          >
            <Icon style={{ width: '18px', height: '18px' }} className="flex-shrink-0" />
            <span className="flex-1">{label}</span>
          </Link>
        ))}

        <div className="my-3 border-t border-white/[0.05]" />

        <Link
          href={profile ? `/dashboard/profile/${profile.id}` : '/dashboard/profile'}
          onClick={onNavClick}
          className={cn('nav-item', pathname.startsWith('/dashboard/profile') && !pathname.includes('/edit') && 'active')}
        >
          <User style={{ width: '18px', height: '18px' }} className="flex-shrink-0" />
          <span className="flex-1">My Profile</span>
        </Link>

        <Link
          href="/dashboard/profile/edit"
          onClick={onNavClick}
          className={cn('nav-item', pathname === '/dashboard/profile/edit' && 'active')}
        >
          <Settings style={{ width: '18px', height: '18px' }} className="flex-shrink-0" />
          <span className="flex-1">Settings</span>
        </Link>

        <Link
          href="/dashboard/notifications"
          onClick={onNavClick}
          className={cn('nav-item', pathname.startsWith('/dashboard/notifications') && 'active')}
        >
          <Bell style={{ width: '18px', height: '18px' }} className="flex-shrink-0" />
          <span className="flex-1">Notifications</span>
          {unreadCount > 0 && (
            <span className="text-xs bg-emerald-500 text-white rounded-full px-1.5 py-0.5 leading-none font-semibold">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>

        {(isAdmin || isModerator) && (
          <Link
            href={isAdmin ? '/dashboard/admin' : '/dashboard/admin/moderate'}
            onClick={onNavClick}
            className={cn('nav-item', pathname.startsWith('/dashboard/admin') && 'active')}
          >
            <Shield style={{ width: '18px', height: '18px' }} className="flex-shrink-0 text-amber-400" />
            <span className="flex-1 text-amber-400">{isAdmin ? 'Admin Panel' : 'Moderator'}</span>
          </Link>
        )}
      </nav>

      <div className="border-t border-white/[0.06] p-3 flex-shrink-0">
        {profile && (
          <Link
            href={`/dashboard/profile/${profile.id}`}
            onClick={onNavClick}
            className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-white/6 transition-colors mb-1 group"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate leading-none">{profile.full_name}</p>
              <p className="text-xs text-white/35 truncate mt-0.5">{profile.city || profile.region || profile.country}</p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/50 transition-colors flex-shrink-0" />
          </Link>
        )}
        <button
          onClick={() => { onNavClick?.(); onSignOut(); }}
          className="nav-item w-full hover:text-rose-400"
          style={{ color: 'rgba(255,255,255,0.35)' }}
        >
          <LogOut style={{ width: '18px', height: '18px' }} className="flex-shrink-0" />
          Sign out
        </button>
      </div>
    </>
  );
}

export default function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, isAdmin, isModerator, signOut } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!profile) return;
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profile.id)
      .eq('is_read', false)
      .then(({ count }) => setUnreadCount(count ?? 0));
  }, [profile]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  async function handleSignOut() {
    await signOut();
    router.replace('/');
  }

  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + '/');
  }

  const navProps: NavInnerProps = {
    profile,
    isAdmin,
    isModerator,
    pathname,
    unreadCount,
    onSignOut: handleSignOut,
  };

  return (
    <>
      {/* Desktop sidebar — hidden on mobile */}
      <aside className="hidden md:flex fixed top-0 left-0 h-screen w-64 flex-col border-r border-white/[0.06] bg-[#070707] z-40">
        <NavInner {...navProps} />
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 z-40 bg-[#070707] border-b border-white/[0.06] flex items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-gradient-brand flex items-center justify-center glow-sm">
            <Moon className="w-3.5 h-3.5 text-white" fill="white" />
          </div>
          <span className="text-sm font-bold text-white tracking-tight">ConnectMuslim</span>
        </Link>
        <div className="flex items-center gap-1">
          <Link
            href="/dashboard/notifications"
            className="relative p-2 rounded-xl hover:bg-white/8 transition-colors"
          >
            <Bell className="w-5 h-5 text-white/60" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-emerald-400 rounded-full" />
            )}
          </Link>
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-xl hover:bg-white/8 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5 text-white/60" />
          </button>
        </div>
      </header>

      {/* Mobile slide-in nav drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-72 p-0 bg-[#070707] border-r border-white/[0.06] flex flex-col [&>button]:hidden"
        >
          <NavInner {...navProps} onNavClick={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 z-40 bg-[#070707] border-t border-white/[0.06] flex items-center">
        {bottomTabNav.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-colors"
            >
              <Icon className={cn('w-5 h-5 transition-colors', active ? 'text-emerald-400' : 'text-white/35')} />
              <span className={cn('text-[10px] font-medium transition-colors', active ? 'text-emerald-400' : 'text-white/35')}>
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
