'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';
import type { Business } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { Store, Plus, MapPin, Phone, Globe, X, CheckCircle2, Star, Search, ExternalLink, Bookmark, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'halal_restaurant', label: 'Halal Restaurants' },
  { value: 'grocery', label: 'Grocery' },
  { value: 'tutor', label: 'Tutors' },
  { value: 'islamic_school', label: 'Islamic Schools' },
  { value: 'muslim_business', label: 'Muslim Businesses' },
  { value: 'islamic_finance', label: 'Islamic Finance' },
  { value: 'accountancy', label: 'Accountancy' },
  { value: 'retail', label: 'Retail' },
  { value: 'service', label: 'Services' },
  { value: 'other', label: 'Other' },
];

const FORM_CATEGORIES = ['halal_restaurant','grocery','tutor','islamic_school','muslim_business','islamic_finance','accountancy','retail','service','other'];

const catLabel: Record<string, string> = {
  halal_restaurant: 'Halal Restaurant', tutor: 'Tutor', mosque: 'Mosque',
  islamic_school: 'Islamic School', muslim_business: 'Muslim Business',
  islamic_finance: 'Islamic Finance', accountancy: 'Accountancy', grocery: 'Grocery',
  retail: 'Retail', service: 'Service', other: 'Business',
};

const emptyForm = {
  name: '', description: '', category: 'other', address: '', city: '', region: 'North West',
  postcode: '', phone: '', email: '', website: '',
};

export default function DashboardBusinessesPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'browse' | 'mine'>('browse');

  const [allBusinesses, setAllBusinesses] = useState<Business[]>([]);
  const [myBusinesses, setMyBusinesses] = useState<Business[]>([]);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [myLoading, setMyLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);

  async function loadBrowse() {
    setLoading(true);
    let q = supabase.from('businesses').select('*').order('is_sponsored', { ascending: false }).order('is_verified', { ascending: false }).order('created_at', { ascending: false }).limit(40);
    if (category !== 'all') q = q.eq('category', category);
    const { data } = await q;
    setAllBusinesses((data as Business[]) || []);
    setLoading(false);
  }

  async function loadMine() {
    if (!user) return;
    setMyLoading(true);
    const { data } = await supabase.from('businesses').select('*').eq('owner_id', user.id).order('created_at', { ascending: false });
    setMyBusinesses((data as Business[]) || []);
    setMyLoading(false);
  }

  useEffect(() => { loadBrowse(); }, [category]);
  useEffect(() => { if (user) loadMine(); }, [user]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    const { error } = await supabase.from('businesses').insert({
      owner_id: user.id,
      name: form.name.trim(),
      description: form.description.trim() || null,
      category: form.category,
      address: form.address.trim() || null,
      city: form.city.trim() || null,
      region: form.region || null,
      postcode: form.postcode.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      website: form.website.trim() || null,
      is_verified: false,
      is_sponsored: false,
    });
    if (error) { toast.error('Failed to add listing.'); }
    else { toast.success('Business listing added!'); setShowModal(false); setForm({ ...emptyForm }); loadMine(); }
    setSubmitting(false);
  }

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  async function toggleSave(businessId: string) {
    if (!user) return;
    const { error } = await supabase.from('post_saves').insert({ post_id: businessId, user_id: user.id }).select();
    if (error && error.code === '23505') { toast.success('Already saved.'); }
    else if (error) { toast.error('Could not save.'); }
    else { toast.success('Business saved!'); }
  }

  const filtered = search.trim()
    ? allBusinesses.filter((b) =>
        b.name.toLowerCase().includes(search.toLowerCase()) ||
        b.city?.toLowerCase().includes(search.toLowerCase()) ||
        b.description?.toLowerCase().includes(search.toLowerCase())
      )
    : allBusinesses;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Muslim Business Directory</h1>
          <p className="text-sm text-white/40 mt-1">Browse Muslim-owned businesses and trusted services near you, or add your own listing.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-brand text-sm px-4 py-2.5 self-start sm:self-auto whitespace-nowrap">
          <Plus className="w-4 h-4" /> Add Business
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-white/[0.06] mb-6">
        <button onClick={() => setTab('browse')}
          className={cn('px-5 py-3 text-sm font-medium border-b-2 transition-all', tab === 'browse' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-white/40 hover:text-white/70')}>
          Browse
        </button>
        <button onClick={() => setTab('mine')}
          className={cn('px-5 py-3 text-sm font-medium border-b-2 transition-all', tab === 'mine' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-white/40 hover:text-white/70')}>
          My Listings
        </button>
      </div>

      {tab === 'browse' && (
        <>
          <div className="relative mb-5">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search businesses or cities…" className="field-input pl-10 w-full max-w-md" />
          </div>

          <div className="flex gap-1 overflow-x-auto scrollbar-hide border-b border-white/[0.06] mb-6">
            {CATEGORIES.map(({ value, label }) => (
              <button key={value} onClick={() => setCategory(value)}
                className={cn('px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap flex-shrink-0',
                  category === value ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-white/40 hover:text-white/70')}>
                {label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{[1, 2, 3].map((i) => <div key={i} className="glass-card p-5 animate-pulse h-48" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="glass-card p-16 text-center">
              <Store className="w-12 h-12 text-white/10 mx-auto mb-4" />
              <p className="text-white/40 font-medium mb-2">No businesses in this category yet</p>
              <p className="text-white/25 text-sm mb-6">Run a Muslim-owned business?</p>
              <button onClick={() => setShowModal(true)} className="btn-brand text-sm px-6 py-2.5"><Plus className="w-3.5 h-3.5" /> Add Your Business</button>
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
                      {b.is_sponsored && <span className="text-xs text-amber-400 bg-amber-500/10 px-1.5 rounded">Featured</span>}
                    </div>
                    <span className="text-xs text-white/35">{catLabel[b.category] ?? b.category}</span>
                  </div>
                  {b.description && <p className="text-xs text-white/50 leading-relaxed line-clamp-2">{b.description}</p>}
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
                        <a href={b.website} target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 transition-colors truncate">{b.website.replace(/^https?:\/\//, '')}</a>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 pt-1 mt-1 border-t border-white/[0.05]">
                    <button onClick={() => toggleSave(b.id)} className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-white/55 hover:text-amber-400 transition-colors py-2 rounded-lg hover:bg-white/[0.04]">
                      <Bookmark className="w-3.5 h-3.5" /> Save
                    </button>
                    <button onClick={() => toast.info('Feedback coming soon')} className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-white/55 hover:text-amber-400 transition-colors py-2 rounded-lg hover:bg-white/[0.04]">
                      <MessageSquare className="w-3.5 h-3.5" /> Feedback
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'mine' && (
        <>
          {myLoading ? (
            <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="glass-card p-5 animate-pulse h-24" />)}</div>
          ) : myBusinesses.length === 0 ? (
            <div className="glass-card p-16 text-center">
              <Store className="w-12 h-12 text-white/10 mx-auto mb-4" />
              <p className="text-white/40 font-medium mb-2">No business listings yet</p>
              <p className="text-white/25 text-sm mb-6">Add your business to the Manchester directory.</p>
              <button onClick={() => setShowModal(true)} className="btn-brand text-sm px-5 py-2.5"><Plus className="w-4 h-4" /> Add Your First Business</button>
            </div>
          ) : (
            <div className="space-y-4">
              {myBusinesses.map((b) => (
                <div key={b.id} className="glass-card p-5 border border-white/[0.06]">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-semibold text-white">{b.name}</h3>
                        {b.is_verified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                        {b.is_sponsored && <span className="text-xs text-amber-400 bg-amber-500/10 px-1.5 rounded">Featured</span>}
                      </div>
                      <span className="text-xs text-white/35">{catLabel[b.category] ?? b.category}</span>
                    </div>
                    <span className={cn('flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border flex-shrink-0',
                      b.is_verified ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20')}>
                      {b.is_verified ? <><CheckCircle2 className="w-3 h-3" />Verified</> : 'Unverified'}
                    </span>
                  </div>
                  {b.description && <p className="text-xs text-white/45 mb-3 line-clamp-2">{b.description}</p>}
                  <div className="flex flex-wrap gap-3 text-xs text-white/40">
                    {b.city && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{b.city}</span>}
                    <span className="text-white/25">Added {formatDistanceToNow(new Date(b.created_at), { addSuffix: true })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Submit modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg glass-card border border-white/10 p-6 max-h-[90vh] overflow-y-auto scrollbar-hide">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">Add Business</h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg text-white/40 hover:text-white/70 transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Business Name *</label>
                <input value={form.name} onChange={(e) => set('name', e.target.value)} required className="field-input w-full" placeholder="e.g. Mughli Restaurant" />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Description</label>
                <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} className="field-input w-full resize-none" placeholder="What does your business do?" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">Category</label>
                  <select value={form.category} onChange={(e) => set('category', e.target.value)} className="field-input w-full bg-[#111] appearance-none">
                    {FORM_CATEGORIES.map((c) => <option key={c} value={c} className="bg-[#111]">{catLabel[c] ?? c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">City</label>
                  <input value={form.city} onChange={(e) => set('city', e.target.value)} className="field-input w-full" placeholder="e.g. Manchester" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Address</label>
                <input value={form.address} onChange={(e) => set('address', e.target.value)} className="field-input w-full" placeholder="Street address" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">Phone</label>
                  <input value={form.phone} onChange={(e) => set('phone', e.target.value)} className="field-input w-full" placeholder="0161…" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">Website</label>
                  <input type="url" value={form.website} onChange={(e) => set('website', e.target.value)} className="field-input w-full" placeholder="https://…" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-ghost flex-1">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-brand flex-1">{submitting ? 'Adding…' : 'Add Listing'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
