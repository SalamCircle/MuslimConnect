'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Report } from '@/lib/types';
import { AlertTriangle, CheckCircle, XCircle, Flag } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ReportWithReporter extends Report {
  reporter: { full_name: string } | null;
}

const statusTabs = ['pending', 'reviewed', 'actioned', 'dismissed', 'all'] as const;

export default function ModerateReports() {
  const [reports, setReports] = useState<ReportWithReporter[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<typeof statusTabs[number]>('pending');

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('reports')
      .select('*, reporter:reporter_id(full_name)')
      .order('created_at', { ascending: false })
      .limit(100);
    setReports((data as ReportWithReporter[]) || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function updateStatus(id: string, status: Report['status']) {
    const { error } = await supabase.from('reports').update({ status, reviewed_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error('Failed to update.'); return; }
    toast.success(`Report marked as ${status}.`);
    setReports((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
  }

  const filtered = tab === 'all' ? reports : reports.filter((r) => r.status === tab);

  const reasonLabels: Record<string, string> = {
    spam: 'Spam', harassment: 'Harassment', offensive: 'Offensive Content', misinformation: 'Misinformation', other: 'Other',
  };

  const statusColors: Record<string, string> = {
    pending:   'text-amber-400 bg-amber-500/10 border-amber-500/20',
    reviewed:  'text-blue-400 bg-blue-500/10 border-blue-500/20',
    actioned:  'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    dismissed: 'text-white/30 bg-white/5 border-white/10',
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Reports</h1>
        <p className="text-sm text-white/40 mt-1">{reports.filter((r) => r.status === 'pending').length} pending</p>
      </div>

      <div className="flex gap-1 mb-5 p-1 bg-white/[0.04] rounded-xl w-fit">
        {statusTabs.map((s) => (
          <button key={s} onClick={() => setTab(s)} className={cn('px-3 py-1.5 text-xs rounded-lg capitalize font-medium transition-all', tab === s ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70')}>
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="glass-card p-4 animate-pulse h-20" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <AlertTriangle className="w-8 h-8 text-white/10 mx-auto mb-3" />
          <p className="text-white/30 text-sm">No {tab === 'all' ? '' : tab} reports.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <div key={r.id} className="glass-card p-4 flex items-start gap-4">
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center flex-shrink-0">
                <Flag className="w-4 h-4 text-rose-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs font-medium text-white capitalize">{r.content_type} report</span>
                  <span className="text-[10px] text-white/40">{reasonLabels[r.reason] ?? r.reason}</span>
                  <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full border', statusColors[r.status] ?? statusColors.pending)}>{r.status}</span>
                </div>
                {r.notes && <p className="text-xs text-white/50 mb-1 line-clamp-2">{r.notes}</p>}
                <p className="text-xs text-white/25">
                  Reported by {r.reporter?.full_name ?? 'Unknown'} · {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                </p>
              </div>
              {r.status === 'pending' && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => updateStatus(r.id, 'actioned')} className="p-1.5 rounded-lg text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all" title="Action">
                    <CheckCircle className="w-4 h-4" />
                  </button>
                  <button onClick={() => updateStatus(r.id, 'reviewed')} className="p-1.5 rounded-lg text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 transition-all" title="Mark reviewed">
                    <Flag className="w-4 h-4" />
                  </button>
                  <button onClick={() => updateStatus(r.id, 'dismissed')} className="p-1.5 rounded-lg text-white/25 hover:text-white/60 hover:bg-white/6 transition-all" title="Dismiss">
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
