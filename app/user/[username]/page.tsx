'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';
import { useAuthPrompt } from '@/components/auth-prompt-modal';
import PublicNav from '@/components/navigation/public-nav';
import type { Profile, PostWithAuthor } from '@/lib/types';
import { formatDistanceToNow, format } from 'date-fns';
import {
  MapPin, ArrowLeft, UserPlus, UserCheck, Globe,
  MessageSquare, Heart, Calendar, Users
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const { prompt } = useAuthPrompt();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);

  useEffect(() => {
    async function load() {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .maybeSingle();

      if (error || !profileData) { setNotFound(true); setLoading(false); return; }
      setProfile(profileData as Profile);
      setFollowerCount((profileData as Profile).followers_count ?? 0);

      const { data: postsData } = await supabase
        .from('posts')
        .select('*, profiles!posts_user_id_fkey!left(id, full_name, avatar_url, city, region, username), communities!posts_community_id_fkey!left(id, name, category, slug)')
        .eq('user_id', profileData.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(20);

      setPosts((postsData as unknown as PostWithAuthor[]) || []);
      setLoading(false);
    }
    load();
  }, [username]);

  useEffect(() => {
    if (!user || !profile) return;
    supabase
      .from('user_follows')
      .select('follower_id')
      .eq('follower_id', user.id)
      .eq('following_id', profile.id)
      .maybeSingle()
      .then(({ data }) => setFollowing(!!data));
  }, [user, profile]);

  async function toggleFollow() {
    if (!user) { prompt('join'); return; }
    if (user.id === profile?.id) return;
    const next = !following;
    setFollowing(next);
    setFollowerCount((c) => c + (next ? 1 : -1));
    if (next) {
      await supabase.from('user_follows').insert({ follower_id: user.id, following_id: profile!.id });
    } else {
      await supabase.from('user_follows').delete().eq('follower_id', user.id).eq('following_id', profile!.id);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505]">
        <PublicNav />
        <div className="max-w-2xl mx-auto px-4 pt-[76px] py-10">
          <div className="glass-card p-6 animate-pulse">
            <div className="flex gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-white/10 flex-shrink-0" />
              <div className="flex-1 space-y-3">
                <div className="h-4 bg-white/10 rounded w-1/3" />
                <div className="h-3 bg-white/10 rounded w-1/4" />
                <div className="h-3 bg-white/10 rounded w-1/2" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-[#050505]">
        <PublicNav />
        <div className="max-w-2xl mx-auto px-4 pt-[76px] py-20 text-center">
          <Globe className="w-12 h-12 text-white/15 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Profile not found</h1>
          <p className="text-white/40 text-sm mb-6">This user doesn't exist or has deactivated their account.</p>
          <Link href="/board" className="btn-brand text-sm px-5 py-2.5">Browse Community</Link>
        </div>
      </div>
    );
  }

  const initials = profile.full_name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() ?? '?';
  const isOwnProfile = user?.id === profile.id;

  return (
    <div className="min-h-screen bg-[#050505]">
      <PublicNav />

      <div className="max-w-2xl mx-auto px-4 pt-[76px] py-8">
        <Link href="/board" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors mb-5">
          <ArrowLeft className="w-4 h-4" /> Back to Community
        </Link>

        {/* Profile card */}
        <div className="glass-card p-6 mb-5">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-brand flex items-center justify-center text-xl font-bold text-white flex-shrink-0 glow-sm">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-lg font-bold text-white leading-tight">{profile.full_name}</h1>
                  <p className="text-sm text-white/40">@{profile.username}</p>
                </div>
                {!isOwnProfile && (
                  <button
                    onClick={toggleFollow}
                    className={cn(
                      'flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg font-semibold transition-all flex-shrink-0',
                      following
                        ? 'bg-white/8 text-white/70 hover:bg-white/12'
                        : 'bg-emerald-500 text-white hover:bg-emerald-400'
                    )}
                  >
                    {following
                      ? <><UserCheck className="w-3.5 h-3.5" /> Following</>
                      : <><UserPlus className="w-3.5 h-3.5" /> Follow</>
                    }
                  </button>
                )}
                {isOwnProfile && (
                  <Link href="/dashboard/profile/edit" className="btn-ghost text-xs px-3 py-1.5 flex-shrink-0">
                    Edit Profile
                  </Link>
                )}
              </div>

              {profile.bio && (
                <p className="text-sm text-white/65 mt-2 leading-relaxed">{profile.bio}</p>
              )}

              <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-white/35">
                {(profile.city || profile.country) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {[profile.city, profile.country].filter(Boolean).join(', ')}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Joined {format(new Date(profile.created_at), 'MMMM yyyy')}
                </span>
              </div>

              <div className="flex gap-5 mt-3">
                <div>
                  <span className="text-sm font-bold text-emerald-400">{followerCount}</span>
                  <span className="text-xs text-white/35 ml-1">Followers</span>
                </div>
                <div>
                  <span className="text-sm font-bold text-emerald-400">{profile.following_count ?? 0}</span>
                  <span className="text-xs text-white/35 ml-1">Following</span>
                </div>
                <div>
                  <span className="text-sm font-bold text-emerald-400">{posts.length}</span>
                  <span className="text-xs text-white/35 ml-1">Posts</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Posts */}
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">Posts</h2>

        {posts.length === 0 ? (
          <div className="glass-card p-10 text-center">
            <MessageSquare className="w-8 h-8 text-white/15 mx-auto mb-3" />
            <p className="text-white/40 text-sm">No posts yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => {
              const postHref = post.slug ? `/post/${post.slug}` : '#';
              const communityHref = post.communities?.slug
                ? `/community/${post.communities.slug}`
                : '/board';
              return (
                <article key={post.id} className="glass-card overflow-hidden hover:border-white/10 transition-colors">
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 text-xs text-white/35">
                        {post.communities && (
                          <><Link href={communityHref} className="text-emerald-400 hover:underline">{post.communities.name}</Link><span>·</span></>
                        )}
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
                    <div className="flex items-center gap-3 mt-2 text-xs text-white/30">
                      <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {post.like_count}</span>
                      <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {post.comment_count}</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
