'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Report } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle, CheckCircle, XCircle, Search, Flag } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type StatusFilter = 'pending' | 'reviewed' | 'dismissed' | 'actioned' | 'all';

const tabs: { value: StatusFilter; label: string }[] = [
  { value: 'pending',   label: 'Pending' },
  { value: 'actioned',  label: 'Actioned' },
  { value: 'dismissed', label: 'Dismissed' },
  { value: 'reviewed',  label: 'Reviewed' },
  { value: 'all',       label: 'All' },
];

const reasonColor: Record<string, string> = {
  spam:           'text-orange-400 bg-orange-500/10 border-orange-500/20',
  harassment:     'text-rose-400 bg-rose-500/10 border-rose-500/20',
  offensive:      'text-red-400 bg-red-500/10 border-red-500/20',
  misinformation: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  other:          'text-white/40 bg-white/5 border-white/10',
};

type ReportWithReporter = Report & { reporter?: { full_name: string } | null };

export default function AdminReportsPage() {
  const [reports, setReports] = useState<ReportWithReporter[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [search, setSearch] = useState('');

  async function load() {
    setLoading(true);
    let q = supabase
      .from('reports')
      .select('*, reporter:profiles!reports_reporter_id_fkey(full_name)')
      .order('created_at', { ascending: false })
      .limit(100);
    if (statusFilter !== 'all') q = q.eq('status', statusFilter);
    const { data } = await q;
    setReports((data as ReportWithReporter[]) || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [statusFilter]);

  const filtered = search.trim()
    ? reports.filter((r) => r.reason.includes(search.toLowerCase()) || r.content_type.includes(search.toLowerCase()) || (r.notes ?? '').toLowerCase().includes(search.toLowerCase()))
    : reports;

  async function setStatus(id: string, status: Report['status']) {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('reports').update({ status, reviewed_by: user?.id ?? null, reviewed_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error('Failed to update.'); return; }
    toast.success(`Report marked as ${status}.`);
    setReports((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Reports</h1>
          <p className="text-sm text-white/40 mt-1">User-submitted content reports</p>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by reason or type…" className="field-input pl-10 w-full max-w-sm" />
      </div>

      <div className="flex gap-1 border-b border-white/[0.06] mb-5 overflow-x-auto">
        {tabs.map(({ value, label }) => (
          <button key={value} onClick={() => setStatusFilter(value)}
            className={cn('px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap', statusFilter === value ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-white/40 hover:text-white/70')}
          >{label}</button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="glass-card p-4 animate-pulse h-20" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Flag className="w-8 h-8 text-white/15 mx-auto mb-3" />
          <p className="text-white/30">No reports found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((report) => (
            <div key={report.id} className={cn('glass-card p-4 border', report.status === 'pending' ? 'border-orange-500/20 bg-orange-500/5' : 'border-white/[0.06]')}>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-4 h-4 text-orange-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full border capitalize', reasonColor[report.reason] ?? reasonColor.other)}>{report.reason}</span>
                    <span className="text-xs text-white/50 capitalize">{report.content_type.replace('_', ' ')}</span>
                    <span className="text-xs text-white/25">ID: {report.content_id.substring(0, 8)}…</span>
                    <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full border', report.status === 'pending' ? 'text-orange-400 bg-orange-500/10 border-orange-500/20' : report.status === 'actioned' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-white/40 bg-white/5 border-white/10')}>{report.status}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-white/35">
                    <span>Reported by {(report.reporter as any)?.full_name ?? 'Unknown'}</span>
                    <span>{formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}</span>
                  </div>
                  {report.notes && <p className="text-xs text-white/50 mt-1.5 italic">"{report.notes}"</p>}
                </div>
                {report.status === 'pending' && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => setStatus(report.id, 'actioned')} className="p-1.5 rounded-lg text-white/25 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all" title="Mark as actioned">
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <button onClick={() => setStatus(report.id, 'reviewed')} className="p-1.5 rounded-lg text-white/25 hover:text-blue-400 hover:bg-blue-500/10 transition-all" title="Mark as reviewed">
                      <Flag className="w-4 h-4" />
                    </button>
                    <button onClick={() => setStatus(report.id, 'dismissed')} className="p-1.5 rounded-lg text-white/25 hover:text-rose-400 hover:bg-rose-500/10 transition-all" title="Dismiss">
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
