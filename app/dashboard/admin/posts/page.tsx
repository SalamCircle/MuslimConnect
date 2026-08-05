'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { PostWithAuthor } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { Star, EyeOff, Trash2, Eye, MapPin, Search, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const UK_REGIONS = [
  'East Midlands','East of England','London','North East','North West',
  'Northern Ireland','Scotland','South East','South West','Wales','West Midlands','Yorkshire and The Humber',
];

type PostStatus = 'active' | 'hidden' | 'removed';

const statusTabs: { value: PostStatus | 'all'; label: string }[] = [
  { value: 'all',     label: 'All Posts' },
  { value: 'active',  label: 'Active' },
  { value: 'hidden',  label: 'Hidden' },
  { value: 'removed', label: 'Removed' },
];

export default function AdminPostsPage() {
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<PostStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [showRegionMenu, setShowRegionMenu] = useState(false);

  async function load() {
    setLoading(true);
    let q = supabase.from('posts')
      .select('*, profiles!posts_user_id_fkey!left(id, full_name, avatar_url, city, region), communities!posts_community_id_fkey!left(id, name, category)')
      .order('created_at', { ascending: false })
      .limit(100);
    if (statusFilter !== 'all') q = q.eq('status', statusFilter);
    if (regionFilter) q = q.eq('region', regionFilter);
    const { data } = await q;
    setPosts((data as unknown as PostWithAuthor[]) || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [statusFilter, regionFilter]);

  const filtered = search.trim()
    ? posts.filter((p) => p.content.toLowerCase().includes(search.toLowerCase()) || (p.profiles as any)?.full_name?.toLowerCase().includes(search.toLowerCase()))
    : posts;

  async function setStatus(id: string, status: PostStatus) {
    const { error } = await supabase.from('posts').update({ status }).eq('id', id);
    if (error) { toast.error('Failed.'); return; }
    toast.success(`Post marked as ${status}.`);
    setPosts((p) => p.map((x) => x.id === id ? { ...x, status } : x));
  }

  async function toggleFeature(id: string, current: boolean) {
    const { error } = await supabase.from('posts').update({ is_featured: !current }).eq('id', id);
    if (error) { toast.error('Failed.'); return; }
    toast.success(current ? 'Post unfeatured.' : 'Post featured!');
    setPosts((p) => p.map((x) => x.id === id ? { ...x, is_featured: !current } : x));
  }

  async function deletePost(id: string) {
    const { error } = await supabase.from('posts').delete().eq('id', id);
    if (error) { toast.error('Failed.'); return; }
    toast.success('Post deleted.');
    setPosts((p) => p.filter((x) => x.id !== id));
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-white">Community Posts</h1>
          <p className="text-sm text-white/40 mt-1">Moderate and manage all community posts{regionFilter ? ` — ${regionFilter}` : ''}</p>
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

      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search posts…" className="field-input pl-10 w-full max-w-sm" />
      </div>

      <div className="flex gap-1 border-b border-white/[0.06] mb-5">
        {statusTabs.map(({ value, label }) => (
          <button key={value} onClick={() => setStatusFilter(value)}
            className={cn('px-4 py-3 text-sm font-medium border-b-2 transition-all', statusFilter === value ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-white/40 hover:text-white/70')}
          >{label}</button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="glass-card p-4 animate-pulse h-20" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center"><p className="text-white/30">No posts found{regionFilter ? ` in ${regionFilter}` : ''}.</p></div>
      ) : (
        <div className="space-y-3">
          {filtered.map((post) => {
            const author = post.profiles as any;
            return (
              <div key={post.id} className={cn('glass-card p-4 border', post.status === 'removed' ? 'border-rose-500/20 bg-rose-500/5 opacity-60' : post.status === 'hidden' ? 'border-orange-500/20 bg-orange-500/5' : 'border-white/[0.06]')}>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                    {author?.full_name?.charAt(0) ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-medium text-white">{author?.full_name ?? 'Unknown'}</span>
                      {(author?.city || author?.region) && (
                        <span className="text-xs text-white/35 flex items-center gap-0.5">
                          <MapPin className="w-3 h-3" />{author.city || author.region}
                        </span>
                      )}
                      <span className="text-xs text-white/25">{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                      <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full border', post.status === 'active' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : post.status === 'hidden' ? 'text-orange-400 bg-orange-500/10 border-orange-500/20' : 'text-rose-400 bg-rose-500/10 border-rose-500/20')}>{post.status}</span>
                      {post.is_featured && <span className="text-[10px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><Star className="w-2.5 h-2.5 fill-amber-400" />Featured</span>}
                    </div>
                    <p className="text-sm text-white/65 leading-relaxed line-clamp-2">{post.content}</p>
                    <p className="text-xs text-white/25 mt-1">{post.like_count} likes · {post.comment_count} comments · scope: {post.location_scope}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => toggleFeature(post.id, post.is_featured)} className={cn('p-1.5 rounded-lg transition-all', post.is_featured ? 'text-amber-400 bg-amber-500/10' : 'text-white/25 hover:text-amber-400 hover:bg-amber-500/10')} title="Toggle feature">
                      <Star className="w-4 h-4" />
                    </button>
                    {post.status !== 'hidden' && (
                      <button onClick={() => setStatus(post.id, 'hidden')} className="p-1.5 rounded-lg text-white/25 hover:text-orange-400 hover:bg-orange-500/10 transition-all" title="Hide post">
                        <EyeOff className="w-4 h-4" />
                      </button>
                    )}
                    {post.status === 'hidden' && (
                      <button onClick={() => setStatus(post.id, 'active')} className="p-1.5 rounded-lg text-orange-400 bg-orange-500/10 hover:text-white/70 transition-all" title="Unhide post">
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => deletePost(post.id)} className="p-1.5 rounded-lg text-white/25 hover:text-rose-400 hover:bg-rose-500/10 transition-all" title="Delete post">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
