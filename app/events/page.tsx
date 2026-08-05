'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';
import { useAuthPrompt } from '@/components/auth-prompt-modal';
import PublicNav from '@/components/navigation/public-nav';
import type { Event } from '@/lib/types';
import { Calendar, MapPin, Search, Wifi, Star, Plus, ArrowRight, Clock, Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';

const MANCHESTER_AREAS = [
  'All Manchester', 'Manchester', 'Salford', 'Oldham', 'Bolton', 'Bury',
  'Rochdale', 'Stockport', 'Ashton-under-Lyne', 'Trafford', 'Tameside',
];

const CAT_FILTERS = [
  { value: 'all',          label: 'All Events' },
  { value: 'networking',   label: 'Networking' },
  { value: 'religious',    label: 'Religious' },
  { value: 'education',    label: 'Education' },
  { value: 'social',       label: 'Social' },
  { value: 'conference',   label: 'Conference' },
  { value: 'charity_event',label: 'Charity' },
  { value: 'youth_program',label: 'Youth' },
];

const catColor: Record<string, string> = {
  networking:    'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  religious:     'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  education:     'text-blue-400 bg-blue-500/10 border-blue-500/20',
  social:        'text-amber-400 bg-amber-500/10 border-amber-500/20',
  conference:    'text-violet-400 bg-violet-500/10 border-violet-500/20',
  charity_event: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  charity:       'text-rose-400 bg-rose-500/10 border-rose-500/20',
  youth_program: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  general:       'text-white/50 bg-white/5 border-white/10',
  other:         'text-white/50 bg-white/5 border-white/10',
};

function formatEventDate(start: string, end: string | null) {
  const s = new Date(start);
  const day = s.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const time = s.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  if (!end) return `${day} · ${time}`;
  const e = new Date(end);
  const sameDay = s.toDateString() === e.toDateString();
  if (sameDay) return `${day} · ${time} – ${e.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
  const endDay = e.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return `${day} – ${endDay}`;
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [category, setCategory] = useState('all');
  const [area, setArea] = useState('All Manchester');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { prompt } = useAuthPrompt();

  useEffect(() => {
    async function load() {
      setLoading(true);
      let q = supabase
        .from('events')
        .select('*')
        .gte('start_datetime', new Date().toISOString())
        .order('is_featured', { ascending: false })
        .order('start_datetime', { ascending: true })
        .limit(40);
      if (category !== 'all') q = q.eq('category', category);
      if (area !== 'All Manchester') q = q.eq('city', area);
      const { data } = await q;
      setEvents((data as Event[]) || []);
      setLoading(false);
    }
    load();
  }, [category, area]);

  const filtered = search.trim()
    ? events.filter((e) =>
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.city?.toLowerCase().includes(search.toLowerCase()) ||
        e.venue_name?.toLowerCase().includes(search.toLowerCase())
      )
    : events;

  return (
    <div className="min-h-screen bg-[#050505]">
      <PublicNav />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-[76px] py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Events in Manchester</h1>
            <p className="text-white/45 mt-1.5">Discover Muslim events across Greater Manchester — networking, religious, social, and more. Free to browse.</p>
          </div>
          <Link href="/auth/signup" className="btn-brand text-sm px-5 py-2.5 self-start sm:self-auto">
            <Plus className="w-3.5 h-3.5" /> Create Event
          </Link>
        </div>

        {/* Search + Region */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search events, venues or cities…"
              className="field-input pl-10 w-full"
            />
          </div>
          <select
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className="field-input appearance-none cursor-pointer w-full sm:w-56 bg-[#111]"
          >
            {MANCHESTER_AREAS.map((r) => (
              <option key={r} value={r} className="bg-[#111]">{r}</option>
            ))}
          </select>
        </div>

        {/* Category tabs */}
        <div className="flex gap-1 overflow-x-auto scrollbar-hide border-b border-white/[0.06] mb-5">
          {CAT_FILTERS.map(({ value, label }) => (
            <button key={value} onClick={() => setCategory(value)}
              className={cn(
                'px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap flex-shrink-0',
                category === value ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-white/40 hover:text-white/70'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Promote your event — organisation revenue affordance */}
        <div className="glass-card border border-amber-500/15 bg-amber-500/[0.04] p-4 mb-7 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
              <Star className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Promote your event to the Manchester community</p>
              <p className="text-xs text-white/45">Featured placements start from £10 per event. Reach Muslims across Greater Manchester.</p>
            </div>
          </div>
          <Link href="/about" className="btn-ghost text-sm px-5 py-2.5 whitespace-nowrap flex-shrink-0">
            Get featured
          </Link>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="glass-card p-5 animate-pulse">
                <div className="h-4 bg-white/10 rounded w-2/3 mb-3" />
                <div className="h-3 bg-white/10 rounded w-full mb-2" />
                <div className="h-3 bg-white/10 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card p-16 text-center">
            <Calendar className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <p className="text-white/40 font-medium mb-2">No events listed in this area yet</p>
            <p className="text-white/25 text-sm mb-6">We&apos;re adding Manchester events regularly. Know of one we should include?</p>
            <Link href="/about" className="btn-ghost text-sm px-6 py-2.5">
              Suggest an event
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((event) => {
              const colors = catColor[event.category] ?? catColor.general;
              return (
                <div key={event.id} className={cn('glass-card flex flex-col border', event.is_featured ? 'border-amber-500/20 bg-amber-500/5' : 'border-white/[0.06]')}>
                  {event.image_url && (
                    <div className="h-36 overflow-hidden rounded-t-xl">
                      <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full border', colors)}>
                        {CAT_FILTERS.find((c) => c.value === event.category)?.label ?? event.category}
                      </span>
                      {event.is_featured && (
                        <span className="flex items-center gap-0.5 text-[10px] text-amber-400 font-medium">
                          <Star className="w-3 h-3 fill-amber-400" /> Featured
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-white leading-snug mb-2 flex-1">{event.title}</h3>
                    {event.description && (
                      <p className="text-xs text-white/45 leading-relaxed mb-3 line-clamp-2">{event.description}</p>
                    )}
                    <div className="space-y-1.5 mt-auto">
                      <div className="flex items-center gap-1.5 text-xs text-white/50">
                        <Clock className="w-3.5 h-3.5 text-emerald-400/60 flex-shrink-0" />
                        <span>{formatEventDate(event.start_datetime, event.end_datetime ?? null)}</span>
                      </div>
                      {(event.venue_name || event.city) && (
                        <div className="flex items-center gap-1.5 text-xs text-white/50">
                          {event.is_online ? (
                            <Wifi className="w-3.5 h-3.5 text-cyan-400/60 flex-shrink-0" />
                          ) : (
                            <MapPin className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
                          )}
                          <span className="truncate">
                            {event.is_online ? 'Online' : [event.venue_name, event.city].filter(Boolean).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Link href="/auth/signup" className="btn-ghost text-xs py-2 flex-1 flex items-center justify-center gap-1">
                        View Details <ArrowRight className="w-3 h-3" />
                      </Link>
                      <button
                        onClick={() => !user && prompt('save')}
                        className="flex items-center justify-center gap-1 text-xs font-medium text-white/55 hover:text-emerald-400 transition-colors py-2 px-3 rounded-lg border border-white/[0.06] hover:bg-white/[0.04]"
                        aria-label="Save event"
                      >
                        <Bookmark className="w-3.5 h-3.5" /> Save
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
