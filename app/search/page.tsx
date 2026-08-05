'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import PublicNav from '@/components/navigation/public-nav';
import type { PostWithAuthor, Profile, Community, Mosque, Event, Resource } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import {
  Search, MessageSquare, Users, Heart, MapPin,
  Building2, Briefcase, Calendar, BookOpen, X
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Tab = 'posts' | 'communities' | 'people' | 'mosques' | 'events' | 'resources';

const tabs: { value: Tab; label: string; icon: React.ElementType }[] = [
  { value: 'posts',       label: 'Posts',       icon: MessageSquare },
  { value: 'communities', label: 'Communities', icon: Users },
  { value: 'people',      label: 'People',      icon: Users },
  { value: 'mosques',     label: 'Mosques',     icon: MapPin },
  { value: 'events',      label: 'Events',      icon: Calendar },
  { value: 'resources',   label: 'Resources',   icon: BookOpen },
];

function SearchResults() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQ = searchParams.get('q') ?? '';
  const initialTab = (searchParams.get('type') as Tab) ?? 'posts';

  const [q, setQ] = useState(initialQ);
  const [inputVal, setInputVal] = useState(initialQ);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [loading, setLoading] = useState(false);

  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [people, setPeople] = useState<Profile[]>([]);
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);

  const runSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setPosts([]); setCommunities([]); setPeople([]);
      setMosques([]); setEvents([]); setResources([]);
      return;
    }
    setLoading(true);
    const pat = `%${query}%`;

    const [postsRes, commRes, peopleRes, mosqueRes, eventsRes, resRes] = await Promise.all([
      supabase.from('posts').select('*, profiles!posts_user_id_fkey!left(id, full_name, avatar_url, city, region, username), communities!posts_community_id_fkey!left(id, name, category, slug)')
        .eq('status', 'active')
        .or(`title.ilike.${pat},content.ilike.${pat}`)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase.from('communities').select('*').eq('is_public', true)
        .or(`name.ilike.${pat},description.ilike.${pat}`)
        .order('member_count', { ascending: false })
        .limit(12),
      supabase.from('profiles').select('*')
        .or(`full_name.ilike.${pat},username.ilike.${pat}`)
        .limit(12),
      supabase.from('mosques').select('*')
        .or(`name.ilike.${pat},city.ilike.${pat},address.ilike.${pat}`)
        .limit(12),
      supabase.from('events').select('*').eq('status', 'approved')
        .or(`title.ilike.${pat},city.ilike.${pat}`)
        .order('start_datetime', { ascending: true })
        .limit(12),
      supabase.from('resources').select('*')
        .or(`title.ilike.${pat},description.ilike.${pat}`)
        .limit(12),
    ]);

    setPosts((postsRes.data as unknown as PostWithAuthor[]) || []);
    setCommunities((commRes.data as Community[]) || []);
    setPeople((peopleRes.data as Profile[]) || []);
    setMosques((mosqueRes.data as Mosque[]) || []);
    setEvents((eventsRes.data as Event[]) || []);
    setResources((resRes.data as Resource[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (q) runSearch(q);
  }, [q, runSearch]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = inputVal.trim();
    if (!trimmed) return;
    setQ(trimmed);
    router.replace(`/search?q=${encodeURIComponent(trimmed)}&type=${tab}`);
  }

  function switchTab(t: Tab) {
    setTab(t);
    router.replace(`/search?q=${encodeURIComponent(q)}&type=${t}`, { scroll: false });
  }

  const counts: Record<Tab, number> = {
    posts: posts.length,
    communities: communities.length,
    people: people.length,
    mosques: mosques.length,
    events: events.length,
    resources: resources.length,
  };

  const categoryIcons: Record<string, string> = {
    students: '🎓', business: '💼', reverts: '🌙', technology: '💻',
    parenting: '👨‍👩‍👧', islamic_studies: '📖', brothers: '🤝',
    sisters: '💜', youth: '⚡', professionals: '🏢', general: '🌐',
  };

  return (
    <div className="min-h-screen bg-[#050505]">
      <PublicNav />

      <div className="max-w-3xl mx-auto px-4 pt-[76px] py-8">
        {/* Search bar */}
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Search posts, communities, people, mosques…"
                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
              />
              {inputVal && (
                <button
                  type="button"
                  onClick={() => { setInputVal(''); setQ(''); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button type="submit" className="btn-brand px-5 py-3 text-sm rounded-xl flex-shrink-0">Search</button>
          </div>
        </form>

        {q && (
          <p className="text-sm text-white/40 mb-4">
            {loading ? 'Searching…' : `Results for "${q}"`}
          </p>
        )}

        {/* Tabs */}
        <div className="flex gap-0 border-b border-white/[0.06] mb-6 overflow-x-auto scrollbar-hide">
          {tabs.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => switchTab(value)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-all whitespace-nowrap flex-shrink-0',
                tab === value
                  ? 'border-emerald-400 text-emerald-400'
                  : 'border-transparent text-white/40 hover:text-white/70'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              {q && counts[value] > 0 && (
                <span className="ml-1 text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full">{counts[value]}</span>
              )}
            </button>
          ))}
        </div>

        {!q ? (
          <div className="glass-card p-12 text-center">
            <Search className="w-10 h-10 text-white/15 mx-auto mb-3" />
            <p className="text-white/40 font-medium mb-1">Search ConnectMuslim</p>
            <p className="text-white/25 text-sm">Find posts, communities, members, mosques, events, and resources.</p>
          </div>
        ) : loading ? (
          <div className="space-y-3">
            {[1,2,3].map((i) => (
              <div key={i} className="glass-card p-4 animate-pulse space-y-2">
                <div className="h-3 bg-white/10 rounded w-1/3" />
                <div className="h-3 bg-white/10 rounded w-4/5" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Posts */}
            {tab === 'posts' && (
              posts.length === 0 ? <Empty label="posts" /> : (
                <div className="space-y-3">
                  {posts.map((post) => {
                    const author = post.profiles;
                    const postHref = post.slug ? `/post/${post.slug}` : '#';
                    const authorHref = author?.username ? `/user/${author.username}` : '#';
                    return (
                      <article key={post.id} className="glass-card overflow-hidden hover:border-white/10 transition-colors">
                        <div className="p-4">
                          <div className="flex items-center gap-1.5 text-xs text-white/35 mb-1.5">
                            <Link href={authorHref} className="font-medium text-white/60 hover:text-emerald-400 transition-colors">
                              {author?.full_name ?? 'Member'}
                            </Link>
                            {post.communities && (
                              <><span>·</span>
                              <Link href={post.communities.slug ? `/community/${post.communities.slug}` : '/board'} className="text-emerald-400 hover:underline">
                                {post.communities.name}
                              </Link></>
                            )}
                            <span>·</span>
                            <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                          </div>
                          {post.title && (
                            <Link href={postHref}>
                              <h3 className="text-sm font-semibold text-white hover:text-emerald-400 transition-colors mb-1">{post.title}</h3>
                            </Link>
                          )}
                          <Link href={postHref}>
                            <p className="text-sm text-white/60 line-clamp-2 leading-relaxed">{post.content}</p>
                          </Link>
                          <div className="flex gap-3 mt-2 text-xs text-white/25">
                            <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{post.like_count}</span>
                            <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{post.comment_count}</span>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )
            )}

            {/* Communities */}
            {tab === 'communities' && (
              communities.length === 0 ? <Empty label="communities" /> : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {communities.map((c) => (
                    <Link key={c.id} href={c.slug ? `/community/${c.slug}` : '/communities'}>
                      <div className="glass-card p-4 hover:border-white/10 transition-colors h-full">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">{categoryIcons[c.category] ?? '🌐'}</span>
                          <div>
                            <p className="text-sm font-semibold text-white">{c.name}</p>
                            <p className="text-xs text-white/35">{c.member_count} members</p>
                          </div>
                        </div>
                        {c.description && (
                          <p className="text-xs text-white/50 line-clamp-2">{c.description}</p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )
            )}

            {/* People */}
            {tab === 'people' && (
              people.length === 0 ? <Empty label="people" /> : (
                <div className="space-y-2">
                  {people.map((p) => {
                    const initials = p.full_name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() ?? '?';
                    return (
                      <Link key={p.id} href={p.username ? `/user/${p.username}` : '#'}>
                        <div className="glass-card p-4 hover:border-white/10 transition-colors flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-brand flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                            {initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white">{p.full_name}</p>
                            <p className="text-xs text-white/35">@{p.username} · {[p.city, p.country].filter(Boolean).join(', ')}</p>
                          </div>
                          <div className="text-xs text-white/30 flex-shrink-0">
                            <span>{p.followers_count} followers</span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )
            )}

            {/* Mosques */}
            {tab === 'mosques' && (
              mosques.length === 0 ? <Empty label="mosques" /> : (
                <div className="space-y-2">
                  {mosques.map((m) => (
                    <div key={m.id} className="glass-card p-4">
                      <p className="text-sm font-semibold text-white mb-0.5">{m.name}</p>
                      <div className="flex items-center gap-1.5 text-xs text-white/40">
                        <MapPin className="w-3 h-3" />
                        <span>{[m.address, m.city, m.postcode].filter(Boolean).join(', ')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Events */}
            {tab === 'events' && (
              events.length === 0 ? <Empty label="events" /> : (
                <div className="space-y-2">
                  {events.map((ev) => (
                    <div key={ev.id} className="glass-card p-4">
                      <p className="text-sm font-semibold text-white mb-1">{ev.title}</p>
                      <div className="flex flex-wrap gap-3 text-xs text-white/40">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(ev.start_datetime).toLocaleDateString()}</span>
                        {ev.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{ev.city}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Resources */}
            {tab === 'resources' && (
              resources.length === 0 ? <Empty label="resources" /> : (
                <div className="space-y-2">
                  {resources.map((r) => (
                    <div key={r.id} className="glass-card p-4">
                      <p className="text-sm font-semibold text-white mb-0.5">{r.title}</p>
                      {r.description && <p className="text-xs text-white/45 line-clamp-2">{r.description}</p>}
                      <span className="text-xs text-emerald-400 capitalize mt-1 block">{r.category.replace('_', ' ')}</span>
                    </div>
                  ))}
                </div>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="glass-card p-10 text-center">
      <Search className="w-8 h-8 text-white/15 mx-auto mb-3" />
      <p className="text-white/40 text-sm">No {label} found matching your search.</p>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchResults />
    </Suspense>
  );
}
