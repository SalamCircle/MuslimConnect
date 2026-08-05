'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';
import { useAuthPrompt } from '@/components/auth-prompt-modal';
import PublicNav from '@/components/navigation/public-nav';
import type { Job } from '@/lib/types';
import { Briefcase, MapPin, Search, Star, ExternalLink, Bookmark, Plus, CheckCircle2, Clock, SlidersHorizontal, X } from 'lucide-react';
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

const LOCATION_FILTERS = [
  { value: 'all',     label: 'Any location' },
  { value: 'remote',  label: 'Remote only' },
  { value: 'onsite',  label: 'On-site' },
  { value: 'hybrid',  label: 'Hybrid' },
];

const SORT_OPTIONS = [
  { value: 'recent',     label: 'Most recent' },
  { value: 'featured',   label: 'Featured first' },
  { value: 'closing',    label: 'Closing soon' },
];

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

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobType, setJobType] = useState('all');
  const [category, setCategory] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('');
  const [sort, setSort] = useState('recent');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const { user } = useAuth();
  const { prompt } = useAuthPrompt();

  useEffect(() => {
    async function load() {
      setLoading(true);
      let q = supabase
        .from('jobs')
        .select('*')
        .eq('status', 'approved')
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(60);
      if (jobType !== 'all') q = q.eq('job_type', jobType);
      if (category !== 'all') q = q.eq('category', category);
      const { data } = await q;
      setJobs((data as Job[]) || []);
      setLoading(false);
    }
    load();
  }, [jobType, category]);

  const filtered = useMemo(() => {
    let list = jobs;
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter((j) =>
        j.title.toLowerCase().includes(s) ||
        j.employer.toLowerCase().includes(s) ||
        j.city?.toLowerCase().includes(s) ||
        j.location?.toLowerCase().includes(s)
      );
    }
    if (cityFilter.trim()) {
      const c = cityFilter.toLowerCase();
      list = list.filter((j) => j.city?.toLowerCase().includes(c) || j.location?.toLowerCase().includes(c));
    }
    if (locationFilter !== 'all') {
      list = list.filter((j) => {
        const loc = (j.location ?? j.city ?? '').toLowerCase();
        if (locationFilter === 'remote') return loc.includes('remote') || j.job_type === 'remote';
        if (locationFilter === 'onsite') return !loc.includes('remote') && !loc.includes('hybrid');
        if (locationFilter === 'hybrid') return loc.includes('hybrid');
        return true;
      });
    }
    const sorted = [...list];
    if (sort === 'recent') {
      sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      sorted.sort((a, b) => Number(b.is_featured) - Number(a.is_featured));
    } else if (sort === 'featured') {
      sorted.sort((a, b) => Number(b.is_featured) - Number(a.is_featured));
    } else if (sort === 'closing') {
      sorted.sort((a, b) => {
        if (!a.closing_date && !b.closing_date) return 0;
        if (!a.closing_date) return 1;
        if (!b.closing_date) return -1;
        return new Date(a.closing_date).getTime() - new Date(b.closing_date).getTime();
      });
    }
    return sorted;
  }, [jobs, search, cityFilter, locationFilter, sort]);

  const activeFilterCount = (category !== 'all' ? 1 : 0) + (locationFilter !== 'all' ? 1 : 0) + (cityFilter.trim() ? 1 : 0);

  function clearFilters() {
    setCategory('all'); setLocationFilter('all'); setCityFilter('');
  }

  return (
    <div className="min-h-screen bg-[#050505]">
      <PublicNav />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-[76px] py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Jobs and Opportunities</h1>
            <p className="text-white/45 mt-1.5">Find jobs from inclusive employers, Muslim-led organisations and community partners across the UK.</p>
          </div>
          <Link href="/auth/signup" className="btn-brand text-sm px-5 py-2.5 self-start sm:self-auto">
            <Plus className="w-3.5 h-3.5" /> Post a job
          </Link>
        </div>
        <p className="text-xs text-white/35 -mt-4 mb-6">Browsing is public. Sign in to save jobs, apply through ConnectMuslim or post a vacancy.</p>

        {/* Search */}
        <div className="relative mb-5">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search job title, employer or location…"
            className="field-input pl-10 w-full max-w-lg"
          />
        </div>

        {/* Type tabs */}
        <div className="flex gap-1 overflow-x-auto scrollbar-hide border-b border-white/[0.06] mb-4">
          {JOB_TYPES.map(({ value, label }) => (
            <button key={value} onClick={() => setJobType(value)}
              className={cn(
                'px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap flex-shrink-0',
                jobType === value ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-white/40 hover:text-white/70'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Mobile filter trigger + active chips */}
        <div className="flex items-center gap-2 mb-4 lg:hidden">
          <button onClick={() => setShowFilters(true)}
            className="flex items-center gap-1.5 text-sm px-3.5 py-2 rounded-lg border border-white/10 text-white/70 bg-white/[0.03]">
            <SlidersHorizontal className="w-4 h-4" /> Filter jobs
            {activeFilterCount > 0 && <span className="ml-1 text-[10px] bg-emerald-500/20 text-emerald-400 rounded-full px-1.5 py-0.5">{activeFilterCount}</span>}
          </button>
          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="text-xs text-white/40 hover:text-white/70 flex items-center gap-1">
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>

        {/* Desktop category + location filters */}
        <div className="hidden lg:flex flex-wrap gap-1.5 mb-5">
          {CATEGORIES.map(({ value, label }) => (
            <button key={value} onClick={() => setCategory(value)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                category === value
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/8 hover:text-white/65'
              )}
            >
              {label}
            </button>
          ))}
          <span className="w-px h-5 bg-white/10 mx-1 self-center" />
          <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}
            className="px-3 py-1.5 rounded-full text-xs font-medium border border-white/10 bg-white/5 text-white/70 appearance-none cursor-pointer">
            {LOCATION_FILTERS.map((l) => <option key={l.value} value={l.value} className="bg-[#111]">{l.label}</option>)}
          </select>
          <input value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} placeholder="City or postcode…"
            className="px-3 py-1.5 rounded-full text-xs border border-white/10 bg-white/5 text-white/70 w-44" />
        </div>

        {/* Result count + sort */}
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm text-white/50">
            {loading ? 'Loading…' : <>{filtered.length} job{filtered.length !== 1 ? 's' : ''} found</>}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/35">Sort</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 text-white/70 appearance-none cursor-pointer">
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value} className="bg-[#111]">{o.label}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card p-5 animate-pulse">
                <div className="h-4 bg-white/10 rounded w-1/3 mb-3" />
                <div className="h-3 bg-white/10 rounded w-1/4 mb-2" />
                <div className="h-3 bg-white/10 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card p-16 text-center">
            <Briefcase className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <p className="text-white/40 font-medium mb-2">No jobs found</p>
            <p className="text-white/25 text-sm mb-6">We&apos;re adding jobs regularly. Hiring in the community?</p>
            <Link href="/auth/signup" className="btn-ghost text-sm px-6 py-2.5">
              <Plus className="w-3.5 h-3.5" /> Post a job
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((job) => {
              const closed = job.closing_date && isPast(new Date(job.closing_date));
              return (
                <div key={job.id} className={cn('glass-card p-5 flex flex-col sm:flex-row sm:items-start gap-4', job.is_featured && 'border border-amber-500/20 bg-amber-500/5')}>
                  <div className="w-11 h-11 rounded-xl bg-black/30 flex items-center justify-center flex-shrink-0">
                    <Briefcase className={cn('w-5 h-5', catColor[job.category] ?? 'text-white/40')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    {job.is_featured && (
                      <div className="flex items-center gap-1 text-[10px] font-medium text-amber-400 mb-1.5">
                        <Star className="w-3 h-3 fill-amber-400" /> Featured
                      </div>
                    )}
                    <h3 className="text-base font-semibold text-white leading-snug">{job.title}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-sm text-white/55">{job.employer}</p>
                      {job.is_employer_verified && (
                        <span className="flex items-center gap-0.5 text-[10px] font-medium text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" /> Verified employer
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full border', jobTypeColor[job.job_type] ?? 'bg-white/5 text-white/40 border-white/10')}>
                        {jobTypeLabel[job.job_type] ?? job.job_type}
                      </span>
                      {(job.city || job.location) && (
                        <span className="flex items-center gap-1 text-xs text-white/40">
                          <MapPin className="w-3 h-3" />{job.city ?? job.location}
                        </span>
                      )}
                      {job.salary_range && <span className="text-xs text-white/40">{job.salary_range}</span>}
                    </div>
                    {job.description && (
                      <p className="text-xs text-white/45 mt-2.5 leading-relaxed line-clamp-2">{job.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2.5 text-xs text-white/30">
                      <span>Posted {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}</span>
                      {job.closing_date && (
                        <span className={cn('flex items-center gap-1', closed ? 'text-rose-400/70' : 'text-amber-400/70')}>
                          <Clock className="w-3 h-3" />
                          {closed ? 'Closed' : `Closes ${format(new Date(job.closing_date), 'dd MMM yyyy')}`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex sm:flex-col items-center gap-2 sm:items-end flex-shrink-0">
                    {job.apply_url ? (
                      <a href={job.apply_url} target="_blank" rel="noopener noreferrer" className="btn-brand text-xs px-3 py-1.5 w-full sm:w-auto">
                        View job <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <button onClick={() => !user && prompt('save')} className="btn-ghost text-xs px-3 py-1.5 w-full sm:w-auto">
                        View job
                      </button>
                    )}
                    <button
                      onClick={() => !user && prompt('save')}
                      className="flex items-center justify-center gap-1 text-xs font-medium text-white/55 hover:text-emerald-400 transition-colors py-1.5 px-3 rounded-lg border border-white/[0.06] hover:bg-white/[0.04]"
                      aria-label="Save job"
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Post CTA */}
        {!loading && filtered.length > 0 && (
          <div className="mt-10 glass-card p-6 text-center border border-white/[0.06]">
            <h3 className="text-base font-semibold text-white mb-1">Hiring?</h3>
            <p className="text-sm text-white/45 mb-4">Post a job and reach the Manchester Muslim community.</p>
            <Link href="/auth/signup" className="btn-brand text-sm px-6 py-2.5">
              <Plus className="w-3.5 h-3.5" /> Post a Job Free
            </Link>
          </div>
        )}
      </div>

      {/* Mobile filter drawer */}
      {showFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowFilters(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-80 max-w-[85vw] glass-card border-l border-white/10 p-5 overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-white">Filter jobs</h2>
              <button onClick={() => setShowFilters(false)} className="p-2 rounded-lg text-white/40 hover:text-white/70"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-5">
              <div>
                <p className="text-xs font-medium text-white/50 mb-2">Industry</p>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map(({ value, label }) => (
                    <button key={value} onClick={() => setCategory(value)}
                      className={cn('px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                        category === value ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-white/5 text-white/40 border-white/10')}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-white/50 mb-2">Workplace</p>
                <div className="flex flex-col gap-1.5">
                  {LOCATION_FILTERS.map((l) => (
                    <button key={l.value} onClick={() => setLocationFilter(l.value)}
                      className={cn('text-left text-sm px-3 py-2 rounded-lg border transition-all',
                        locationFilter === l.value ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'text-white/60 border-white/10 hover:bg-white/5')}>
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-white/50 mb-2">City or postcode</p>
                <input value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} placeholder="e.g. Manchester"
                  className="field-input w-full" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={clearFilters} className="btn-ghost flex-1">Clear all</button>
                <button onClick={() => setShowFilters(false)} className="btn-brand flex-1">Show {filtered.length} jobs</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
