'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { Advertisement } from '@/lib/types';
import { ExternalLink, Megaphone, X } from 'lucide-react';

interface AdBannerProps {
  placement: string;
  city?: string | null;
  region?: string | null;
  variant?: 'card' | 'bar';
  rotateIntervalMs?: number;
  dismissible?: boolean;
}

const DEFAULT_ROTATE_MS = 8000;

export default function AdBanner({
  placement,
  city,
  region,
  variant = 'card',
  rotateIntervalMs = DEFAULT_ROTATE_MS,
  dismissible = false,
}: AdBannerProps) {
  const [pool, setPool] = useState<Advertisement[]>([]);
  const [index, setIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchAds() {
      const { data } = await supabase
        .from('advertisements')
        .select('*')
        .eq('placement_slot', placement)
        .eq('is_active', true)
        .or(
          [
            'target_scope.is.null',
            'target_scope.eq.global',
            ...(city ? [`target_city.ilike.${city}`] : []),
            ...(region ? [`target_region.ilike.${region}`] : []),
          ].join(',')
        )
        .order('created_at', { ascending: false })
        .limit(10);

      if (cancelled || !data || data.length === 0) return;
      const ads = data as Advertisement[];
      setPool(ads);
      setIndex(Math.floor(Math.random() * ads.length));
    }

    fetchAds();
    return () => { cancelled = true; };
  }, [placement, city, region]);

  const ad = pool[index] ?? null;

  useEffect(() => {
    if (pool.length <= 1 || dismissed) return;
    timerRef.current = setInterval(() => {
      setIndex((prev) => (prev + 1) % pool.length);
    }, rotateIntervalMs);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [pool.length, rotateIntervalMs, dismissed]);

  if (!ad || dismissed) return null;

  if (variant === 'bar') {
    return (
      <div className="relative w-full bg-[#0c0c0c] border-b border-white/[0.06] flex-shrink-0">
        <a
          href={ad.link_url ?? '#'}
          target={ad.link_url ? '_blank' : undefined}
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 px-3 py-2 min-w-0 group"
          onClick={(e) => { if (!ad.link_url) e.preventDefault(); }}
        >
          {ad.image_url ? (
            <img
              src={ad.image_url}
              alt={ad.title}
              className="w-9 h-9 rounded-lg object-cover flex-shrink-0 border border-white/10"
            />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center flex-shrink-0">
              <Megaphone className="w-4 h-4 text-amber-400" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-wider text-amber-400/70 font-semibold leading-none">Sponsored</p>
            <p className="text-xs font-medium text-white/90 truncate leading-tight mt-0.5">{ad.title}</p>
          </div>
          {ad.link_url && (
            <ExternalLink className="w-3.5 h-3.5 text-white/25 group-hover:text-emerald-400 flex-shrink-0 transition-colors" />
          )}
        </a>
        {dismissible && (
          <button
            onClick={() => setDismissed(true)}
            className="absolute top-1/2 -translate-y-1/2 right-1.5 p-1 rounded text-white/30 hover:text-white/70 hover:bg-white/5 transition-colors"
            aria-label="Dismiss ad"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        {pool.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 flex gap-0.5 px-3 pb-0.5 pointer-events-none">
            {pool.map((_, i) => (
              <div
                key={i}
                className={`h-0.5 flex-1 rounded-full transition-colors ${i === index ? 'bg-amber-400/60' : 'bg-white/10'}`}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <a
      href={ad.link_url ?? '#'}
      target={ad.link_url ? '_blank' : undefined}
      rel="noopener noreferrer"
      className="block group"
      onClick={(e) => { if (!ad.link_url) e.preventDefault(); }}
    >
      <div className="glass-card overflow-hidden border border-white/[0.06] hover:border-emerald-500/25 transition-all duration-200">
        {ad.image_url && (
          <div className="w-full overflow-hidden">
            <img
              src={ad.image_url}
              alt={ad.title}
              className="w-full object-cover max-h-32 group-hover:scale-[1.02] transition-transform duration-300"
            />
          </div>
        )}
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center flex-shrink-0">
              <Megaphone className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white/90 truncate">{ad.title}</p>
              <p className="text-[10px] text-white/30 uppercase tracking-wider font-medium">Sponsored</p>
            </div>
          </div>
          {ad.link_url && (
            <ExternalLink className="w-3.5 h-3.5 text-white/25 group-hover:text-emerald-400 flex-shrink-0 transition-colors" />
          )}
        </div>
      </div>
    </a>
  );
}
