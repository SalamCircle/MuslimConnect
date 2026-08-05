'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';
import type { PostWithAuthor, Profile } from '@/lib/types';
import { TrendingUp, UserPlus, MapPin, Heart, MessageSquare, ArrowRight, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import AdBanner from '@/components/feed/ad-banner';

export default function RightPanel() {
  const { user, profile } = useAuth();
  const [trending, setTrending] = useState<PostWithAuthor[]>([]);
  const [suggestions, setSuggestions] = useState<Profile[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [loadingSugg, setLoadingSugg] = useState(true);

  useEffect(() => {
    async function loadTrending() {
      const since = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('posts')
        .select('*, profiles!posts_user_id_fkey!left(id, full_name, avatar_url, city, region), communities!posts_community_id_fkey!left(id, name, category)')
        .gte('created_at', since)
        .order('like_count', { ascending: false })
        .limit(5);
      setTrending((data as unknown as PostWithAuthor[]) || []);
      setLoadingTrending(false);
    }

    async function loadSuggestions() {
      if (!user || !profile) { setLoadingSugg(false); return; }
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user.id)
        .eq('city', profile.city ?? '')
        .order('last_seen', { ascending: false })
        .limit(4);
      setSuggestions((data as Profile[]) || []);
      setLoadingSugg(false);
    }

    loadTrending();
    loadSuggestions();
  }, [user, profile]);

  return (
    <div className="space-y-4">
      {/* Trending discussions */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-gradient-brand flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-3.5 h-3.5 text-white" />
          </div>
          <h3 className="text-sm font-semibold text-white">Trending</h3>
        </div>

        {loadingTrending ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-3 bg-white/10 rounded w-full mb-1.5" />
                <div className="h-2 bg-white/10 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : trending.length === 0 ? (
          <p className="text-xs text-white/30 text-center py-3">No trending posts yet.</p>
        ) : (
          <div className="space-y-3">
            {trending.map((post, i) => (
              <div key={post.id} className="group">
                <div className="flex gap-2.5">
                  <span className="text-xs font-bold text-white/20 w-4 flex-shrink-0 pt-0.5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/75 leading-relaxed line-clamp-2 group-hover:text-white transition-colors">
                      {post.content}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-white/30">
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />{post.like_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />{post.comment_count}
                      </span>
                      <span className="flex items-center gap-1 ml-auto">
                        <MapPin className="w-3 h-3" />
                        {post.profiles?.city || post.profiles?.region || '—'}
                      </span>
                    </div>
                  </div>
                </div>
                {i < trending.length - 1 && <div className="mt-3 border-t border-white/[0.05]" />}
              </div>
            ))}
          </div>
        )}

        <Link
          href="/dashboard/feed"
          className="flex items-center justify-center gap-1.5 mt-4 text-xs text-emerald-400/70 hover:text-emerald-400 transition-colors"
        >
          See all discussions <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Suggested connections */}
      {profile?.city && (
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/15 flex items-center justify-center flex-shrink-0">
              <UserPlus className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">People Nearby</h3>
              <p className="text-xs text-white/35">{profile.city}</p>
            </div>
          </div>

          {loadingSugg ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="flex gap-2.5 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex-shrink-0" />
                  <div className="flex-1 space-y-1.5 py-1">
                    <div className="h-3 bg-white/10 rounded w-2/3" />
                    <div className="h-2 bg-white/10 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : suggestions.length === 0 ? (
            <p className="text-xs text-white/30 text-center py-3">No members found nearby.</p>
          ) : (
            <div className="space-y-2.5">
              {suggestions.map((m) => {
                const initials = m.full_name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() ?? '?';
                return (
                  <Link key={m.id} href={`/dashboard/profile/${m.id}`}>
                    <div className="flex items-center gap-2.5 group hover:bg-white/5 rounded-lg px-1 py-1 -mx-1 transition-colors">
                      <div className="relative flex-shrink-0">
                        <div className="w-9 h-9 rounded-full bg-gradient-brand flex items-center justify-center text-xs font-bold text-white">
                          {initials}
                        </div>
                        {m.is_online && (
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#070707]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white/80 group-hover:text-white transition-colors truncate">{m.full_name}</p>
                        <p className="text-xs text-white/35 truncate">{m.city || m.region}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          <Link
            href="/dashboard/connect"
            className="flex items-center justify-center gap-1.5 mt-4 text-xs text-cyan-400/70 hover:text-cyan-400 transition-colors"
          >
            Find more connections <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* Communities widget */}
      <CommunityWidget userId={user?.id} />

      {/* Sidebar ad */}
      <AdBanner placement="sidebar" city={profile?.city} region={profile?.region} />

      {/* Footer links */}
      <div className="px-1">
        <p className="text-xs text-white/20 leading-relaxed">
          ConnectMuslim · Built for UK Muslims
        </p>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
          {['About', 'Help', 'Privacy', 'Terms'].map((l) => (
            <span key={l} className="text-xs text-white/20 hover:text-white/40 cursor-pointer transition-colors">{l}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function CommunityWidget({ userId }: { userId?: string }) {
  const [communities, setCommunities] = useState<Array<{ id: string; name: string; member_count: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    supabase
      .from('community_members')
      .select('communities!left(id, name, member_count)')
      .eq('user_id', userId)
      .limit(4)
      .then(({ data }) => {
        const comms = (data || []).map((r: { communities: unknown }) => r.communities).filter(Boolean) as Array<{ id: string; name: string; member_count: number }>;
        setCommunities(comms);
        setLoading(false);
      });
  }, [userId]);

  if (!loading && communities.length === 0) return null;

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
            <Users className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <h3 className="text-sm font-semibold text-white">Your Communities</h3>
        </div>
        <Link href="/dashboard/communities" className="text-xs text-emerald-400/60 hover:text-emerald-400 transition-colors">
          All
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <div key={i} className="h-7 bg-white/10 rounded-lg animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-0.5">
          {communities.map((c) => (
            <Link key={c.id} href={`/dashboard/communities/${c.id}`}
              className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/6 transition-colors group"
            >
              <span className="text-xs text-white/65 group-hover:text-white transition-colors truncate">{c.name}</span>
              <span className="text-xs text-white/25 flex-shrink-0 ml-2">{c.member_count}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
