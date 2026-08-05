'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';
import { useAuthPrompt } from '@/components/auth-prompt-modal';
import PublicNav from '@/components/navigation/public-nav';
import type { Business } from '@/lib/types';
import { Store, MapPin, Phone, Globe, CheckCircle2, Search, Zap, ExternalLink, Bookmark, MessageSquare, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  { value: 'all',              label: 'All' },
  { value: 'halal_restaurant', label: 'Halal Restaurants' },
  { value: 'tutor',            label: 'Tutors' },
  { value: 'islamic_school',   label: 'Islamic Schools' },
  { value: 'muslim_business',  label: 'Muslim Businesses' },
  { value: 'islamic_finance',  label: 'Islamic Finance' },
  { value: 'other',            label: 'Other' },
];

const catLabel: Record<string, string> = {
  halal_restaurant: 'Halal Restaurant',
  tutor:            'Tutor',
  islamic_school:   'Islamic School',
  muslim_business:  'Muslim Business',
  islamic_finance:  'Islamic Finance',
  other:            'Business',
};

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { prompt } = useAuthPrompt();

  useEffect(() => {
    async function load() {
      setLoading(true);
      let q = supabase.from('businesses').select('*').order('is_verified', { ascending: false }).order('created_at', { ascending: false }).limit(40);
      if (category !== 'all') q = q.eq('category', category);
      const { data } = await q;
      setBusinesses((data as Business[]) || []);
      setLoading(false);
    }
    load();
  }, [category]);

  const filtered = search.trim()
    ? businesses.filter((b) => b.name.toLowerCase().includes(search.toLowerCase()) || b.city?.toLowerCase().includes(search.toLowerCase()))
    : businesses;

  return (
    <div className="min-h-screen bg-[#050505]">
      <PublicNav />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-[76px] py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Muslim Business Directory</h1>
          <p className="text-white/45 mt-1.5">Discover Muslim-owned businesses and trusted services near you. Free to browse.</p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search businesses or cities…"
            className="field-input pl-10 w-full max-w-md"
          />
        </div>

        {/* Category tabs */}
        <div className="flex gap-1 overflow-x-auto scrollbar-hide border-b border-white/[0.06] mb-8">
          {CATEGORIES.map(({ value, label }) => (
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

        {/* Get featured / claim listing — organisation revenue affordance */}
        <div className="glass-card border border-amber-500/15 bg-amber-500/[0.04] p-4 mb-7 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
              <Star className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Get your business verified or featured</p>
              <p className="text-xs text-white/45">Verified listings from £8/month. Featured placements from £20/month. Reach Manchester Muslims.</p>
            </div>
          </div>
          <Link href="/about" className="btn-ghost text-sm px-5 py-2.5 whitespace-nowrap flex-shrink-0">
            Get listed
          </Link>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card p-5 animate-pulse">
                <div className="h-4 bg-white/10 rounded w-2/3 mb-3" />
                <div className="h-3 bg-white/10 rounded w-full mb-2" />
                <div className="h-3 bg-white/10 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card p-16 text-center">
            <Store className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <p className="text-white/40 font-medium mb-2">No businesses listed in this category yet</p>
            <p className="text-white/25 text-sm mb-6">We&apos;re adding Manchester businesses regularly. Run a Muslim-owned business?</p>
            <Link href="/about" className="btn-ghost text-sm px-6 py-2.5">
              Get your business listed
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((b) => (
              <div key={b.id} className="glass-card p-5 flex flex-col gap-3">
                {b.image_url && (
                  <div className="h-40 rounded-lg overflow-hidden">
                    <img src={b.image_url} alt={b.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <h3 className="text-sm font-semibold text-white">{b.name}</h3>
                    {b.is_verified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
                    {b.is_sponsored && <span className="text-xs text-amber-400 bg-amber-500/10 px-1.5 rounded">Sponsored</span>}
                  </div>
                  <span className="text-xs text-white/35">{catLabel[b.category] ?? b.category}</span>
                </div>
                {b.description && (
                  <p className="text-xs text-white/50 leading-relaxed line-clamp-2">{b.description}</p>
                )}
                <div className="space-y-1">
                  {(b.address || b.city) && (
                    <div className="flex items-start gap-2 text-xs text-white/45">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-emerald-400/50" />
                      <span>{[b.address, b.city].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                  {b.phone && (
                    <div className="flex items-center gap-2 text-xs text-white/45">
                      <Phone className="w-3.5 h-3.5 flex-shrink-0 text-white/25" />
                      <a href={`tel:${b.phone}`} className="hover:text-white transition-colors">{b.phone}</a>
                    </div>
                  )}
                  {b.website && (
                    <div className="flex items-center gap-2 text-xs text-white/45">
                      <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 text-white/25" />
                      <a href={b.website} target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 transition-colors truncate">
                        {b.website.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-1 mt-1 border-t border-white/[0.05]">
                  <button
                    onClick={() => !user && prompt('save')}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-white/55 hover:text-amber-400 transition-colors py-2 rounded-lg hover:bg-white/[0.04]"
                  >
                    <Bookmark className="w-3.5 h-3.5" /> Save
                  </button>
                  <button
                    onClick={() => !user && prompt('comment')}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-white/55 hover:text-amber-400 transition-colors py-2 rounded-lg hover:bg-white/[0.04]"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Leave feedback
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
