'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { News, NewsArticle } from '@/lib/types';
import { Newspaper, Plus, Pencil, Trash2, Search, Star, X, Inbox, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';

const CATEGORIES = ['uk', 'world', 'local', 'community', 'general'];

type FormState = {
  title: string;
  excerpt: string;
  content: string;
  category: string;
  image_url: string;
  is_featured: boolean;
};

const blank: FormState = { title: '', excerpt: '', content: '', category: 'community', image_url: '', is_featured: false };

export default function AdminNewsPage() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<'articles' | 'queue'>('articles');
  const [articles, setArticles] = useState<News[]>([]);
  const [queue, setQueue] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [queueLoading, setQueueLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{ open: boolean; editing: News | null }>({ open: false, editing: null });
  const [form, setForm] = useState<FormState>(blank);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  async function loadArticles() {
    setLoading(true);
    const { data } = await supabase.from('news').select('*').order('published_at', { ascending: false });
    setArticles((data as News[]) || []);
    setLoading(false);
  }

  async function loadQueue() {
    setQueueLoading(true);
    const { data } = await supabase
      .from('news_articles')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    setQueue((data as NewsArticle[]) || []);
    setQueueLoading(false);
  }

  useEffect(() => { loadArticles(); loadQueue(); }, []);

  const filtered = search.trim()
    ? articles.filter((a) => a.title.toLowerCase().includes(search.toLowerCase()))
    : articles;

  function openAdd() { setForm(blank); setModal({ open: true, editing: null }); }
  function openEdit(a: News) {
    setForm({ title: a.title, excerpt: a.excerpt ?? '', content: a.content, category: a.category, image_url: a.image_url ?? '', is_featured: a.is_featured });
    setModal({ open: true, editing: a });
  }

  async function save() {
    if (!form.title.trim()) { toast.error('Title required.'); return; }
    if (!form.content.trim()) { toast.error('Content required.'); return; }
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      excerpt: form.excerpt.trim() || null,
      content: form.content.trim(),
      category: form.category as News['category'],
      image_url: form.image_url || null,
      is_featured: form.is_featured,
    };
    if (modal.editing) {
      const { error } = await supabase.from('news').update(payload).eq('id', modal.editing.id);
      if (error) { toast.error('Failed to update.'); setSaving(false); return; }
      toast.success('Article updated.');
      setArticles((prev) => prev.map((a) => a.id === modal.editing!.id ? { ...a, ...payload } : a));
    } else {
      const { data, error } = await supabase.from('news').insert({ ...payload, published_at: new Date().toISOString() }).select().single();
      if (error) { toast.error('Failed to publish.'); setSaving(false); return; }
      toast.success('Article published.');
      setArticles((prev) => [data as News, ...prev]);
    }
    setSaving(false);
    setModal({ open: false, editing: null });
  }

  async function deleteArticle(id: string) {
    const { error } = await supabase.from('news').delete().eq('id', id);
    if (error) { toast.error('Failed to delete.'); return; }
    toast.success('Article deleted.');
    setArticles((prev) => prev.filter((a) => a.id !== id));
    setConfirmDelete(null);
  }

  async function toggleFeature(id: string, current: boolean) {
    const { error } = await supabase.from('news').update({ is_featured: !current }).eq('id', id);
    if (error) { toast.error('Failed.'); return; }
    setArticles((prev) => prev.map((a) => a.id === id ? { ...a, is_featured: !current } : a));
  }

  async function approveArticle(article: NewsArticle) {
    const { error: pubErr } = await supabase.from('news').insert({
      title: article.title,
      excerpt: article.summary,
      content: article.summary ?? article.title,
      category: 'community',
      image_url: article.image_url,
      is_featured: false,
      published_at: article.published_at ?? new Date().toISOString(),
    });
    if (pubErr) { toast.error('Failed to publish.'); return; }
    await supabase.from('news_articles').update({
      status: 'approved',
      approved_by: profile?.id ?? null,
      approved_at: new Date().toISOString(),
    }).eq('id', article.id);
    toast.success('Article approved and published.');
    setQueue((prev) => prev.filter((a) => a.id !== article.id));
    loadArticles();
  }

  async function rejectArticle(id: string) {
    const { error } = await supabase.from('news_articles').update({ status: 'rejected' }).eq('id', id);
    if (error) { toast.error('Failed to reject.'); return; }
    toast.success('Article rejected.');
    setQueue((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">News</h1>
          <p className="text-sm text-white/40 mt-1">{articles.length} articles published</p>
        </div>
        <button onClick={openAdd} className="btn-brand flex items-center gap-2 text-sm px-4 py-2">
          <Plus className="w-4 h-4" /> New Article
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 p-1 bg-white/[0.04] rounded-xl w-fit">
        <button
          onClick={() => setTab('articles')}
          className={cn('px-4 py-2 text-sm rounded-lg font-medium transition-all', tab === 'articles' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70')}
        >
          <Newspaper className="w-4 h-4 inline mr-1.5 -mt-0.5" />
          Published
        </button>
        <button
          onClick={() => setTab('queue')}
          className={cn('px-4 py-2 text-sm rounded-lg font-medium transition-all flex items-center gap-1.5', tab === 'queue' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70')}
        >
          <Inbox className="w-4 h-4" />
          Import Queue
          {queue.length > 0 && (
            <span className="bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none font-semibold">{queue.length}</span>
          )}
        </button>
      </div>

      {tab === 'articles' && (
        <>
          <div className="relative mb-5">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search articles…" className="field-input pl-10 w-full max-w-sm" />
          </div>

          {loading ? (
            <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="glass-card p-4 animate-pulse h-16" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="glass-card p-12 text-center"><p className="text-white/30">No articles yet.</p></div>
          ) : (
            <div className="space-y-2">
              {filtered.map((a) => (
                <div key={a.id} className="glass-card p-4 flex items-center gap-4">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <Newspaper className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <p className="text-sm font-medium text-white truncate">{a.title}</p>
                      {a.is_featured && <span className="text-[10px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><Star className="w-2.5 h-2.5 fill-amber-400" />Featured</span>}
                      <span className="text-[10px] text-white/30 capitalize">{a.category}</span>
                    </div>
                    <p className="text-xs text-white/30">{formatDistanceToNow(new Date(a.published_at), { addSuffix: true })}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => toggleFeature(a.id, a.is_featured)} className={cn('p-1.5 rounded-lg transition-all', a.is_featured ? 'text-amber-400 bg-amber-500/10' : 'text-white/25 hover:text-amber-400 hover:bg-amber-500/10')} title="Toggle feature">
                      <Star className="w-4 h-4" />
                    </button>
                    <button onClick={() => openEdit(a)} className="p-1.5 rounded-lg text-white/25 hover:text-white/70 hover:bg-white/6 transition-all" title="Edit">
                      <Pencil className="w-4 h-4" />
                    </button>
                    {confirmDelete === a.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => deleteArticle(a.id)} className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded-lg hover:bg-rose-500/20 transition-all">Confirm</button>
                        <button onClick={() => setConfirmDelete(null)} className="text-xs text-white/40 hover:text-white/70 px-1 py-1 rounded-lg transition-all">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDelete(a.id)} className="p-1.5 rounded-lg text-white/25 hover:text-rose-400 hover:bg-rose-500/10 transition-all" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'queue' && (
        <>
          {queueLoading ? (
            <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="glass-card p-4 animate-pulse h-20" />)}</div>
          ) : queue.length === 0 ? (
            <div className="glass-card p-16 text-center">
              <Inbox className="w-10 h-10 text-white/10 mx-auto mb-3" />
              <p className="text-white/30 text-sm">No pending articles in the import queue</p>
            </div>
          ) : (
            <div className="space-y-2">
              {queue.map((a) => (
                <div key={a.id} className="glass-card p-4">
                  <div className="flex items-start gap-4">
                    {a.image_url && (
                      <img src={a.image_url} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white mb-1">{a.title}</p>
                      {a.summary && <p className="text-xs text-white/50 line-clamp-2 mb-2">{a.summary}</p>}
                      <div className="flex items-center gap-3 text-xs text-white/30">
                        {a.source_name && <span>{a.source_name}</span>}
                        {a.published_at && <span>{formatDistanceToNow(new Date(a.published_at), { addSuffix: true })}</span>}
                        {a.source_url && (
                          <a href={a.source_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-0.5 text-emerald-400/60 hover:text-emerald-400 transition-colors">
                            <ExternalLink className="w-3 h-3" /> Source
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => approveArticle(a)}
                        className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => rejectArticle(a.id)}
                        className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg font-medium text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-white">{modal.editing ? 'Edit Article' : 'New Article'}</h2>
              <button onClick={() => setModal({ open: false, editing: null })} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/6 transition-all"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-white/60 mb-1.5 block">Title *</label>
                <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} className="field-input w-full" placeholder="Article headline" />
              </div>
              <div>
                <label className="text-xs font-medium text-white/60 mb-1.5 block">Category</label>
                <select value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} className="field-input w-full capitalize">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-white/60 mb-1.5 block">Excerpt</label>
                <textarea value={form.excerpt} onChange={(e) => setForm((p) => ({ ...p, excerpt: e.target.value }))} rows={2} className="field-input w-full resize-none" placeholder="Short summary shown in listings…" />
              </div>
              <div>
                <label className="text-xs font-medium text-white/60 mb-1.5 block">Content *</label>
                <textarea value={form.content} onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))} rows={8} className="field-input w-full resize-none" placeholder="Full article content…" />
              </div>
              <div>
                <label className="text-xs font-medium text-white/60 mb-1.5 block">Image URL</label>
                <input value={form.image_url} onChange={(e) => setForm((p) => ({ ...p, image_url: e.target.value }))} className="field-input w-full" placeholder="https://…" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input type="checkbox" checked={form.is_featured} onChange={(e) => setForm((p) => ({ ...p, is_featured: e.target.checked }))} className="accent-amber-400" />
                <span className="text-sm text-white/70">Feature this article</span>
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModal({ open: false, editing: null })} className="btn-ghost flex-1">Cancel</button>
              <button onClick={save} disabled={saving} className="btn-brand flex-1">{saving ? 'Saving…' : modal.editing ? 'Save Changes' : 'Publish Article'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

