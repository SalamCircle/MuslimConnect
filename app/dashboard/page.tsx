'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import type { PostWithAuthor, Community, LocationScope } from '@/lib/types';
import PostCard from '@/components/feed/post-card';
import PostComposer from '@/components/feed/post-composer';
import RightPanel from '@/components/dashboard/right-panel';
import {
  MapPin, Globe, Building2, Flag, TrendingUp,
  Bookmark, Users, MessageSquare, Calendar, Briefcase, ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

const scopes: { value: LocationScope; label: string; icon: React.ElementType }[] = [
  { value: 'area',   label: 'My Area',   icon: MapPin },
  { value: 'city',   label: 'My City',   icon: Building2 },
  { value: 'region', label: 'My Region', icon: TrendingUp },
  { value: 'uk',     label: 'UK',        icon: Flag },
  { value: 'global', label: 'Global',    icon: Globe },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardHomePage() {
  const { user, profile } = useAuth();
  const [activeScope, setActiveScope] = useState<LocationScope>('global');
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [myGroups, setMyGroups] = useState<Community[]>([]);
  const [stats, setStats] = useState({ posts: 0, groups: 0, saved: 0 });

  const fetchPosts = useCallback(async () => {
    const SELECT = '*, profiles!posts_user_id_fkey!left(id, full_name, avatar_url, city, region), communities!posts_community_id_fkey!left(id, name, category)';
    const base = () => supabase
      .from('posts')
      .select(SELECT)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    let results: PostWithAuthor[];

    if (activeScope === 'global') {
      const { data, error } = await base().limit(30);
      if (error) { console.error('feed global error:', error); }
      results = (data as unknown as PostWithAuthor[]) || [];
    } else if (activeScope === 'uk') {
      const { data, error } = await base().in('location_scope', ['global', 'uk']).limit(30);
      if (error) { console.error('feed uk error:', error); }
      results = (data as unknown as PostWithAuthor[]) || [];
    } else {
      // city / region / area: broad posts + location-specific posts merged
      const broadPromise = base().in('location_scope', ['global', 'uk']).limit(15);

      const localPromise = ((activeScope === 'city' || activeScope === 'area') && profile?.city)
        ? base().ilike('city', profile.city).limit(15)
        : (activeScope === 'region' && profile?.region)
        ? base().ilike('region', profile.region).limit(15)
        : Promise.resolve({ data: null as null, error: null as null });

      const [broadRes, localRes] = await Promise.all([broadPromise, localPromise]);

      const seen = new Set<string>();
      const merged: PostWithAuthor[] = [];
      for (const p of [...(broadRes.data || []), ...(localRes.data || [])] as unknown as PostWithAuthor[]) {
        if (!seen.has(p.id)) { seen.add(p.id); merged.push(p); }
      }
      merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      results = merged.slice(0, 30);
    }

    setPosts(results);
  }, [activeScope, profile]);

  const fetchInteractions = useCallback(async () => {
    if (!user) return;
    const [likes, saves] = await Promise.all([
      supabase.from('post_likes').select('post_id').eq('user_id', user.id),
      supabase.from('post_saves').select('post_id').eq('user_id', user.id),
    ]);
    setLikedIds(new Set(((likes.data || []) as { post_id: string }[]).map((r) => r.post_id)));
    setSavedIds(new Set(((saves.data || []) as { post_id: string }[]).map((r) => r.post_id)));
  }, [user]);

  const fetchSideData = useCallback(async () => {
    if (!user) return;
    const [groupsRes, postsCountRes, savesCountRes] = await Promise.all([
      supabase.from('community_members').select('communities(*)').eq('user_id', user.id).limit(6),
      supabase.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'active'),
      supabase.from('post_saves').select('post_id', { count: 'exact', head: true }).eq('user_id', user.id),
    ]);
    const groups = (groupsRes.data || []).map((r: any) => r.communities).filter(Boolean) as Community[];
    setMyGroups(groups);
    setStats({ posts: postsCountRes.count ?? 0, groups: groups.length, saved: savesCountRes.count ?? 0 });
  }, [user]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      await Promise.all([fetchPosts(), fetchInteractions(), fetchSideData()]);
      setLoading(false);
    }
    load();
  }, [fetchPosts, fetchInteractions, fetchSideData, refreshKey]);

  function handleLikeToggle(postId: string, liked: boolean) {
    setLikedIds((prev) => { const n = new Set(prev); liked ? n.add(postId) : n.delete(postId); return n; });
  }
  function handleSaveToggle(postId: string, saved: boolean) {
    setSavedIds((prev) => { const n = new Set(prev); saved ? n.add(postId) : n.delete(postId); return n; });
  }

  const scopeSubtitle = activeScope === 'area' && profile?.postcode ? profile.postcode
    : activeScope === 'city' && profile?.city ? profile.city
    : activeScope === 'region' && profile?.region ? profile.region
    : activeScope === 'uk' ? 'United Kingdom' : 'Worldwide';

  const initials = profile?.full_name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() ?? '?';

  return (
    <div className="flex h-full">
      <div className="flex-1 min-w-0 border-r border-white/[0.04]">
        <div className="sticky top-14 md:top-0 z-30 bg-[#050505]/95 backdrop-blur-xl border-b border-white/[0.05]">
          <div className="max-w-2xl mx-auto px-5 pt-5 pb-0">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-lg font-bold text-white leading-none">
                  {greeting()}, {profile?.full_name?.split(' ')[0] ?? 'there'}
                </h1>
                <p className="text-xs text-white/40 mt-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-emerald-400" />{scopeSubtitle}
                </p>
              </div>
            </div>
            <div className="flex gap-0 border-b border-white/[0.06] -mx-5 px-5 overflow-x-auto scrollbar-hide">
              {scopes.map(({ value, label, icon: Icon }) => (
                <button key={value} onClick={() => setActiveScope(value)}
                  className={cn(
                    'flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-all whitespace-nowrap flex-shrink-0',
                    activeScope === value ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-white/40 hover:text-white/70 hover:border-white/20'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />{label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-5 py-5 space-y-4">
          {/* Profile summary */}
          <div className="glass-card p-5 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-brand flex items-center justify-center text-lg font-bold text-white flex-shrink-0 glow-sm">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-white">{profile?.full_name}</p>
              <p className="text-xs text-white/40 mt-0.5">{[profile?.city, profile?.region].filter(Boolean).join(', ') || 'No location set'}</p>
              <div className="flex gap-5 mt-2">
                {[
                  { n: stats.posts, l: 'Posts', href: '/dashboard/posts' },
                  { n: stats.groups, l: 'Groups', href: '/dashboard/groups' },
                  { n: stats.saved, l: 'Saved', href: '/dashboard/saved' },
                ].map(({ n, l, href }) => (
                  <Link key={l} href={href} className="hover:opacity-80 transition-opacity">
                    <div className="text-sm font-bold text-emerald-400">{n}</div>
                    <div className="text-xs text-white/35">{l}</div>
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5 flex-shrink-0">
              <Link href="/dashboard/profile/edit" className="btn-ghost text-xs px-3 py-1.5">Edit Profile</Link>
              {(profile as any)?.is_admin && (
                <Link href="/dashboard/admin" className="btn-brand text-xs px-3 py-1.5">Admin Panel</Link>
              )}
            </div>
          </div>

          {/* Quick nav */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { icon: MessageSquare, label: 'Community', href: '/dashboard/feed', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
              { icon: Calendar,      label: 'Events',    href: '/dashboard/events', color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
              { icon: Briefcase,     label: 'My Jobs',   href: '/dashboard/jobs', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
              { icon: Bookmark,      label: 'Saved',     href: '/dashboard/saved', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
            ].map(({ icon: Icon, label, href, color, bg }) => (
              <Link key={label} href={href}>
                <div className={`glass-card border p-3 text-center hover:scale-[1.04] transition-all ${bg}`}>
                  <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
                  <p className="text-[11px] font-medium text-white/70">{label}</p>
                </div>
              </Link>
            ))}
          </div>

          {/* My groups strip */}
          {myGroups.length > 0 && (
            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-400" /> My Groups
                </h3>
                <Link href="/dashboard/groups" className="text-xs text-white/40 hover:text-emerald-400 transition-colors flex items-center gap-1">
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {myGroups.map((g: any) => (
                  <Link key={g.id} href={`/dashboard/communities/${g.id}`}>
                    <div className="flex-shrink-0 glass-card border border-cyan-500/20 bg-cyan-500/5 p-3 text-center w-24 hover:scale-[1.04] transition-all">
                      <p className="text-xs font-medium text-white truncate">{g.name}</p>
                      <p className="text-[10px] text-white/35 mt-0.5">{g.member_count} members</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <PostComposer defaultScope={activeScope} onPosted={() => setRefreshKey((k) => k + 1)} />

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass-card p-5 animate-pulse">
                  <div className="flex gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex-shrink-0" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-3.5 bg-white/10 rounded w-1/3" />
                      <div className="h-2.5 bg-white/10 rounded w-1/4" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-white/10 rounded w-full" />
                    <div className="h-3 bg-white/10 rounded w-5/6" />
                  </div>
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                <Globe className="w-8 h-8 text-white/20" />
              </div>
              <p className="text-white/50 font-medium mb-1">No posts in this area yet</p>
              <p className="text-white/25 text-sm">Be the first to start a conversation!</p>
            </div>
          ) : (
            posts.map((post) => (
              <PostCard key={post.id} post={post} likedByMe={likedIds.has(post.id)} savedByMe={savedIds.has(post.id)} onLikeToggle={handleLikeToggle} onSaveToggle={handleSaveToggle} />
            ))
          )}
        </div>
      </div>

      <div className="hidden xl:block w-[340px] flex-shrink-0">
        <div className="sticky top-0 h-screen overflow-y-auto scrollbar-hide py-5 px-4">
          <RightPanel />
        </div>
      </div>
    </div>
  );
}
