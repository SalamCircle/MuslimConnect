'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Event } from '@/lib/types';
import { formatDistanceToNow, format } from 'date-fns';
import { CheckCircle, XCircle, Trash2, Search, Calendar, MapPin, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type StatusFilter = 'pending' | 'approved' | 'rejected' | 'all';

const tabs: { value: StatusFilter; label: string }[] = [
  { value: 'pending',  label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all',      label: 'All' },
];

export default function AdminEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    let q = supabase.from('events').select('*').order('created_at', { ascending: false }).limit(100);
    if (statusFilter !== 'all') q = q.eq('status', statusFilter);
    const { data } = await q;
    setEvents((data as Event[]) || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [statusFilter]);

  const filtered = search.trim()
    ? events.filter((e) => e.title.toLowerCase().includes(search.toLowerCase()) || (e.city ?? '').toLowerCase().includes(search.toLowerCase()))
    : events;

  async function setStatus(id: string, status: 'approved' | 'rejected') {
    const { error } = await supabase.from('events').update({ status, is_approved: status === 'approved' }).eq('id', id);
    if (error) { toast.error('Failed to update.'); return; }
    toast.success(status === 'approved' ? 'Event approved.' : 'Event rejected.');
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }

  async function deleteEvent(id: string) {
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) { toast.error('Failed to delete.'); return; }
    toast.success('Event deleted.');
    setEvents((prev) => prev.filter((e) => e.id !== id));
    setConfirmDelete(null);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Events</h1>
          <p className="text-sm text-white/40 mt-1">Review and approve community event submissions</p>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search events…" className="field-input pl-10 w-full max-w-sm" />
      </div>

      <div className="flex gap-1 border-b border-white/[0.06] mb-5">
        {tabs.map(({ value, label }) => (
          <button key={value} onClick={() => setStatusFilter(value)}
            className={cn('px-4 py-3 text-sm font-medium border-b-2 transition-all', statusFilter === value ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-white/40 hover:text-white/70')}
          >{label}</button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="glass-card p-4 animate-pulse h-28" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center"><p className="text-white/30">No events found.</p></div>
      ) : (
        <div className="space-y-3">
          {filtered.map((event) => (
            <div key={event.id} className={cn('glass-card p-4 border', event.status === 'rejected' ? 'border-rose-500/20 bg-rose-500/5 opacity-60' : event.status === 'approved' ? 'border-emerald-500/20' : 'border-amber-500/20 bg-amber-500/5')}>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-sm font-semibold text-white">{event.title}</h3>
                    <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full border', event.status === 'approved' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : event.status === 'rejected' ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20')}>{event.status}</span>
                    <span className="text-[10px] text-white/30 capitalize">{event.category.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-white/45 flex-wrap">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(event.start_datetime), 'dd MMM yyyy, HH:mm')}</span>
                    {event.is_online ? (
                      <span className="flex items-center gap-1"><Globe className="w-3 h-3" />Online</span>
                    ) : (event.city || event.region) && (
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{[event.venue_name, event.city].filter(Boolean).join(', ')}</span>
                    )}
                    <span className="text-white/25">{formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}</span>
                  </div>
                  {event.description && <p className="text-xs text-white/40 mt-1.5 line-clamp-2">{event.description}</p>}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {event.status !== 'approved' && (
                    <button onClick={() => setStatus(event.id, 'approved')} className="p-1.5 rounded-lg text-white/25 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all" title="Approve">
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  )}
                  {event.status !== 'rejected' && (
                    <button onClick={() => setStatus(event.id, 'rejected')} className="p-1.5 rounded-lg text-white/25 hover:text-orange-400 hover:bg-orange-500/10 transition-all" title="Reject">
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                  {confirmDelete === event.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => deleteEvent(event.id)} className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded-lg hover:bg-rose-500/20 transition-all">Delete</button>
                      <button onClick={() => setConfirmDelete(null)} className="text-xs text-white/40 hover:text-white/70 px-1 py-1 rounded-lg transition-all">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDelete(event.id)} className="p-1.5 rounded-lg text-white/25 hover:text-rose-400 hover:bg-rose-500/10 transition-all" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
