'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { PostWithAuthor } from '@/lib/types';
import { EyeOff, Eye, Trash2, Search, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function ModeratePosts() {
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'hidden'>('all');
  const [search, setSearch] = useState('');

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('posts')
      .select('*, profiles!posts_user_id_fkey!left(id, full_name, avatar_url, city, region), communities!posts_community_id_fkey!left(id, name, category)')
      .order('created_at', { ascending: false })
      .limit(100);
    setPosts((data as unknown as PostWithAuthor[]) || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function setStatus(id: string, status: 'active' | 'hidden' | 'removed') {
    const { error } = await supabase.from('posts').update({ status }).eq('id', id);
    if (error) { toast.error('Failed to update post.'); return; }
    toast.success(`Post ${status}.`);
    setPosts((prev) => prev.map((p) => p.id === id ? { ...p, status } : p));
  }

  const statusColors: Record<string, string> = {
    active:  'text-emerald-400 bg-emerald-500/10',
    hidden:  'text-orange-400 bg-orange-500/10',
    removed: 'text-rose-400 bg-rose-500/10',
  };

  const filtered = posts
    .filter((p) => filter === 'all' || p.status === filter)
    .filter((p) => !search.trim() || p.content.toLowerCase().includes(search.toLowerCase()) || p.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Moderate Posts</h1>
          <p className="text-sm text-white/40 mt-1">{posts.length} posts loaded</p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search posts…" className="field-input pl-10 w-full" />
        </div>
        <div className="flex gap-1 p-1 bg-white/[0.04] rounded-xl">
          {(['all', 'active', 'hidden'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={cn('px-3 py-1.5 text-xs rounded-lg capitalize font-medium transition-all', filter === f ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70')}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3,4].map((i) => <div key={i} className="glass-card p-4 animate-pulse h-20" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center"><p className="text-white/30">No posts found.</p></div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <div key={p.id} className="glass-card p-4 flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                {p.profiles?.full_name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs font-medium text-white">{p.profiles?.full_name ?? 'Unknown'}</span>
                  <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full', statusColors[p.status] ?? statusColors.active)}>{p.status}</span>
                  <span className="text-[10px] text-white/30">{formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}</span>
                </div>
                <p className="text-xs text-white/60 line-clamp-2">{p.content}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {p.status === 'hidden' ? (
                  <button onClick={() => setStatus(p.id, 'active')} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all">
                    <Eye className="w-3.5 h-3.5" /> Restore
                  </button>
                ) : (
                  <button onClick={() => setStatus(p.id, 'hidden')} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 transition-all">
                    <EyeOff className="w-3.5 h-3.5" /> Hide
                  </button>
                )}
                <button onClick={() => setStatus(p.id, 'removed')} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 transition-all">
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
