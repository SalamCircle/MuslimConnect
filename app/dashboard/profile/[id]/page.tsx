'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';
import type { Profile, PostWithAuthor } from '@/lib/types';
import { MapPin, ArrowLeft, Calendar, Edit3, MessageSquare, UserPlus, UserCheck } from 'lucide-react';
import PostCard from '@/components/feed/post-card';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [messagingId, setMessagingId] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  const isOwnProfile = user?.id === id;

  useEffect(() => {
    async function load() {
      const [profileRes, postsRes, likesRes, savesRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
        supabase.from('posts')
          .select('*, profiles!posts_user_id_fkey!left(id, full_name, avatar_url, city, region), communities!posts_community_id_fkey!left(id, name, category)')
          .eq('user_id', id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(20),
        user ? supabase.from('post_likes').select('post_id').eq('user_id', user.id) : Promise.resolve({ data: [] }),
        user ? supabase.from('post_saves').select('post_id').eq('user_id', user.id) : Promise.resolve({ data: [] }),
      ]);
      setProfile(profileRes.data as Profile | null);
      setPosts((postsRes.data as unknown as PostWithAuthor[]) || []);
      setLikedIds(new Set(((likesRes.data || []) as { post_id: string }[]).map((r) => r.post_id)));
      setSavedIds(new Set(((savesRes.data || []) as { post_id: string }[]).map((r) => r.post_id)));
      setLoading(false);
    }
    if (id) load();
  }, [id, user]);

  useEffect(() => {
    if (!user || user.id === id) return;
    supabase
      .from('user_follows')
      .select('follower_id')
      .eq('follower_id', user.id)
      .eq('following_id', id)
      .maybeSingle()
      .then(({ data }) => setFollowing(!!data));
  }, [user, id]);

  async function toggleFollow() {
    if (!user || user.id === id) return;
    const next = !following;
    setFollowing(next);
    if (next) {
      await supabase.from('user_follows').insert({ follower_id: user.id, following_id: id });
    } else {
      await supabase.from('user_follows').delete().eq('follower_id', user.id).eq('following_id', id);
    }
  }

  function handleLikeToggle(postId: string, liked: boolean) {
    setLikedIds((prev) => { const n = new Set(prev); liked ? n.add(postId) : n.delete(postId); return n; });
  }
  function handleSaveToggle(postId: string, saved: boolean) {
    setSavedIds((prev) => { const n = new Set(prev); saved ? n.add(postId) : n.delete(postId); return n; });
  }

  async function handleSendMessage() {
    if (!user || !id) return;
    setMessagingId(id);
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .or(`and(participant_a_id.eq.${user.id},participant_b_id.eq.${id}),and(participant_a_id.eq.${id},participant_b_id.eq.${user.id})`)
      .maybeSingle();
    if (existing) {
      router.push(`/dashboard/messages/${existing.id}`);
    } else {
      const { data: created } = await supabase
        .from('conversations')
        .insert({ participant_a_id: user.id, participant_b_id: id })
        .select('id')
        .single();
      if (created) router.push(`/dashboard/messages/${created.id}`);
    }
    setMessagingId(null);
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="glass-card p-8 animate-pulse mb-6">
          <div className="flex gap-5">
            <div className="w-20 h-20 rounded-full bg-white/10 flex-shrink-0" />
            <div className="flex-1 space-y-3 py-2">
              <div className="h-5 bg-white/10 rounded w-1/3" />
              <div className="h-3 bg-white/10 rounded w-1/2" />
              <div className="h-3 bg-white/10 rounded w-2/3" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-8 text-center">
        <p className="text-white/40">Profile not found.</p>
      </div>
    );
  }

  const initials = profile.full_name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() ?? '?';

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      {!isOwnProfile && (
        <button onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      )}

      <div className="glass-card p-6 mb-6">
        <div className="flex items-start gap-5">
          <div className="w-20 h-20 rounded-full bg-gradient-brand flex items-center justify-center text-2xl font-bold text-white flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <h1 className="text-xl font-bold text-white">{profile.full_name}</h1>
                <p className="text-sm text-white/40 flex items-center gap-1.5 mt-0.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {[profile.city, profile.region, profile.country].filter(Boolean).join(', ')}
                </p>
              </div>
              {isOwnProfile && (
                <Link href="/dashboard/profile/edit" className="btn-ghost text-xs px-3 py-2 flex-shrink-0">
                  <Edit3 className="w-3.5 h-3.5" /> Edit
                </Link>
              )}
              {!isOwnProfile && user && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={toggleFollow}
                    className={cn(
                      'flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg font-semibold transition-all',
                      following
                        ? 'bg-white/8 text-white/70 hover:bg-white/12'
                        : 'btn-brand'
                    )}
                  >
                    {following
                      ? <><UserCheck className="w-3.5 h-3.5" /> Following</>
                      : <><UserPlus className="w-3.5 h-3.5" /> Follow</>
                    }
                  </button>
                  <button
                    onClick={handleSendMessage}
                    disabled={!!messagingId}
                    className="btn-ghost text-xs px-3 py-2"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    {messagingId ? '…' : 'Message'}
                  </button>
                </div>
              )}
            </div>
            {profile.bio && (
              <p className="text-sm text-white/60 leading-relaxed mb-3">{profile.bio}</p>
            )}
            <div className="flex items-center gap-4 text-xs text-white/35">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Joined {formatDistanceToNow(new Date(profile.created_at), { addSuffix: true })}
              </span>
              <span className={`flex items-center gap-1.5 ${profile.is_online ? 'text-emerald-400' : ''}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${profile.is_online ? 'bg-emerald-400' : 'bg-white/20'}`} />
                {profile.is_online ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-white/50 mb-4 uppercase tracking-wider">
          Posts · {posts.length}
        </h2>
        {posts.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <p className="text-white/35 text-sm">
              {isOwnProfile ? "You haven't posted anything yet." : 'No posts yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                likedByMe={likedIds.has(post.id)}
                savedByMe={savedIds.has(post.id)}
                onLikeToggle={handleLikeToggle}
                onSaveToggle={handleSaveToggle}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
