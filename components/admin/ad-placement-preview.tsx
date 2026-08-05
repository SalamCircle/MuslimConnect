'use client';

import { Smartphone as PhoneIcon, Monitor as DesktopIcon, Newspaper, PanelRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PlacementGroup {
  id: string;
  label: string;
  slot: string;
  icon: typeof PhoneIcon;
}

export const PLACEMENT_GROUPS: PlacementGroup[] = [
  { id: 'mobile_top',    label: 'Mobile Top',    slot: 'mobile_top',    icon: PhoneIcon },
  { id: 'mobile_bottom', label: 'Mobile Bottom', slot: 'mobile_bottom', icon: PhoneIcon },
  { id: 'desktop_top',   label: 'Desktop Top',   slot: 'desktop_top',   icon: DesktopIcon },
  { id: 'feed_inline',   label: 'Feed Inline',   slot: 'feed_inline',   icon: Newspaper },
  { id: 'sidebar',       label: 'Sidebar',       slot: 'sidebar',       icon: PanelRight },
  { id: 'homepage_banner', label: 'Homepage Banner', slot: 'homepage_banner', icon: Newspaper },
  { id: 'businesses_page', label: 'Businesses Page', slot: 'businesses_page', icon: Newspaper },
  { id: 'jobs_page',     label: 'Jobs Page',     slot: 'jobs_page',     icon: Newspaper },
  { id: 'events_page',   label: 'Events Page',   slot: 'events_page',   icon: Newspaper },
];

interface AdPlacementPreviewProps {
  activeSlot: string;
  counts: Record<string, number>;
  onSelect: (slot: string) => void;
}

export default function AdPlacementPreview({ activeSlot, counts, onSelect }: AdPlacementPreviewProps) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* Mobile frame */}
      <div>
        <p className="text-xs font-semibold text-white/50 mb-2 flex items-center gap-1.5">
          <PhoneIcon className="w-3.5 h-3.5 text-emerald-400" /> Mobile
        </p>
        <div className="mx-auto w-[200px] rounded-[2rem] border-2 border-white/10 bg-[#080808] p-2 shadow-xl">
          <div className="rounded-[1.5rem] overflow-hidden bg-[#050505]">
            {/* top bar */}
            <div className="h-7 bg-[#070707] border-b border-white/[0.06] flex items-center px-3">
              <div className="w-4 h-4 rounded bg-gradient-brand" />
            </div>
            {/* mobile_top ad zone */}
            <PreviewZone
              slot="mobile_top"
              label="Mobile Top Ad"
              count={counts['mobile_top'] ?? 0}
              active={activeSlot === 'mobile_top'}
              onSelect={onSelect}
              className="min-h-[28px] text-[9px]"
            />
            {/* content area */}
            <div className="space-y-1.5 p-2.5 min-h-[140px]">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-lg bg-white/[0.03] p-1.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-3 h-3 rounded-full bg-white/10" />
                    <div className="h-1 w-8 rounded bg-white/10" />
                  </div>
                  <div className="h-1 w-full rounded bg-white/5 mb-0.5" />
                  <div className="h-1 w-2/3 rounded bg-white/5" />
                </div>
              ))}
            </div>
            {/* mobile_bottom ad zone */}
            <PreviewZone
              slot="mobile_bottom"
              label="Mobile Bottom Ad"
              count={counts['mobile_bottom'] ?? 0}
              active={activeSlot === 'mobile_bottom'}
              onSelect={onSelect}
              className="min-h-[28px] text-[9px]"
            />
            {/* bottom tab bar */}
            <div className="h-10 bg-[#070707] border-t border-white/[0.06] flex items-center justify-around px-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="w-4 h-4 rounded bg-white/10" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop frame */}
      <div>
        <p className="text-xs font-semibold text-white/50 mb-2 flex items-center gap-1.5">
          <DesktopIcon className="w-3.5 h-3.5 text-emerald-400" /> Desktop
        </p>
        <div className="rounded-xl border-2 border-white/10 bg-[#080808] p-1.5 shadow-xl">
          <div className="rounded-lg overflow-hidden bg-[#050505]">
            {/* sidebar + content area */}
            <div className="flex min-h-[200px]">
              {/* sidebar */}
              <div className="w-12 bg-[#070707] border-r border-white/[0.06] p-1.5 flex flex-col gap-1.5">
                <div className="w-6 h-6 rounded bg-gradient-brand mb-1" />
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-2 w-full rounded bg-white/10" />
                ))}
                {/* sidebar ad zone */}
                <div className="mt-auto">
                  <PreviewZone
                    slot="sidebar"
                    label="Sidebar Ad"
                    count={counts['sidebar'] ?? 0}
                    active={activeSlot === 'sidebar'}
                    onSelect={onSelect}
                    className="min-h-[32px] text-[9px]"
                  />
                </div>
              </div>
              {/* main content */}
              <div className="flex-1 p-2">
                {/* desktop_top ad zone */}
                <PreviewZone
                  slot="desktop_top"
                  label="Desktop Top Ad"
                  count={counts['desktop_top'] ?? 0}
                  active={activeSlot === 'desktop_top'}
                  onSelect={onSelect}
                  className="min-h-[28px] text-[9px] mb-2"
                />
                {/* feed */}
                <div className="space-y-1.5">
                  <div className="rounded-lg bg-white/[0.03] p-1.5">
                    <div className="h-1 w-12 rounded bg-white/10 mb-1" />
                    <div className="h-1 w-full rounded bg-white/5 mb-0.5" />
                    <div className="h-1 w-2/3 rounded bg-white/5" />
                  </div>
                  {/* feed_inline ad zone */}
                  <PreviewZone
                    slot="feed_inline"
                    label="Feed Ad"
                    count={counts['feed_inline'] ?? 0}
                    active={activeSlot === 'feed_inline'}
                    onSelect={onSelect}
                    className="min-h-[28px] text-[9px]"
                  />
                  <div className="rounded-lg bg-white/[0.03] p-1.5">
                    <div className="h-1 w-12 rounded bg-white/10 mb-1" />
                    <div className="h-1 w-full rounded bg-white/5 mb-0.5" />
                    <div className="h-1 w-2/3 rounded bg-white/5" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewZone({
  slot,
  label,
  count,
  active,
  onSelect,
  className,
}: {
  slot: string;
  label: string;
  count: number;
  active: boolean;
  onSelect: (slot: string) => void;
  className?: string;
}) {
  return (
    <button
      onClick={() => onSelect(slot)}
      className={cn(
        'w-full flex items-center justify-between gap-1 rounded-lg border px-2 py-1 transition-all text-left',
        active
          ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
          : 'bg-white/[0.02] border-white/[0.08] hover:border-emerald-500/30 hover:bg-emerald-500/5 text-white/40 hover:text-white/60',
        className
      )}
      title={`${label} — ${count} ad(s)`}
    >
      <span className="font-medium truncate leading-none">{label}</span>
      <span className={cn(
        'rounded-full px-1.5 py-0.5 text-[8px] font-bold leading-none flex-shrink-0',
        count > 0
          ? (active ? 'bg-amber-400/20 text-amber-300' : 'bg-emerald-500/15 text-emerald-400')
          : 'bg-white/5 text-white/30'
      )}>
        {count}
      </span>
    </button>
  );
}
