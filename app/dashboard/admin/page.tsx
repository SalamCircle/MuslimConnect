'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { Users, MessageSquare, Users2, Calendar, Briefcase, Store, Image, AlertTriangle, Clock, ArrowRight, MapPin, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const UK_REGIONS = [
  'East Midlands','East of England','London','North East','North West',
  'Northern Ireland','Scotland','South East','South West','Wales','West Midlands','Yorkshire and The Humber',
];

interface Stats {
  users: number;
  posts: number;
  groups: number;
  pending_events: number;
  pending_jobs: number;
  businesses: number;
  active_ads: number;
  reports: number;
}

interface RecentPost {
  id: string;
  content: string;
  created_at: string;
  city: string | null;
  region: string | null;
  profiles: { full_name: string; city: string | null; region: string | null } | null;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats>({ users: 0, posts: 0, groups: 0, pending_events: 0, pending_jobs: 0, businesses: 0, active_ads: 0, reports: 0 });
  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [regionFilter, setRegionFilter] = useState('');
  const [showRegionMenu, setShowRegionMenu] = useState(false);

  useEffect(() => {
    async function load() {
      let postsQ = supabase
        .from('posts')
        .select('id, content, created_at, city, region, profiles!posts_user_id_fkey!left(full_name, city, region)')
        .order('created_at', { ascending: false })
        .limit(10);
      if (regionFilter) postsQ = postsQ.eq('region', regionFilter);

      const [users, posts, groups, pendingEvents, pendingJobs, businesses, activeAds, reports, recent] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('posts').select('id', { count: 'exact', head: true }),
        supabase.from('communities').select('id', { count: 'exact', head: true }),
        supabase.from('events').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('businesses').select('id', { count: 'exact', head: true }),
        supabase.from('advertisements').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        postsQ,
      ]);
      setStats({
        users: users.count ?? 0,
        posts: posts.count ?? 0,
        groups: groups.count ?? 0,
        pending_events: pendingEvents.count ?? 0,
        pending_jobs: pendingJobs.count ?? 0,
        businesses: businesses.count ?? 0,
        active_ads: activeAds.count ?? 0,
        reports: reports.count ?? 0,
      });
      setRecentPosts((recent.data || []) as unknown as RecentPost[]);
      setLoading(false);
    }
    load();
  }, [regionFilter]);

  const statCards = [
    { label: 'Total Users',      value: stats.users,          icon: Users,         color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20',       href: '/dashboard/admin/users' },
    { label: 'Community Posts',  value: stats.posts,          icon: MessageSquare, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', href: '/dashboard/admin/posts' },
    { label: 'Groups',           value: stats.groups,         icon: Users2,        color: 'text-cyan-400',    bg: 'bg-cyan-500/10 border-cyan-500/20',       href: '/dashboard/admin/groups' },
    { label: 'Pending Events',   value: stats.pending_events, icon: Calendar,      color: 'text-violet-400',  bg: 'bg-violet-500/10 border-violet-500/20',   href: '/dashboard/admin/events' },
    { label: 'Pending Jobs',     value: stats.pending_jobs,   icon: Briefcase,     color: 'text-rose-400',    bg: 'bg-rose-500/10 border-rose-500/20',       href: '/dashboard/admin/jobs' },
    { label: 'Businesses',       value: stats.businesses,     icon: Store,         color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20',     href: '/dashboard/admin/businesses' },
    { label: 'Active Ads',       value: stats.active_ads,     icon: Image,         color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10 border-fuchsia-500/20', href: '/dashboard/admin/ads' },
    { label: 'Pending Reports',  value: stats.reports,        icon: AlertTriangle, color: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/20',   href: '/dashboard/admin/reports' },
  ];

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Overview</h1>
          <p className="text-sm text-white/40 mt-1">ConnectMuslim platform statistics and recent activity</p>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowRegionMenu((v) => !v)}
            className="flex items-center gap-2 text-sm bg-white/6 border border-white/10 rounded-xl px-3 py-2 text-white/70 hover:text-white hover:bg-white/10 transition-all"
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            {regionFilter || 'All Regions'}
            <ChevronDown className="w-3.5 h-3.5 text-white/30" />
          </button>
          {showRegionMenu && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-[#111] border border-white/[0.08] rounded-xl shadow-xl z-50 overflow-hidden max-h-72 overflow-y-auto">
              <button
                onClick={() => { setRegionFilter(''); setShowRegionMenu(false); }}
                className={cn('w-full text-left px-3 py-2.5 text-sm transition-colors', !regionFilter ? 'text-emerald-400 bg-emerald-500/10' : 'text-white/70 hover:text-white hover:bg-white/6')}
              >
                All Regions
              </button>
              {UK_REGIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => { setRegionFilter(r); setShowRegionMenu(false); }}
                  className={cn('w-full text-left px-3 py-2.5 text-sm transition-colors', regionFilter === r ? 'text-emerald-400 bg-emerald-500/10' : 'text-white/70 hover:text-white hover:bg-white/6')}
                >
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, color, bg, href }) => (
          <Link key={label} href={href}>
            <div className={`glass-card border p-5 hover:scale-[1.02] transition-all ${bg}`}>
              <div className="flex items-center justify-between mb-3">
                <Icon className={`w-5 h-5 ${color}`} />
                {(label.includes('Pending') || label.includes('Reports')) && value > 0 && (
                  <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full">!</span>
                )}
              </div>
              <div className={`text-2xl font-bold ${loading ? 'text-white/20' : 'text-white'}`}>
                {loading ? '—' : value.toLocaleString()}
              </div>
              <p className="text-xs text-white/40 mt-1">{label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Pending items alert */}
      {(stats.pending_events > 0 || stats.pending_jobs > 0 || stats.reports > 0) && (
        <div className="glass-card border border-amber-500/20 bg-amber-500/5 p-5 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-amber-400">Requires Attention</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            {stats.pending_events > 0 && (
              <Link href="/dashboard/admin/events" className="flex items-center gap-2 text-xs text-white/70 bg-white/5 border border-white/10 rounded-lg px-3 py-2 hover:bg-white/10 transition-all">
                <Calendar className="w-3.5 h-3.5 text-violet-400" />
                {stats.pending_events} event{stats.pending_events !== 1 ? 's' : ''} pending review
                <ArrowRight className="w-3 h-3 text-white/30" />
              </Link>
            )}
            {stats.pending_jobs > 0 && (
              <Link href="/dashboard/admin/jobs" className="flex items-center gap-2 text-xs text-white/70 bg-white/5 border border-white/10 rounded-lg px-3 py-2 hover:bg-white/10 transition-all">
                <Briefcase className="w-3.5 h-3.5 text-rose-400" />
                {stats.pending_jobs} job{stats.pending_jobs !== 1 ? 's' : ''} pending review
                <ArrowRight className="w-3 h-3 text-white/30" />
              </Link>
            )}
            {stats.reports > 0 && (
              <Link href="/dashboard/admin/reports" className="flex items-center gap-2 text-xs text-white/70 bg-white/5 border border-white/10 rounded-lg px-3 py-2 hover:bg-white/10 transition-all">
                <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
                {stats.reports} report{stats.reports !== 1 ? 's' : ''} pending
                <ArrowRight className="w-3 h-3 text-white/30" />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Recent activity */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">
              Recent Posts{regionFilter ? ` — ${regionFilter}` : ''}
            </h3>
          </div>
          {regionFilter && (
            <button onClick={() => setRegionFilter('')} className="text-xs text-white/30 hover:text-white/60 transition-colors">
              Clear filter
            </button>
          )}
        </div>
        {loading ? (
          <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-10 bg-white/5 rounded-xl animate-pulse" />)}</div>
        ) : recentPosts.length === 0 ? (
          <p className="text-sm text-white/30 text-center py-4">No posts{regionFilter ? ` in ${regionFilter}` : ''} yet.</p>
        ) : (
          <div className="space-y-2">
            {recentPosts.map((p) => (
              <div key={p.id} className="flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors">
                <div className="w-7 h-7 rounded-full bg-gradient-brand flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                  {p.profiles?.full_name?.charAt(0) ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-xs font-medium text-white/70">{p.profiles?.full_name ?? 'Unknown'}</span>
                    {(p.city || p.region) && (
                      <span className="text-[10px] text-white/30 flex items-center gap-0.5">
                        <MapPin className="w-2.5 h-2.5" />{p.city || p.region}
                      </span>
                    )}
                    <span className="text-[10px] text-white/25">{formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}</span>
                  </div>
                  <p className="text-xs text-white/40 truncate">{p.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
