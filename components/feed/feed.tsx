'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';
import type { PostWithAuthor, LocationScope } from '@/lib/types';
import PostComposer from './post-composer';
import PostCard from './post-card';
import AdBanner from './ad-banner';
import { RefreshCw } from 'lucide-react';

interface FeedProps {
  scope: LocationScope;
  communityId?: string;
  hidePosts?: boolean;
}

export default function Feed({ scope, communityId, hidePosts }: FeedProps) {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPosts = useCallback(async () => {
    const SELECT = '*, profiles!posts_user_id_fkey!left(id, full_name, avatar_url, city, region, username), communities!posts_community_id_fkey!left(id, name, category, slug)';
    const base = () => supabase
      .from('posts')
      .select(SELECT)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    let results: PostWithAuthor[];

    if (communityId) {
      const { data, error } = await base().eq('community_id', communityId).limit(40);
      if (error) { console.error('feed error:', error); return; }
      results = (data as unknown as PostWithAuthor[]) || [];
    } else if (scope === 'global') {
      const { data, error } = await base().limit(40);
      if (error) { console.error('feed error:', error); return; }
      results = (data as unknown as PostWithAuthor[]) || [];
    } else if (scope === 'uk') {
      const { data, error } = await base().in('location_scope', ['global', 'uk']).limit(40);
      if (error) { console.error('feed error:', error); return; }
      results = (data as unknown as PostWithAuthor[]) || [];
    } else {
      // city / region / area: run two queries and merge
      const broadPromise = base().in('location_scope', ['global', 'uk']).limit(20);

      const localPromise = ((scope === 'city' || scope === 'area') && profile?.city)
        ? base().ilike('city', profile.city).limit(20)
        : (scope === 'region' && profile?.region)
        ? base().ilike('region', profile.region).limit(20)
        : Promise.resolve({ data: null as null, error: null as null });

      const [broadRes, localRes] = await Promise.all([broadPromise, localPromise]);
      if (broadRes.error) { console.error('feed broad error:', broadRes.error); return; }
      if (localRes.error) { console.error('feed local error:', localRes.error); return; }

      const seen = new Set<string>();
      const merged: PostWithAuthor[] = [];
      for (const p of [...(broadRes.data || []), ...(localRes.data || [])] as unknown as PostWithAuthor[]) {
        if (!seen.has(p.id)) { seen.add(p.id); merged.push(p); }
      }
      merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      results = merged.slice(0, 40);
    }

    setPosts(results);
  }, [scope, communityId, profile]);

  const fetchInteractions = useCallback(async () => {
    if (!user) return;
    const [likesRes, savesRes] = await Promise.all([
      supabase.from('post_likes').select('post_id').eq('user_id', user.id),
      supabase.from('post_saves').select('post_id').eq('user_id', user.id),
    ]);
    setLikedIds(new Set(((likesRes.data || []) as { post_id: string }[]).map((r) => r.post_id)));
    setSavedIds(new Set(((savesRes.data || []) as { post_id: string }[]).map((r) => r.post_id)));
  }, [user]);

  const load = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchPosts(), fetchInteractions()]);
    setLoading(false);
  }, [fetchPosts, fetchInteractions]);

  useEffect(() => { load(); }, [load]);

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([fetchPosts(), fetchInteractions()]);
    setRefreshing(false);
  }

  // Called by PostComposer after a successful insert — prepend post instantly
  function handlePostCreated(newPost: PostWithAuthor) {
    setPosts((prev) => [newPost, ...prev]);
  }

  function handleLikeToggle(postId: string, liked: boolean) {
    setLikedIds((prev) => {
      const next = new Set(prev);
      liked ? next.add(postId) : next.delete(postId);
      return next;
    });
  }

  function handleSaveToggle(postId: string, saved: boolean) {
    setSavedIds((prev) => {
      const next = new Set(prev);
      saved ? next.add(postId) : next.delete(postId);
      return next;
    });
  }

  return (
    <div>
      {!hidePosts && <PostComposer defaultScope={scope} communityId={communityId} onPosted={handlePostCreated} />}

      <div className="flex items-center justify-between mb-3 mt-4">
        <p className="text-xs text-white/30">{posts.length} posts</p>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-xs text-white/35 hover:text-white/60 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-5 animate-pulse">
              <div className="flex gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-white/10" />
                <div className="flex-1 space-y-2">
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
        <div className="glass-card p-10 text-center">
          <p className="text-white/40 text-sm mb-2">No posts yet in this feed.</p>
          <p className="text-white/25 text-xs">Be the first to share something!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post, i) => (
            <div key={post.id}>
              <PostCard
                post={post}
                likedByMe={likedIds.has(post.id)}
                savedByMe={savedIds.has(post.id)}
                onLikeToggle={handleLikeToggle}
                onSaveToggle={handleSaveToggle}
              />
              {(i + 1) % 5 === 0 && (
                <div className="mt-4">
                  <AdBanner placement="feed_inline" city={profile?.city} region={profile?.region} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
