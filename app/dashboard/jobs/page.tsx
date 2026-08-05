'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';
import type { Job } from '@/lib/types';
import { Briefcase, Plus, MapPin, X, CheckCircle2, XCircle, AlertCircle, Search, Star, ExternalLink, Bookmark, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format, isPast } from 'date-fns';

const JOB_TYPES = [
  { value: 'all',       label: 'All Types' },
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'remote',    label: 'Remote' },
  { value: 'contract',  label: 'Contract' },
  { value: 'volunteer', label: 'Volunteer' },
];

const CATEGORIES = [
  { value: 'all',          label: 'All' },
  { value: 'technology',   label: 'Technology' },
  { value: 'finance',      label: 'Finance' },
  { value: 'education',    label: 'Education' },
  { value: 'healthcare',   label: 'Healthcare' },
  { value: 'charity',      label: 'Charity' },
  { value: 'hospitality',  label: 'Hospitality' },
  { value: 'creative',     label: 'Creative' },
  { value: 'construction', label: 'Construction' },
  { value: 'other',        label: 'Other' },
];

const FORM_CATEGORIES = ['technology','finance','education','healthcare','charity','retail','hospitality','construction','creative','other'];
const FORM_JOB_TYPES = ['full_time','part_time','remote','contract','volunteer'];

const jobTypeLabel: Record<string, string> = {
  full_time: 'Full Time', part_time: 'Part Time', remote: 'Remote', contract: 'Contract', volunteer: 'Volunteer',
};

const jobTypeColor: Record<string, string> = {
  full_time: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  part_time: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  remote:    'bg-violet-500/10 text-violet-400 border-violet-500/20',
  contract:  'bg-amber-500/10 text-amber-400 border-amber-500/20',
  volunteer: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

const catColor: Record<string, string> = {
  technology: 'text-violet-400', finance: 'text-emerald-400', education: 'text-cyan-400',
  healthcare: 'text-blue-400', charity: 'text-rose-400', hospitality: 'text-amber-400',
  creative: 'text-fuchsia-400', construction: 'text-orange-400', other: 'text-white/50',
};

const statusConfig = {
  pending:  { label: 'Pending Review', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', icon: AlertCircle },
  approved: { label: 'Approved',       color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle2 },
  rejected: { label: 'Rejected',       color: 'text-rose-400 bg-rose-500/10 border-rose-500/20', icon: XCircle },
};

const emptyForm = {
  title: '', employer: '', location: '', city: '', region: '',
  description: '', category: 'other', job_type: 'full_time', salary_range: '', apply_url: '',
  closing_date: '',
};

export default function DashboardJobsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'browse' | 'mine'>('browse');

  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [jobType, setJobType] = useState('all');
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [myLoading, setMyLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);

  async function loadBrowse() {
    setLoading(true);
    let q = supabase.from('jobs').select('*').eq('status', 'approved').order('is_featured', { ascending: false }).order('created_at', { ascending: false }).limit(40);
    if (jobType !== 'all') q = q.eq('job_type', jobType);
    if (category !== 'all') q = q.eq('category', category);
    const { data } = await q;
    setAllJobs((data as Job[]) || []);
    setLoading(false);
  }

  async function loadMine() {
    if (!user) return;
    setMyLoading(true);
    const { data } = await supabase.from('jobs').select('*').eq('posted_by', user.id).order('created_at', { ascending: false });
    setMyJobs((data as Job[]) || []);
    setMyLoading(false);
  }

  useEffect(() => { loadBrowse(); }, [jobType, category]);
  useEffect(() => { if (user) loadMine(); }, [user]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    const { error } = await supabase.from('jobs').insert({
      posted_by: user.id,
      title: form.title.trim(),
      employer: form.employer.trim(),
      location: form.location.trim() || null,
      city: form.city.trim() || null,
      region: form.region || null,
      description: form.description.trim() || null,
      category: form.category,
      job_type: form.job_type,
      salary_range: form.salary_range.trim() || null,
      apply_url: form.apply_url.trim() || null,
      closing_date: form.closing_date ? new Date(form.closing_date).toISOString() : null,
      status: 'pending',
      is_approved: false,
    });
    if (error) { toast.error('Failed to submit job.'); }
    else { toast.success('Job submitted for review!'); setShowModal(false); setForm({ ...emptyForm }); loadMine(); }
    setSubmitting(false);
  }

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));
  async function toggleSave(jobId: string) {
    if (!user) return;
    const { error } = await supabase.from('post_saves').insert({ post_id: jobId, user_id: user.id }).select();
    if (error && error.code === '23505') {
      toast.success('Already saved.');
    } else if (error) {
      toast.error('Could not save.');
    } else {
      toast.success('Job saved! Find it in Saved Posts.');
    }
  }

  const filtered = search.trim()
    ? allJobs.filter((j) =>
        j.title.toLowerCase().includes(search.toLowerCase()) ||
        j.employer.toLowerCase().includes(search.toLowerCase()) ||
        j.city?.toLowerCase().includes(search.toLowerCase()) ||
        j.location?.toLowerCase().includes(search.toLowerCase())
      )
    : allJobs;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Jobs</h1>
          <p className="text-sm text-white/40 mt-1">Browse Manchester jobs and volunteering, or post a role for review.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-brand text-sm px-4 py-2.5 self-start sm:self-auto whitespace-nowrap">
          <Plus className="w-4 h-4" /> Post a Job
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-white/[0.06] mb-6">
        <button onClick={() => setTab('browse')}
          className={cn('px-5 py-3 text-sm font-medium border-b-2 transition-all', tab === 'browse' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-white/40 hover:text-white/70')}>
          Browse Jobs
        </button>
        <button onClick={() => setTab('mine')}
          className={cn('px-5 py-3 text-sm font-medium border-b-2 transition-all', tab === 'mine' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-white/40 hover:text-white/70')}>
          My Submissions
        </button>
      </div>

      {tab === 'browse' && (
        <>
          <div className="relative mb-5">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search job title, employer or location…" className="field-input pl-10 w-full max-w-lg" />
          </div>

          <div className="flex gap-1 overflow-x-auto scrollbar-hide border-b border-white/[0.06] mb-5">
            {JOB_TYPES.map(({ value, label }) => (
              <button key={value} onClick={() => setJobType(value)}
                className={cn('px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap flex-shrink-0',
                  jobType === value ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-white/40 hover:text-white/70')}>
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5 mb-6">
            {CATEGORIES.map(({ value, label }) => (
              <button key={value} onClick={() => setCategory(value)}
                className={cn('px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                  category === value ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/8 hover:text-white/65')}>
                {label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="glass-card p-5 animate-pulse h-24" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="glass-card p-16 text-center">
              <Briefcase className="w-12 h-12 text-white/10 mx-auto mb-4" />
              <p className="text-white/40 font-medium mb-2">No jobs found</p>
              <p className="text-white/25 text-sm mb-6">Hiring in the community?</p>
              <button onClick={() => setShowModal(true)} className="btn-brand text-sm px-6 py-2.5"><Plus className="w-3.5 h-3.5" /> Post a Job</button>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((job) => (
                <div key={job.id} className={cn('glass-card p-5 flex flex-col sm:flex-row sm:items-start gap-4 relative', job.is_featured && 'border border-amber-500/20 bg-amber-500/5')}>
                  {job.is_featured && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-medium text-amber-400">
                      <Star className="w-3 h-3 fill-amber-400" /> Featured
                    </div>
                  )}
                  <div className="w-11 h-11 rounded-xl bg-black/30 flex items-center justify-center flex-shrink-0">
                    <Briefcase className={cn('w-5 h-5', catColor[job.category] ?? 'text-white/40')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap mb-1">
                      <div>
                        <h3 className="text-base font-semibold text-white leading-snug">{job.title}</h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <p className="text-sm text-white/55">{job.employer}</p>
                          {job.is_employer_verified && (
                            <span className="flex items-center gap-0.5 text-[10px] font-medium text-emerald-400">
                              <CheckCircle2 className="w-3 h-3" /> Verified
                            </span>
                          )}
                        </div>
                      </div>
                      {job.apply_url ? (
                        <a href={job.apply_url} target="_blank" rel="noopener noreferrer" className="btn-brand text-xs px-3 py-1.5 flex-shrink-0">
                          View job <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <button onClick={() => toast.info('Full job details coming soon')} className="btn-ghost text-xs px-3 py-1.5 flex-shrink-0">
                          View job
                        </button>
                      )}
                      <button onClick={() => toggleSave(job.id)} className="flex items-center justify-center gap-1 text-xs font-medium text-white/55 hover:text-emerald-400 transition-colors py-1.5 px-3 rounded-lg border border-white/[0.06] hover:bg-white/[0.04] flex-shrink-0" aria-label="Save job">
                        <Bookmark className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full border', jobTypeColor[job.job_type] ?? 'bg-white/5 text-white/40 border-white/10')}>
                        {jobTypeLabel[job.job_type] ?? job.job_type}
                      </span>
                      {(job.city || job.location) && (
                        <span className="flex items-center gap-1 text-xs text-white/40"><MapPin className="w-3 h-3" />{job.city ?? job.location}</span>
                      )}
                      {job.salary_range && <span className="text-xs text-white/40">{job.salary_range}</span>}
                    </div>
                    {job.description && <p className="text-xs text-white/45 mt-2.5 leading-relaxed line-clamp-2">{job.description}</p>}
                    <div className="flex flex-wrap items-center gap-3 mt-2.5 text-xs text-white/30">
                      <span>Posted {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}</span>
                      {job.closing_date && (
                        <span className={cn('flex items-center gap-1', isPast(new Date(job.closing_date)) ? 'text-rose-400/70' : 'text-amber-400/70')}>
                          <Clock className="w-3 h-3" />
                          {isPast(new Date(job.closing_date)) ? 'Closed' : `Closes ${format(new Date(job.closing_date), 'dd MMM yyyy')}`}
                        </span>
                      )}
                    </div>
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
          ) : myJobs.length === 0 ? (
            <div className="glass-card p-16 text-center">
              <Briefcase className="w-12 h-12 text-white/10 mx-auto mb-4" />
              <p className="text-white/40 font-medium mb-2">No jobs posted yet</p>
              <p className="text-white/25 text-sm mb-6">Submit a job listing — it will go live once approved by an admin.</p>
              <button onClick={() => setShowModal(true)} className="btn-brand text-sm px-5 py-2.5"><Plus className="w-4 h-4" /> Post Your First Job</button>
            </div>
          ) : (
            <div className="space-y-4">
              {myJobs.map((job) => {
                const sc = statusConfig[job.status as keyof typeof statusConfig] ?? statusConfig.pending;
                const Ico = sc.icon;
                return (
                  <div key={job.id} className="glass-card p-5 border border-white/[0.06]">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <h3 className="text-sm font-semibold text-white">{job.title}</h3>
                        <p className="text-xs text-white/50 mt-0.5">{job.employer}</p>
                      </div>
                      <span className={cn('flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border flex-shrink-0', sc.color)}>
                        <Ico className="w-3 h-3" />{sc.label}
                      </span>
                    </div>
                    {job.description && <p className="text-xs text-white/45 mb-3 line-clamp-2">{job.description}</p>}
                    <div className="flex flex-wrap gap-3 text-xs text-white/40">
                      <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">{jobTypeLabel[job.job_type]}</span>
                      {(job.city || job.location) && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{job.city ?? job.location}</span>}
                      {job.salary_range && <span>{job.salary_range}</span>}
                      {job.closing_date && (
                        <span className={cn('flex items-center gap-1', isPast(new Date(job.closing_date)) ? 'text-rose-400/70' : 'text-amber-400/70')}>
                          <Clock className="w-3 h-3" />
                          {isPast(new Date(job.closing_date)) ? 'Closed' : `Closes ${format(new Date(job.closing_date), 'dd MMM yyyy')}`}
                        </span>
                      )}
                      <span className="text-white/25">Submitted {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}</span>
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
              <h2 className="text-lg font-bold text-white">Post a Job</h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg text-white/40 hover:text-white/70 transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">Job Title *</label>
                  <input value={form.title} onChange={(e) => set('title', e.target.value)} required className="field-input w-full" placeholder="e.g. Software Developer" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">Employer *</label>
                  <input value={form.employer} onChange={(e) => set('employer', e.target.value)} required className="field-input w-full" placeholder="Company name" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Description</label>
                <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} className="field-input w-full resize-none" placeholder="Job details, requirements…" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">Category</label>
                  <select value={form.category} onChange={(e) => set('category', e.target.value)} className="field-input w-full bg-[#111] appearance-none">
                    {FORM_CATEGORIES.map((c) => <option key={c} value={c} className="bg-[#111]">{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">Job Type</label>
                  <select value={form.job_type} onChange={(e) => set('job_type', e.target.value)} className="field-input w-full bg-[#111] appearance-none">
                    {FORM_JOB_TYPES.map((t) => <option key={t} value={t} className="bg-[#111]">{jobTypeLabel[t]}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">City / Location</label>
                  <input value={form.city} onChange={(e) => set('city', e.target.value)} className="field-input w-full" placeholder="e.g. Manchester or Remote" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">Salary Range</label>
                  <input value={form.salary_range} onChange={(e) => set('salary_range', e.target.value)} className="field-input w-full" placeholder="e.g. £30,000 – £40,000" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Apply URL</label>
                <input type="url" value={form.apply_url} onChange={(e) => set('apply_url', e.target.value)} className="field-input w-full" placeholder="https://…" />
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
