'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';
import { useAuthPrompt } from '@/components/auth-prompt-modal';
import PublicNav from '@/components/navigation/public-nav';
import type { PostWithAuthor, LocationScope } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { Heart, MessageSquare, Bookmark, MapPin, LogIn, Globe, Building2, Flag, TrendingUp, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const scopes: { value: LocationScope; label: string; icon: React.ElementType }[] = [
  { value: 'area',   label: 'My Area',   icon: MapPin },
  { value: 'city',   label: 'My City',   icon: Building2 },
  { value: 'region', label: 'My Region', icon: TrendingUp },
  { value: 'uk',     label: 'UK',        icon: Flag },
  { value: 'global', label: 'Global',    icon: Globe },
];

const scopeBadge: Record<string, { label: string; cls: string }> = {
  area:   { label: 'Area',   cls: 'badge-emerald' },
  city:   { label: 'City',   cls: 'badge-cyan' },
  region: { label: 'Region', cls: 'text-xs font-medium px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20' },
  uk:     { label: 'UK',     cls: 'text-xs font-medium px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/20' },
  global: { label: 'Global', cls: 'text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20' },
};

export default function PublicBoardPage() {
  const { user, profile } = useAuth();
  const { prompt } = useAuthPrompt();
  const [scope, setScope] = useState<LocationScope>('global');
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    setLoading(true);

    let q = supabase
      .from('posts')
      .select('*, profiles!posts_user_id_fkey!left(id, full_name, avatar_url, city, region, username), communities!posts_community_id_fkey!left(id, name, category, slug)')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(40);

    if (scope === 'global') {
      // No extra filter
    } else if (scope === 'uk') {
      q = q.in('location_scope', ['global', 'uk']);
    } else if (scope === 'area' && profile?.postcode) {
      q = q.eq('location_scope', 'area').eq('postcode', profile.postcode);
    } else if (scope === 'city' && profile?.city) {
      q = q.eq('location_scope', 'city').ilike('city', profile.city);
    } else if (scope === 'region' && profile?.region) {
      q = q.eq('location_scope', 'region').ilike('region', profile.region);
    }

    const { data, error } = await q;
    if (error) console.error('board fetch error:', error);
    setPosts((data as unknown as PostWithAuthor[]) || []);
    setLoading(false);
  }, [scope, profile]);

  const fetchInteractions = useCallback(async () => {
    if (!user) return;
    const [likes, saves] = await Promise.all([
      supabase.from('post_likes').select('post_id').eq('user_id', user.id),
      supabase.from('post_saves').select('post_id').eq('user_id', user.id),
    ]);
    setLikedIds(new Set(((likes.data || []) as { post_id: string }[]).map((r) => r.post_id)));
    setSavedIds(new Set(((saves.data || []) as { post_id: string }[]).map((r) => r.post_id)));
  }, [user]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);
  useEffect(() => { fetchInteractions(); }, [fetchInteractions]);

  async function toggleLike(post: PostWithAuthor) {
    if (!user) { prompt('like'); return; }
    const liked = likedIds.has(post.id);
    if (liked) {
      await supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', user.id);
      setLikedIds((p) => { const n = new Set(p); n.delete(post.id); return n; });
    } else {
      await supabase.from('post_likes').insert({ post_id: post.id, user_id: user.id });
      setLikedIds((p) => { const n = new Set(p); n.add(post.id); return n; });
    }
  }

  async function toggleSave(post: PostWithAuthor) {
    if (!user) { prompt('save'); return; }
    const saved = savedIds.has(post.id);
    if (saved) {
      await supabase.from('post_saves').delete().eq('post_id', post.id).eq('user_id', user.id);
      setSavedIds((p) => { const n = new Set(p); n.delete(post.id); return n; });
    } else {
      await supabase.from('post_saves').insert({ post_id: post.id, user_id: user.id });
      setSavedIds((p) => { const n = new Set(p); n.add(post.id); return n; });
      toast.success('Post saved!');
    }
  }

  function sharePost(post: PostWithAuthor) {
    const url = post.slug ? `${window.location.origin}/post/${post.slug}` : window.location.href;
    if (navigator.share) {
      navigator.share({ url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Link copied!');
    }
  }

  return (
    <div className="min-h-screen bg-[#050505]">
      <PublicNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-[76px]">
        <div className="flex gap-6">
          {/* Main column */}
          <div className="flex-1 min-w-0 py-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-white">Community</h1>
              <p className="text-sm text-white/45 mt-1">
                Read community discussions.{' '}
                <Link href="/auth/signup" className="text-emerald-400 hover:text-emerald-300">Join free</Link>{' '}
                to post and interact.
              </p>
            </div>

            {!user && (
              <Link href="/auth/signup">
                <div className="glass-card p-4 mb-6 flex items-center gap-3 border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-gradient-brand flex items-center justify-center flex-shrink-0">
                    <LogIn className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">Join the conversation</p>
                    <p className="text-xs text-white/50">Create a free account to post, comment, and connect with Muslims in your area.</p>
                  </div>
                  <span className="btn-brand text-xs px-4 py-2 flex-shrink-0">Join Free</span>
                </div>
              </Link>
            )}

            <div className="flex gap-0 border-b border-white/[0.06] mb-6 overflow-x-auto scrollbar-hide">
              {scopes.map(({ value, label, icon: Icon }) => (
                <button key={value} onClick={() => setScope(value)}
                  className={cn(
                    'flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-all whitespace-nowrap flex-shrink-0',
                    scope === value ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-white/40 hover:text-white/70'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="glass-card p-5 animate-pulse">
                    <div className="flex gap-3 mb-3">
                      <div className="w-9 h-9 rounded-full bg-white/10 flex-shrink-0" />
                      <div className="flex-1 space-y-2 py-1">
                        <div className="h-3 bg-white/10 rounded w-1/3" />
                        <div className="h-2 bg-white/10 rounded w-1/4" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 bg-white/10 rounded w-full" />
                      <div className="h-3 bg-white/10 rounded w-4/5" />
                    </div>
                  </div>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <Globe className="w-10 h-10 text-white/15 mx-auto mb-3" />
                <p className="text-white/40 font-medium mb-1">No posts in this area yet</p>
                <p className="text-white/25 text-sm">
                  <Link href="/auth/signup" className="text-emerald-400 hover:underline">Join free</Link> and be the first to post!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => {
                  const author = post.profiles;
                  const community = post.communities;
                  const badge = scopeBadge[post.location_scope] ?? scopeBadge.global;
                  const initials = author?.full_name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() ?? '?';
                  const liked = likedIds.has(post.id);
                  const saved = savedIds.has(post.id);
                  const authorHref = author?.username ? `/user/${author.username}` : '#';
                  const communityHref = community?.slug ? `/community/${community.slug}` : '/board';
                  const postHref = post.slug ? `/post/${post.slug}` : '#';

                  return (
                    <article key={post.id} className="glass-card overflow-hidden">
                      <div className="p-4 pb-3">
                        <div className="flex items-start gap-3">
                          <Link href={authorHref} className="flex-shrink-0">
                            <div className="w-10 h-10 rounded-full bg-gradient-brand flex items-center justify-center text-sm font-bold text-white hover:opacity-80 transition-opacity">
                              {initials}
                            </div>
                          </Link>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <Link href={authorHref}>
                                  <span className="text-sm font-semibold text-white hover:text-emerald-400 transition-colors">{author?.full_name ?? 'Community Member'}</span>
                                </Link>
                                <div className="flex items-center gap-1.5 text-xs text-white/35 mt-0.5 flex-wrap">
                                  {(author?.city || author?.region) && (
                                    <><MapPin className="w-3 h-3" /><span>{author.city || author.region}</span><span>·</span></>
                                  )}
                                  <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                {community && (
                                  <Link href={communityHref}>
                                    <span className="badge-emerald text-xs hover:bg-emerald-500/20 transition-colors cursor-pointer">{community.name}</span>
                                  </Link>
                                )}
                                <span className={badge.cls}>{badge.label}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {post.content && (
                        <div className="px-4 pb-3">
                          <Link href={postHref}>
                            <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap hover:text-white/95 transition-colors">{post.content}</p>
                          </Link>
                        </div>
                      )}

                      <div className="px-4 py-2.5 border-t border-white/[0.05] flex items-center gap-0.5">
                        <button
                          onClick={() => toggleLike(post)}
                          className={cn('flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg font-medium transition-all',
                            liked ? 'text-rose-400 bg-rose-500/10' : 'text-white/40 hover:text-rose-400 hover:bg-rose-500/8'
                          )}
                        >
                          <Heart className={cn('w-4 h-4', liked && 'fill-rose-400')} />
                          {post.like_count > 0 ? post.like_count : ''} Like
                        </button>
                        <button
                          onClick={() => !user && prompt('comment')}
                          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg font-medium text-white/40 hover:text-white/70 hover:bg-white/6 transition-all"
                        >
                          <MessageSquare className="w-4 h-4" />
                          {post.comment_count > 0 ? post.comment_count : ''} Comment
                        </button>
                        <button
                          onClick={() => sharePost(post)}
                          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg font-medium text-white/40 hover:text-white/70 hover:bg-white/6 transition-all"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleSave(post)}
                          className={cn('flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg font-medium transition-all ml-auto',
                            saved ? 'text-amber-400 bg-amber-500/10' : 'text-white/40 hover:text-amber-400 hover:bg-amber-500/8'
                          )}
                        >
                          <Bookmark className={cn('w-4 h-4', saved && 'fill-amber-400')} />
                          {saved ? 'Saved' : 'Save'}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div className="hidden xl:block w-72 flex-shrink-0 py-8 space-y-5">
            <div className="glass-card p-5 border border-emerald-500/15 bg-emerald-500/5">
              <h3 className="text-sm font-semibold text-white mb-2">Join the community</h3>
              <p className="text-xs text-white/50 mb-4 leading-relaxed">Connect with Muslims in your area. Post, comment, join groups, and discover mosques near you.</p>
              <Link href="/auth/signup" className="btn-brand text-xs w-full py-2.5 text-center block">Join Free Today</Link>
              <p className="text-xs text-white/30 text-center mt-2">Already have an account? <Link href="/auth/login" className="text-emerald-400 hover:underline">Sign in</Link></p>
            </div>

            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Explore</h3>
              <div className="space-y-1">
                {[
                  { href: '/events',      label: 'Events',            desc: 'Upcoming near you' },
                  { href: '/mosques',     label: 'Find a Mosque',     desc: 'UK directory' },
                  { href: '/businesses',  label: 'Muslim Businesses', desc: 'Halal directory' },
                  { href: '/jobs',        label: 'Jobs Board',        desc: 'Muslim-friendly roles' },
                  { href: '/communities', label: 'Communities',       desc: 'Browse groups' },
                ].map(({ href, label, desc }) => (
                  <Link key={href} href={href} className="flex items-center justify-between px-2 py-2 rounded-lg hover:bg-white/6 transition-colors group">
                    <span className="text-sm text-white/65 group-hover:text-white transition-colors">{label}</span>
                    <span className="text-xs text-white/30">{desc}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
