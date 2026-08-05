'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';
import type { PostWithAuthor } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { Bookmark, Heart, MessageSquare, BookmarkX, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const scopeColor: Record<string, string> = {
  area: 'badge-emerald', city: 'badge-cyan',
  region: 'text-xs font-medium px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20',
  uk:     'text-xs font-medium px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/20',
  global: 'text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20',
};

interface PostSaveWithPost {
  post_id: string;
  created_at: string;
  posts: PostWithAuthor;
}

export default function SavedPostsPage() {
  const { user } = useAuth();
  const [saved, setSaved] = useState<PostSaveWithPost[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('post_saves')
      .select('post_id, created_at, posts!post_saves_post_id_fkey!left(*, profiles!posts_user_id_fkey!left(id, full_name, avatar_url, city, region), communities!posts_community_id_fkey!left(id, name, category))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setSaved((data as any) || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [user]);

  async function unsave(postId: string) {
    await supabase.from('post_saves').delete().eq('post_id', postId).eq('user_id', user!.id);
    setSaved((p) => p.filter((s) => s.post_id !== postId));
    toast.success('Post removed from saved.');
  }

  return (
    <div className="max-w-2xl mx-auto px-5 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Saved Posts</h1>
          <p className="text-sm text-white/40 mt-1">{saved.length} saved post{saved.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="glass-card p-5 animate-pulse">
              <div className="h-3 bg-white/10 rounded w-1/3 mb-3" />
              <div className="h-3 bg-white/10 rounded w-full" />
            </div>
          ))}
        </div>
      ) : saved.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <Bookmark className="w-12 h-12 text-white/10 mx-auto mb-4" />
          <p className="text-white/40 font-medium mb-2">No saved posts yet</p>
          <p className="text-white/25 text-sm">Save posts from the community feed to read them later.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {saved.map(({ post_id, created_at, posts: post }) => {
            if (!post) return null;
            const author = post.profiles;
            const community = post.communities;
            const initials = author?.full_name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() ?? '?';
            return (
              <article key={post_id} className="glass-card p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-brand flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">{author?.full_name ?? 'Unknown'}</p>
                        <p className="text-xs text-white/35">{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</p>
                      </div>
                      <button
                        onClick={() => unsave(post_id)}
                        className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-lg hover:bg-amber-500/20 transition-all"
                      >
                        <BookmarkX className="w-3.5 h-3.5" /> Unsave
                      </button>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-white/75 leading-relaxed mb-3 line-clamp-3">{post.content}</p>
                <div className="flex items-center gap-3 flex-wrap">
                  {post.location_scope && <span className={cn(scopeColor[post.location_scope] ?? '')}>{post.location_scope}</span>}
                  {community && <span className="badge-emerald text-xs">{(community as any).name}</span>}
                  <div className="ml-auto flex items-center gap-3 text-xs text-white/30">
                    <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{post.like_count}</span>
                    <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{post.comment_count}</span>
                  </div>
                </div>
                <p className="text-[10px] text-white/20 mt-2">Saved {formatDistanceToNow(new Date(created_at), { addSuffix: true })}</p>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
