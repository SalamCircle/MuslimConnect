'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Job } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { CheckCircle, XCircle, Trash2, Search, Briefcase, MapPin, Star } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type StatusFilter = 'pending' | 'approved' | 'rejected' | 'all';

const tabs: { value: StatusFilter; label: string }[] = [
  { value: 'pending',  label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all',      label: 'All' },
];

const jobTypeLabel: Record<string, string> = {
  full_time: 'Full Time', part_time: 'Part Time', remote: 'Remote', contract: 'Contract', volunteer: 'Volunteer',
};

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    let q = supabase.from('jobs').select('*').order('created_at', { ascending: false }).limit(100);
    if (statusFilter !== 'all') q = q.eq('status', statusFilter);
    const { data } = await q;
    setJobs((data as Job[]) || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [statusFilter]);

  const filtered = search.trim()
    ? jobs.filter((j) => j.title.toLowerCase().includes(search.toLowerCase()) || j.employer.toLowerCase().includes(search.toLowerCase()))
    : jobs;

  async function setStatus(id: string, status: 'approved' | 'rejected') {
    const { error } = await supabase.from('jobs').update({ status, is_approved: status === 'approved' }).eq('id', id);
    if (error) { toast.error('Failed to update.'); return; }
    toast.success(status === 'approved' ? 'Job approved.' : 'Job rejected.');
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }

  async function toggleFeature(id: string, current: boolean) {
    const { error } = await supabase.from('jobs').update({ is_featured: !current }).eq('id', id);
    if (error) { toast.error('Failed.'); return; }
    toast.success(current ? 'Job unfeatured.' : 'Job featured!');
    setJobs((prev) => prev.map((j) => j.id === id ? { ...j, is_featured: !current } : j));
  }

  async function deleteJob(id: string) {
    const { error } = await supabase.from('jobs').delete().eq('id', id);
    if (error) { toast.error('Failed to delete.'); return; }
    toast.success('Job deleted.');
    setJobs((prev) => prev.filter((j) => j.id !== id));
    setConfirmDelete(null);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Jobs</h1>
          <p className="text-sm text-white/40 mt-1">Review and approve job listings submitted by users</p>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search jobs…" className="field-input pl-10 w-full max-w-sm" />
      </div>

      <div className="flex gap-1 border-b border-white/[0.06] mb-5">
        {tabs.map(({ value, label }) => (
          <button key={value} onClick={() => setStatusFilter(value)}
            className={cn('px-4 py-3 text-sm font-medium border-b-2 transition-all', statusFilter === value ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-white/40 hover:text-white/70')}
          >{label}</button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="glass-card p-4 animate-pulse h-24" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center"><p className="text-white/30">No jobs found.</p></div>
      ) : (
        <div className="space-y-3">
          {filtered.map((job) => (
            <div key={job.id} className={cn('glass-card p-4 border', job.status === 'rejected' ? 'border-rose-500/20 bg-rose-500/5 opacity-60' : job.status === 'approved' ? 'border-emerald-500/20' : 'border-amber-500/20 bg-amber-500/5')}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center flex-shrink-0">
                  <Briefcase className="w-4 h-4 text-rose-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-sm font-semibold text-white">{job.title}</h3>
                    <span className="text-xs text-white/50">{job.employer}</span>
                    <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full border', job.status === 'approved' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : job.status === 'rejected' ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20')}>{job.status}</span>
                    {job.is_featured && <span className="text-[10px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full">Featured</span>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-white/40 flex-wrap">
                    <span className="capitalize">{jobTypeLabel[job.job_type] ?? job.job_type}</span>
                    <span className="capitalize">{job.category.replace('_', ' ')}</span>
                    {job.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.city}</span>}
                    {job.salary_range && <span>{job.salary_range}</span>}
                    <span className="text-white/25">{formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {job.status === 'approved' && (
                    <button onClick={() => toggleFeature(job.id, job.is_featured)} className={cn('p-1.5 rounded-lg transition-all', job.is_featured ? 'text-amber-400 bg-amber-500/10' : 'text-white/25 hover:text-amber-400 hover:bg-amber-500/10')} title="Toggle feature">
                      <Star className="w-4 h-4" />
                    </button>
                  )}
                  {job.status !== 'approved' && (
                    <button onClick={() => setStatus(job.id, 'approved')} className="p-1.5 rounded-lg text-white/25 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all" title="Approve">
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  )}
                  {job.status !== 'rejected' && (
                    <button onClick={() => setStatus(job.id, 'rejected')} className="p-1.5 rounded-lg text-white/25 hover:text-orange-400 hover:bg-orange-500/10 transition-all" title="Reject">
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                  {confirmDelete === job.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => deleteJob(job.id)} className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded-lg hover:bg-rose-500/20 transition-all">Delete</button>
                      <button onClick={() => setConfirmDelete(null)} className="text-xs text-white/40 hover:text-white/70 px-1 py-1 rounded-lg transition-all">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDelete(job.id)} className="p-1.5 rounded-lg text-white/25 hover:text-rose-400 hover:bg-rose-500/10 transition-all" title="Delete">
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
