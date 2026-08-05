'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Moon, Menu, Search, Zap, User, X, MapPin, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose,
} from '@/components/ui/sheet';

const navLinks = [
  { href: '/events',      label: 'Events' },
  { href: '/communities', label: 'Groups' },
  { href: '/mosques',     label: 'Mosques' },
  { href: '/businesses',  label: 'Businesses' },
  { href: '/jobs',        label: 'Jobs' },
  { href: '/board',       label: 'Community' },
];

const aboutLinks = [
  { href: '/about',     label: 'About' },
  { href: '/safety',    label: 'Safety' },
];

export default function PublicNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  function active(href: string) {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <header className="fixed top-0 inset-x-0 z-50">
      <div className="glass border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center glow-sm">
              <Moon className="w-4.5 h-4.5 text-white" fill="white" />
            </div>
            <span className="text-base font-bold text-white tracking-tight">ConnectMuslim</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-0.5">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'px-3.5 py-2 rounded-lg text-[15px] font-medium transition-all',
                  active(href)
                    ? 'text-emerald-400 bg-emerald-500/10'
                    : 'text-white/55 hover:text-white hover:bg-white/6'
                )}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Desktop right cluster */}
          <div className="hidden lg:flex items-center gap-2">
            <Link
              href="/search"
              className={cn(
                'p-2.5 rounded-lg transition-all',
                active('/search')
                  ? 'text-emerald-400 bg-emerald-500/10'
                  : 'text-white/45 hover:text-white hover:bg-white/6'
              )}
              title="Search"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </Link>
            <Link href="/auth/login" className="btn-ghost text-sm px-4 py-2">Sign in</Link>
            <span className="hidden xl:inline-flex items-center gap-1.5 text-xs text-emerald-400/80 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-1">
              <MapPin className="w-3 h-3" /> Manchester
            </span>
            <Link href="/auth/signup" className="btn-brand text-sm px-4 py-2">
              <UserPlus className="w-3.5 h-3.5" /> Join Free
            </Link>
          </div>

          {/* Mobile right cluster — always visible: search + menu */}
          <div className="flex lg:hidden items-center gap-1">
            <Link
              href="/search"
              className={cn(
                'w-11 h-11 flex items-center justify-center rounded-lg transition-all',
                active('/search')
                  ? 'text-emerald-400 bg-emerald-500/10'
                  : 'text-white/55 hover:text-white hover:bg-white/6'
              )}
              title="Search"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </Link>
            <Link
              href="/auth/login"
              className="w-11 h-11 flex items-center justify-center rounded-lg text-white/55 hover:text-white hover:bg-white/6 transition-all"
              title="Sign in"
              aria-label="Sign in"
            >
              <User className="w-5 h-5" />
            </Link>
            <button
              onClick={() => setOpen(true)}
              className="w-11 h-11 flex items-center justify-center rounded-lg text-white hover:bg-white/6 transition-all"
              title="Open menu"
              aria-label="Open menu"
            >
              <Menu className="w-5.5 h-5.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[88%] max-w-sm bg-[#0a0a0a] border-l border-white/10 p-0">
          <SheetHeader className="px-5 pt-5 pb-3 border-b border-white/[0.06] flex-row items-center justify-between space-y-0">
            <SheetTitle className="flex items-center gap-2.5 text-base font-bold text-white">
              <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center">
                <Moon className="w-4 h-4 text-white" fill="white" />
              </div>
              ConnectMuslim
            </SheetTitle>
            <SheetClose className="w-9 h-9 flex items-center justify-center rounded-lg text-white/45 hover:text-white hover:bg-white/6 transition-all">
              <X className="w-5 h-5" />
            </SheetClose>
          </SheetHeader>

          <div className="flex flex-col h-[calc(100%-72px)] overflow-y-auto">
            <nav className="px-3 py-4 space-y-1">
              <p className="px-3 pb-1.5 pt-2 text-xs font-semibold text-white/35 uppercase tracking-wider">Discover</p>
              {navLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex items-center px-3.5 py-3.5 rounded-xl text-[15px] font-medium transition-all min-h-[48px]',
                    active(href)
                      ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                      : 'text-white/65 hover:text-white hover:bg-white/6'
                  )}
                >
                  {label}
                </Link>
              ))}

              <p className="px-3 pb-1.5 pt-5 text-xs font-semibold text-white/35 uppercase tracking-wider">About</p>
              {aboutLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex items-center px-3.5 py-3.5 rounded-xl text-[15px] font-medium transition-all min-h-[48px]',
                    active(href)
                      ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                      : 'text-white/65 hover:text-white hover:bg-white/6'
                  )}
                >
                  {label}
                </Link>
              ))}
            </nav>

            <div className="mt-auto px-5 py-5 border-t border-white/[0.06] bg-black/20">
              <Link
                href="/auth/signup"
                onClick={() => setOpen(false)}
                className="btn-brand w-full text-sm py-3.5 mb-2.5"
              >
                <Zap className="w-4 h-4" /> Join Free
              </Link>
              <Link
                href="/auth/login"
                onClick={() => setOpen(false)}
                className="btn-ghost w-full text-sm py-3.5"
              >
                Sign in
              </Link>
              <p className="text-center text-xs text-white/35 mt-3">
                Free to explore · No account needed to browse
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
