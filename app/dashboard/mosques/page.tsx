'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';
import type { Mosque } from '@/lib/types';
import { Building, MapPin, Phone, Globe, CheckCircle2, Search, Bookmark, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const MANCHESTER_AREAS = [
  'All Manchester', 'Manchester', 'Salford', 'Oldham', 'Bolton', 'Bury',
  'Rochdale', 'Stockport', 'Ashton-under-Lyne', 'Trafford', 'Tameside',
];

export default function DashboardMosquesPage() {
  const { user } = useAuth();

  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [area, setArea] = useState('All Manchester');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      let q = supabase.from('mosques').select('*').order('is_verified', { ascending: false }).order('name', { ascending: true }).limit(60);
      if (area !== 'All Manchester') q = q.eq('city', area);
      const { data } = await q;
      setMosques((data as Mosque[]) || []);
      setLoading(false);
    }
    load();
  }, [area]);

  async function toggleSave(mosqueId: string) {
    if (!user) return;
    const { error } = await supabase.from('post_saves').insert({ post_id: mosqueId, user_id: user.id }).select();
    if (error && error.code === '23505') { toast.success('Already saved.'); }
    else if (error) { toast.error('Could not save.'); }
    else { toast.success('Mosque saved!'); }
  }

  const filtered = search.trim()
    ? mosques.filter((m) =>
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.city?.toLowerCase().includes(search.toLowerCase())
      )
    : mosques;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Mosques</h1>
        <p className="text-sm text-white/40 mt-1">Find and save mosques and Islamic centres across Greater Manchester.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or city…" className="field-input pl-10 w-full" />
        </div>
        <select value={area} onChange={(e) => setArea(e.target.value)} className="field-input appearance-none cursor-pointer w-full sm:w-56 bg-[#111]">
          {MANCHESTER_AREAS.map((r) => <option key={r} value={r} className="bg-[#111]">{r}</option>)}
        </select>
      </div>

      <p className="text-xs text-white/30 mb-5">{filtered.length} mosque{filtered.length !== 1 ? 's' : ''} found</p>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="glass-card p-5 animate-pulse h-40" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <MapPin className="w-10 h-10 text-white/15 mx-auto mb-3" />
          <p className="text-white/40 font-medium">No mosques found in this area yet</p>
          <p className="text-white/25 text-sm mt-1.5">We&apos;re adding Manchester mosques regularly.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((mosque) => (
            <div key={mosque.id} className="glass-card p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="text-sm font-semibold text-white leading-snug">{mosque.name}</h3>
                    {mosque.is_verified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
                  </div>
                </div>
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <Building className="w-4 h-4 text-blue-400" />
                </div>
              </div>

              <div className="space-y-1.5">
                {(mosque.address || mosque.city) && (
                  <div className="flex items-start gap-2 text-xs text-white/50">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-emerald-400/60" />
                    <span>{[mosque.address, mosque.city, mosque.postcode].filter(Boolean).join(', ')}</span>
                  </div>
                )}
                {mosque.phone && (
                  <div className="flex items-center gap-2 text-xs text-white/50">
                    <Phone className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
                    <a href={`tel:${mosque.phone}`} className="hover:text-white transition-colors">{mosque.phone}</a>
                  </div>
                )}
                {mosque.website && (
                  <div className="flex items-center gap-2 text-xs text-white/50">
                    <Globe className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
                    <a href={mosque.website} target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 transition-colors truncate">{mosque.website.replace(/^https?:\/\//, '')}</a>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-1 mt-1 border-t border-white/[0.05]">
                <button onClick={() => toggleSave(mosque.id)} className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-white/55 hover:text-emerald-400 transition-colors py-2 rounded-lg hover:bg-white/[0.04]">
                  <Bookmark className="w-3.5 h-3.5" /> Save
                </button>
                <button onClick={() => toast.info('Suggest edit coming soon')} className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-white/55 hover:text-emerald-400 transition-colors py-2 rounded-lg hover:bg-white/[0.04]">
                  <Pencil className="w-3.5 h-3.5" /> Suggest edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
