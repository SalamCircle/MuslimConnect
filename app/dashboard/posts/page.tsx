'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';
import type { PostWithAuthor } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { Heart, MessageSquare, Bookmark, Pencil, Trash2, FileText, MapPin, Globe, Building2, Flag, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const scopeLabel: Record<string, string> = {
  area: 'Area', city: 'City', region: 'Region', uk: 'UK', global: 'Global',
};
const scopeColor: Record<string, string> = {
  area: 'badge-emerald', city: 'badge-cyan', region: 'text-xs font-medium px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20',
  uk: 'text-xs font-medium px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/20',
  global: 'text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20',
};

export default function MyPostsPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  async function load() {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('posts')
      .select('*, profiles!posts_user_id_fkey!left(id, full_name, avatar_url, city, region), communities!posts_community_id_fkey!left(id, name, category)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setPosts((data as unknown as PostWithAuthor[]) || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [user]);

  async function saveEdit(id: string) {
    if (!editContent.trim()) return;
    const { error } = await supabase.from('posts').update({ content: editContent.trim(), updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error('Failed to update post.'); return; }
    toast.success('Post updated!');
    setEditingId(null);
    load();
  }

  async function deletePost(id: string) {
    setDeleting(id);
    const { error } = await supabase.from('posts').delete().eq('id', id);
    if (error) { toast.error('Failed to delete post.'); }
    else { toast.success('Post deleted.'); setPosts((p) => p.filter((x) => x.id !== id)); }
    setDeleting(null);
    setConfirmDelete(null);
  }

  return (
    <div className="max-w-2xl mx-auto px-5 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">My Posts</h1>
          <p className="text-sm text-white/40 mt-1">{posts.length} post{posts.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-5 animate-pulse">
              <div className="h-3 bg-white/10 rounded w-3/4 mb-3" />
              <div className="h-3 bg-white/10 rounded w-full" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <FileText className="w-12 h-12 text-white/10 mx-auto mb-4" />
          <p className="text-white/40 font-medium mb-2">No posts yet</p>
          <p className="text-white/25 text-sm">Share something with your community from the home feed.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <article key={post.id} className="glass-card overflow-hidden">
              <div className="p-4 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {editingId === post.id ? (
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={4}
                        className="field-input w-full resize-none text-sm"
                      />
                    ) : (
                      <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className={scopeColor[post.location_scope] ?? ''}>{scopeLabel[post.location_scope]}</span>
                      {post.communities && (
                        <span className="badge-emerald text-xs">{(post.communities as any).name}</span>
                      )}
                      <span className="text-xs text-white/25">{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-white/35">
                      <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{post.like_count}</span>
                      <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{post.comment_count}</span>
                      <span className="flex items-center gap-1"><Bookmark className="w-3 h-3" />{post.save_count}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {editingId === post.id ? (
                      <>
                        <button onClick={() => saveEdit(post.id)} className="btn-brand text-xs px-3 py-1.5">Save</button>
                        <button onClick={() => setEditingId(null)} className="btn-ghost text-xs px-3 py-1.5">Cancel</button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => { setEditingId(post.id); setEditContent(post.content); }}
                          className="p-2 rounded-lg text-white/35 hover:text-white/70 hover:bg-white/6 transition-all"
                          title="Edit post"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(post.id)}
                          className="p-2 rounded-lg text-white/35 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                          title="Delete post"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Delete confirmation */}
              {confirmDelete === post.id && (
                <div className="px-4 py-3 border-t border-white/[0.05] bg-rose-500/5 flex items-center justify-between gap-3">
                  <p className="text-sm text-white/70">Delete this post permanently?</p>
                  <div className="flex gap-2">
                    <button onClick={() => setConfirmDelete(null)} className="btn-ghost text-xs px-3 py-1.5">Cancel</button>
                    <button
                      onClick={() => deletePost(post.id)}
                      disabled={deleting === post.id}
                      className="text-xs px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30 transition-all"
                    >
                      {deleting === post.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
