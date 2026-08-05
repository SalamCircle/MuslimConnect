'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';
import type { Event } from '@/lib/types';
import { formatDistanceToNow, format } from 'date-fns';
import { Calendar, Plus, Clock, MapPin, Wifi, X, CheckCircle2, XCircle, AlertCircle, Search, Star, Bookmark, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const MANCHESTER_AREAS = [
  'All Manchester', 'Manchester', 'Salford', 'Oldham', 'Bolton', 'Bury',
  'Rochdale', 'Stockport', 'Ashton-under-Lyne', 'Trafford', 'Tameside',
];

const CATEGORIES = ['mosque_event','conference','youth_program','charity_event','networking','social','religious','education','general','other'];

const CAT_FILTERS = [
  { value: 'all', label: 'All Events' },
  { value: 'networking', label: 'Networking' },
  { value: 'religious', label: 'Religious' },
  { value: 'education', label: 'Education' },
  { value: 'social', label: 'Social' },
  { value: 'conference', label: 'Conference' },
  { value: 'charity_event', label: 'Charity' },
  { value: 'youth_program', label: 'Youth' },
];

const catColor: Record<string, string> = {
  networking: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  religious: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  education: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  social: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  conference: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  charity_event: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  youth_program: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  general: 'text-white/50 bg-white/5 border-white/10',
  other: 'text-white/50 bg-white/5 border-white/10',
};

const statusConfig = {
  pending:  { label: 'Pending Review', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', icon: AlertCircle },
  approved: { label: 'Approved',       color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle2 },
  rejected: { label: 'Rejected',       color: 'text-rose-400 bg-rose-500/10 border-rose-500/20', icon: XCircle },
};

const emptyForm = {
  title: '', description: '', category: 'general', venue_name: '', city: '', region: 'North West',
  start_datetime: '', end_datetime: '', is_online: false,
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

export default function DashboardEventsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'browse' | 'mine'>('browse');

  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [myEvents, setMyEvents] = useState<Event[]>([]);
  const [category, setCategory] = useState('all');
  const [area, setArea] = useState('All Manchester');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [myLoading, setMyLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);

  async function loadBrowse() {
    setLoading(true);
    let q = supabase
      .from('events')
      .select('*')
      .eq('status', 'approved')
      .gte('start_datetime', new Date().toISOString())
      .order('is_featured', { ascending: false })
      .order('start_datetime', { ascending: true })
      .limit(40);
    if (category !== 'all') q = q.eq('category', category);
    if (area !== 'All Manchester') q = q.eq('city', area);
    const { data } = await q;
    setAllEvents((data as Event[]) || []);
    setLoading(false);
  }

  async function loadMine() {
    if (!user) return;
    setMyLoading(true);
    const { data } = await supabase.from('events').select('*').eq('creator_id', user.id).order('created_at', { ascending: false });
    setMyEvents((data as Event[]) || []);
    setMyLoading(false);
  }

  useEffect(() => { loadBrowse(); }, [category, area]);
  useEffect(() => { if (user) loadMine(); }, [user]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    const { error } = await supabase.from('events').insert({
      creator_id: user.id,
      title: form.title.trim(),
      description: form.description.trim() || null,
      category: form.category,
      venue_name: form.venue_name.trim() || null,
      city: form.city.trim() || null,
      region: form.region || null,
      start_datetime: form.start_datetime,
      end_datetime: form.end_datetime || null,
      is_online: form.is_online,
      status: 'pending',
      is_approved: false,
    });
    if (error) { toast.error('Failed to submit event.'); }
    else { toast.success('Event submitted for review!'); setShowModal(false); setForm({ ...emptyForm }); loadMine(); }
    setSubmitting(false);
  }

  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  async function toggleSave(eventId: string) {
    if (!user) return;
    const { error } = await supabase.from('post_saves').insert({ post_id: eventId, user_id: user.id }).select();
    if (error && error.code === '23505') {
      toast.success('Already saved.');
    } else if (error) {
      toast.error('Could not save.');
    } else {
      toast.success('Event saved! Find it in Saved Posts.');
    }
  }

  const filtered = search.trim()
    ? allEvents.filter((e) =>
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.city?.toLowerCase().includes(search.toLowerCase()) ||
        e.venue_name?.toLowerCase().includes(search.toLowerCase())
      )
    : allEvents;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Events</h1>
          <p className="text-sm text-white/40 mt-1">Browse and interact with Manchester events, or submit your own for review.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-brand text-sm px-4 py-2.5 self-start sm:self-auto whitespace-nowrap">
          <Plus className="w-4 h-4" /> Submit Event
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-white/[0.06] mb-6">
        <button onClick={() => setTab('browse')}
          className={cn('px-5 py-3 text-sm font-medium border-b-2 transition-all', tab === 'browse' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-white/40 hover:text-white/70')}>
          Browse Events
        </button>
        <button onClick={() => setTab('mine')}
          className={cn('px-5 py-3 text-sm font-medium border-b-2 transition-all', tab === 'mine' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-white/40 hover:text-white/70')}>
          My Submissions
        </button>
      </div>

      {tab === 'browse' && (
        <>
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search events, venues or cities…" className="field-input pl-10 w-full" />
            </div>
            <select value={area} onChange={(e) => setArea(e.target.value)} className="field-input appearance-none cursor-pointer w-full sm:w-56 bg-[#111]">
              {MANCHESTER_AREAS.map((r) => <option key={r} value={r} className="bg-[#111]">{r}</option>)}
            </select>
          </div>

          <div className="flex gap-1 overflow-x-auto scrollbar-hide border-b border-white/[0.06] mb-6">
            {CAT_FILTERS.map(({ value, label }) => (
              <button key={value} onClick={() => setCategory(value)}
                className={cn('px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap flex-shrink-0',
                  category === value ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-white/40 hover:text-white/70')}>
                {label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="glass-card p-5 animate-pulse h-48" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="glass-card p-16 text-center">
              <Calendar className="w-12 h-12 text-white/10 mx-auto mb-4" />
              <p className="text-white/40 font-medium mb-2">No events listed in this area yet</p>
              <p className="text-white/25 text-sm mb-6">Know of one we should include?</p>
              <button onClick={() => setShowModal(true)} className="btn-brand text-sm px-6 py-2.5"><Plus className="w-3.5 h-3.5" /> Submit an Event</button>
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
                      {event.description && <p className="text-xs text-white/45 leading-relaxed mb-3 line-clamp-2">{event.description}</p>}
                      <div className="space-y-1.5 mt-auto">
                        <div className="flex items-center gap-1.5 text-xs text-white/50">
                          <Clock className="w-3.5 h-3.5 text-emerald-400/60 flex-shrink-0" />
                          <span>{formatEventDate(event.start_datetime, event.end_datetime ?? null)}</span>
                        </div>
                        {(event.venue_name || event.city) && (
                          <div className="flex items-center gap-1.5 text-xs text-white/50">
                            {event.is_online ? <Wifi className="w-3.5 h-3.5 text-cyan-400/60 flex-shrink-0" /> : <MapPin className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />}
                            <span className="truncate">{event.is_online ? 'Online' : [event.venue_name, event.city].filter(Boolean).join(', ')}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 mt-4">
                        <button onClick={() => toggleSave(event.id)} className="flex items-center justify-center gap-1 text-xs font-medium text-white/55 hover:text-emerald-400 transition-colors py-2 px-3 rounded-lg border border-white/[0.06] hover:bg-white/[0.04]">
                          <Bookmark className="w-3.5 h-3.5" /> Save
                        </button>
                        <button onClick={() => toast.info('Event details coming soon')} className="btn-ghost text-xs py-2 flex-1 flex items-center justify-center gap-1">
                          View Details <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === 'mine' && (
        <>
          {myLoading ? (
            <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="glass-card p-5 animate-pulse h-24" />)}</div>
          ) : myEvents.length === 0 ? (
            <div className="glass-card p-16 text-center">
              <Calendar className="w-12 h-12 text-white/10 mx-auto mb-4" />
              <p className="text-white/40 font-medium mb-2">No events submitted yet</p>
              <p className="text-white/25 text-sm mb-6">Submit an event for the community — it will go live once approved by an admin.</p>
              <button onClick={() => setShowModal(true)} className="btn-brand text-sm px-5 py-2.5"><Plus className="w-4 h-4" /> Submit Your First Event</button>
            </div>
          ) : (
            <div className="space-y-4">
              {myEvents.map((ev) => {
                const sc = statusConfig[ev.status as keyof typeof statusConfig] ?? statusConfig.pending;
                const Ico = sc.icon;
                return (
                  <div key={ev.id} className="glass-card p-5 border border-white/[0.06]">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="text-sm font-semibold text-white">{ev.title}</h3>
                      <span className={cn('flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border flex-shrink-0', sc.color)}>
                        <Ico className="w-3 h-3" />{sc.label}
                      </span>
                    </div>
                    {ev.description && <p className="text-xs text-white/50 mb-3 line-clamp-2">{ev.description}</p>}
                    <div className="flex flex-wrap gap-3 text-xs text-white/40">
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-violet-400/60" />{format(new Date(ev.start_datetime), 'dd MMM yyyy')}</span>
                      {(ev.venue_name || ev.city) && (
                        <span className="flex items-center gap-1">
                          {ev.is_online ? <Wifi className="w-3.5 h-3.5 text-cyan-400/60" /> : <MapPin className="w-3.5 h-3.5" />}
                          {ev.is_online ? 'Online' : [ev.venue_name, ev.city].filter(Boolean).join(', ')}
                        </span>
                      )}
                      <span className="text-white/25">Submitted {formatDistanceToNow(new Date(ev.created_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Submit modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg glass-card border border-white/10 p-6 max-h-[90vh] overflow-y-auto scrollbar-hide">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">Submit Event</h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg text-white/40 hover:text-white/70 transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Title *</label>
                <input value={form.title} onChange={(e) => set('title', e.target.value)} required className="field-input w-full" placeholder="Event title" />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Description</label>
                <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} className="field-input w-full resize-none" placeholder="What's the event about?" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">Category</label>
                  <select value={form.category} onChange={(e) => set('category', e.target.value)} className="field-input w-full bg-[#111] appearance-none">
                    {CATEGORIES.map((c) => <option key={c} value={c} className="bg-[#111]">{c.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">Region</label>
                  <select value={form.region} onChange={(e) => set('region', e.target.value)} className="field-input w-full bg-[#111] appearance-none">
                    <option value="" className="bg-[#111]">Select region</option>
                    <option value="North West" className="bg-[#111]">North West</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="is_online" checked={form.is_online} onChange={(e) => set('is_online', e.target.checked)} className="accent-emerald-500" />
                <label htmlFor="is_online" className="text-sm text-white/70 cursor-pointer">This is an online event</label>
              </div>
              {!form.is_online && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1.5">Venue Name</label>
                    <input value={form.venue_name} onChange={(e) => set('venue_name', e.target.value)} className="field-input w-full" placeholder="e.g. Manchester Central Mosque" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1.5">City</label>
                    <input value={form.city} onChange={(e) => set('city', e.target.value)} className="field-input w-full" placeholder="e.g. Manchester" />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">Start Date & Time *</label>
                  <input type="datetime-local" value={form.start_datetime} onChange={(e) => set('start_datetime', e.target.value)} required className="field-input w-full" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">End Date & Time</label>
                  <input type="datetime-local" value={form.end_datetime} onChange={(e) => set('end_datetime', e.target.value)} className="field-input w-full" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-ghost flex-1">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-brand flex-1">{submitting ? 'Submitting…' : 'Submit for Review'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
