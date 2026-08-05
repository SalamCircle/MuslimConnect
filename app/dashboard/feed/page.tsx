'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { MapPin, Globe, Building2, Flag, TrendingUp } from 'lucide-react';
import type { LocationScope } from '@/lib/types';
import Feed from '@/components/feed/feed';
import RightPanel from '@/components/dashboard/right-panel';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';

const scopes: { value: LocationScope; label: string; icon: React.ElementType }[] = [
  { value: 'area',   label: 'My Area',   icon: MapPin },
  { value: 'city',   label: 'My City',   icon: Building2 },
  { value: 'region', label: 'My Region', icon: TrendingUp },
  { value: 'uk',     label: 'UK',        icon: Flag },
  { value: 'global', label: 'All',     icon: Globe },
];

function FeedContent() {
  const { profile } = useAuth();
  const searchParams = useSearchParams();
  const initial = (searchParams.get('scope') as LocationScope) || 'global';
  const [scope, setScope] = useState<LocationScope>(initial);

  const subtitle = scope === 'area' && profile?.postcode ? profile.postcode
    : scope === 'city' && profile?.city ? profile.city
    : scope === 'region' && profile?.region ? profile.region
    : scope === 'uk' ? 'United Kingdom'
    : scope === 'global' ? 'All posts' : 'Worldwide';

  return (
    <div className="flex h-full">
      <div className="flex-1 min-w-0 border-r border-white/[0.04]">
        {/* Sticky header */}
        <div className="sticky top-14 md:top-0 z-30 bg-[#050505]/95 backdrop-blur-xl border-b border-white/[0.05]">
          <div className="max-w-2xl mx-auto px-5 pt-5">
            <div className="mb-4">
              <h1 className="text-lg font-bold text-white">Discussions</h1>
              <p className="text-xs text-white/40 mt-0.5 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-emerald-400" /> {subtitle}
              </p>
            </div>
            <div className="flex gap-0 border-b border-white/[0.06] -mx-5 px-5 overflow-x-auto scrollbar-hide">
              {scopes.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setScope(value)}
                  className={cn(
                    'flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-all whitespace-nowrap flex-shrink-0',
                    scope === value
                      ? 'border-emerald-400 text-emerald-400'
                      : 'border-transparent text-white/40 hover:text-white/70 hover:border-white/20'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-5 py-5">
          <Feed scope={scope} />
        </div>
      </div>

      <div className="hidden xl:block w-[340px] flex-shrink-0">
        <div className="sticky top-0 h-screen overflow-y-auto scrollbar-hide py-5 px-4">
          <RightPanel />
        </div>
      </div>
    </div>
  );
}

export default function FeedPage() {
  return (
    <Suspense fallback={
      <div className="max-w-2xl mx-auto px-5 py-8 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card p-5 h-36 animate-pulse" />
        ))}
      </div>
    }>
      <FeedContent />
    </Suspense>
  );
}
