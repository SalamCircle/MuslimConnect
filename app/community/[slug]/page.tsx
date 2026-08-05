'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';
import { useAuthPrompt } from '@/components/auth-prompt-modal';
import PublicNav from '@/components/navigation/public-nav';
import type { Community, PostWithAuthor } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import {
  ArrowLeft, Users, UserPlus, Heart, MessageSquare,
  Globe, Layers, Lock
} from 'lucide-react';
import { cn } from '@/lib/utils';

const categoryIcons: Record<string, string> = {
  students: '🎓', business: '💼', reverts: '🌙', technology: '💻',
  parenting: '👨‍👩‍👧', islamic_studies: '📖', brothers: '🤝',
  sisters: '💜', youth: '⚡', professionals: '🏢', general: '🌐',
};

export default function PublicCommunityPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const { prompt } = useAuthPrompt();

  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [joining, setJoining] = useState(false);
  const [memberCount, setMemberCount] = useState(0);

  useEffect(() => {
    async function load() {
      const { data: comm, error } = await supabase
        .from('communities')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (error || !comm) { setNotFound(true); setLoading(false); return; }
      setCommunity(comm as Community);
      setMemberCount((comm as Community).member_count);

      if (!(comm as Community).is_public) { setLoading(false); return; }

      const { data: postsData } = await supabase
        .from('posts')
        .select('*, profiles!posts_user_id_fkey!left(id, full_name, avatar_url, city, region, username), communities!posts_community_id_fkey!left(id, name, category, slug)')
        .eq('community_id', comm.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(30);

      setPosts((postsData as unknown as PostWithAuthor[]) || []);
      setLoading(false);
    }
    load();
  }, [slug]);

  useEffect(() => {
    if (!user || !community) return;
    supabase
      .from('community_members')
      .select('community_id')
      .eq('community_id', community.id)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setIsMember(!!data));
  }, [user, community]);

  async function toggleMembership() {
    if (!user) { prompt('join'); return; }
    setJoining(true);
    if (isMember) {
      await supabase.from('community_members').delete().eq('community_id', community!.id).eq('user_id', user.id);
      setIsMember(false);
      setMemberCount((c) => Math.max(c - 1, 0));
    } else {
      await supabase.from('community_members').insert({ community_id: community!.id, user_id: user.id, role: 'member' });
      setIsMember(true);
      setMemberCount((c) => c + 1);
    }
    setJoining(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505]">
        <PublicNav />
        <div className="max-w-2xl mx-auto px-4 pt-[76px] py-10">
          <div className="glass-card p-6 animate-pulse space-y-4">
            <div className="flex gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex-shrink-0" />
              <div className="flex-1 space-y-3">
                <div className="h-4 bg-white/10 rounded w-1/3" />
                <div className="h-3 bg-white/10 rounded w-1/2" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !community) {
    return (
      <div className="min-h-screen bg-[#050505]">
        <PublicNav />
        <div className="max-w-2xl mx-auto px-4 pt-[76px] py-20 text-center">
          <Globe className="w-12 h-12 text-white/15 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Community not found</h1>
          <p className="text-white/40 text-sm mb-6">This community doesn't exist or has been removed.</p>
          <Link href="/communities" className="btn-brand text-sm px-5 py-2.5">Browse Communities</Link>
        </div>
      </div>
    );
  }

  const icon = categoryIcons[community.category] ?? '🌐';

  return (
    <div className="min-h-screen bg-[#050505]">
      <PublicNav />

      <div className="max-w-2xl mx-auto px-4 pt-[76px] py-8">
        <Link href="/communities" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors mb-5">
          <ArrowLeft className="w-4 h-4" /> All Communities
        </Link>

        {/* Community header */}
        <div className="glass-card p-6 mb-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/20 flex items-center justify-center text-2xl flex-shrink-0">
              {icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-lg font-bold text-white leading-tight">{community.name}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-white/35 capitalize">{community.category.replace('_', ' ')}</span>
                    <span className="text-white/20">·</span>
                    {community.is_public
                      ? <span className="flex items-center gap-1 text-xs text-white/35"><Globe className="w-3 h-3" /> Public</span>
                      : <span className="flex items-center gap-1 text-xs text-white/35"><Lock className="w-3 h-3" /> Private</span>
                    }
                  </div>
                </div>
                <button
                  onClick={toggleMembership}
                  disabled={joining}
                  className={cn(
                    'flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg font-semibold transition-all flex-shrink-0',
                    isMember
                      ? 'bg-white/8 text-white/70 hover:bg-white/12'
                      : 'bg-emerald-500 text-white hover:bg-emerald-400'
                  )}
                >
                  {isMember
                    ? <><Layers className="w-3.5 h-3.5" /> Joined</>
                    : <><UserPlus className="w-3.5 h-3.5" /> Join</>
                  }
                </button>
              </div>

              {community.description && (
                <p className="text-sm text-white/60 mt-2 leading-relaxed">{community.description}</p>
              )}

              <div className="flex gap-5 mt-3">
                <div>
                  <span className="text-sm font-bold text-emerald-400">{memberCount.toLocaleString()}</span>
                  <span className="text-xs text-white/35 ml-1">Members</span>
                </div>
                <div>
                  <span className="text-sm font-bold text-emerald-400">{community.post_count}</span>
                  <span className="text-xs text-white/35 ml-1">Posts</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Private community */}
        {!community.is_public && (
          <div className="glass-card p-10 text-center">
            <Lock className="w-8 h-8 text-white/15 mx-auto mb-3" />
            <p className="text-white/50 font-medium mb-1">Private Community</p>
            <p className="text-white/30 text-sm mb-4">Join to see posts and participate.</p>
            <button onClick={toggleMembership} className="btn-brand text-sm px-5 py-2.5">
              {user ? 'Join Community' : 'Sign in to Join'}
            </button>
          </div>
        )}

        {/* Posts */}
        {community.is_public && (
          <>
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">Posts</h2>
            {posts.length === 0 ? (
              <div className="glass-card p-10 text-center">
                <MessageSquare className="w-8 h-8 text-white/15 mx-auto mb-3" />
                <p className="text-white/40 text-sm">No posts yet.</p>
                {!user && (
                  <button onClick={() => prompt('post')} className="btn-brand text-sm px-5 py-2.5 mt-4">Join to post</button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {posts.map((post) => {
                  const author = post.profiles;
                  const postHref = post.slug ? `/post/${post.slug}` : '#';
                  const authorHref = author?.username ? `/user/${author.username}` : '#';
                  const initials = author?.full_name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() ?? '?';
                  return (
                    <article key={post.id} className="glass-card overflow-hidden hover:border-white/10 transition-colors">
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Link href={authorHref}>
                            <div className="w-7 h-7 rounded-full bg-gradient-brand flex items-center justify-center text-xs font-bold text-white hover:opacity-80 transition-opacity">
                              {initials}
                            </div>
                          </Link>
                          <div className="flex items-center gap-1.5 text-xs text-white/40">
                            <Link href={authorHref} className="font-medium text-white/70 hover:text-emerald-400 transition-colors">
                              {author?.full_name ?? 'Community Member'}
                            </Link>
                            <span>·</span>
                            <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                          </div>
                        </div>

                        {post.title && (
                          <Link href={postHref}>
                            <h3 className="text-sm font-semibold text-white hover:text-emerald-400 transition-colors mb-1">{post.title}</h3>
                          </Link>
                        )}
                        <Link href={postHref}>
                          <p className="text-sm text-white/65 leading-relaxed line-clamp-3">{post.content}</p>
                        </Link>

                        <div className="flex items-center gap-3 mt-2.5 text-xs text-white/30">
                          <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {post.like_count}</span>
                          <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {post.comment_count}</span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
