'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';
import { useAuthPrompt } from '@/components/auth-prompt-modal';
import PublicNav from '@/components/navigation/public-nav';
import type { PostWithAuthor, CommentWithAuthor } from '@/lib/types';
import { formatDistanceToNow, format } from 'date-fns';
import {
  Heart, MessageSquare, Bookmark, MapPin, ArrowLeft,
  Flag, Share2, Users, Globe
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const scopeBadge: Record<string, { label: string; cls: string }> = {
  area:   { label: 'Area',   cls: 'text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' },
  city:   { label: 'City',   cls: 'text-xs font-medium px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/20' },
  region: { label: 'Region', cls: 'text-xs font-medium px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20' },
  uk:     { label: 'UK',     cls: 'text-xs font-medium px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/20' },
  global: { label: 'Global', cls: 'text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20' },
};

export default function PostDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user, profile } = useAuth();
  const { prompt } = useAuthPrompt();

  const [post, setPost] = useState<PostWithAuthor | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('posts')
        .select('*, profiles!posts_user_id_fkey!left(id, full_name, avatar_url, city, region, username), communities!posts_community_id_fkey!left(id, name, category, slug)')
        .eq('slug', slug)
        .eq('status', 'active')
        .maybeSingle();

      if (error || !data) { setNotFound(true); setLoading(false); return; }
      const post = data as unknown as PostWithAuthor;
      setPost(post);
      setLikeCount(post.like_count);
      setLoading(false);

      // Load comments
      const { data: cmts } = await supabase
        .from('comments')
        .select('*, profiles(id, full_name, avatar_url)')
        .eq('post_id', post.id)
        .order('created_at', { ascending: true });
      setComments((cmts as CommentWithAuthor[]) || []);
    }
    load();
  }, [slug]);

  useEffect(() => {
    if (!user || !post) return;
    async function loadInteractions() {
      const [likeRes, saveRes] = await Promise.all([
        supabase.from('post_likes').select('post_id').eq('post_id', post!.id).eq('user_id', user!.id).maybeSingle(),
        supabase.from('post_saves').select('post_id').eq('post_id', post!.id).eq('user_id', user!.id).maybeSingle(),
      ]);
      setLiked(!!likeRes.data);
      setSaved(!!saveRes.data);
    }
    loadInteractions();
  }, [user, post]);

  async function toggleLike() {
    if (!user) { prompt('like'); return; }
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    if (next) {
      await supabase.from('post_likes').insert({ post_id: post!.id, user_id: user.id });
    } else {
      await supabase.from('post_likes').delete().eq('post_id', post!.id).eq('user_id', user.id);
    }
  }

  async function toggleSave() {
    if (!user) { prompt('save'); return; }
    const next = !saved;
    setSaved(next);
    if (next) {
      await supabase.from('post_saves').insert({ post_id: post!.id, user_id: user.id });
      toast.success('Post saved!');
    } else {
      await supabase.from('post_saves').delete().eq('post_id', post!.id).eq('user_id', user.id);
    }
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!user) { prompt('comment'); return; }
    if (!commentText.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from('comments').insert({
      post_id: post!.id,
      user_id: user.id,
      content: commentText.trim(),
    });
    if (error) {
      toast.error('Failed to post comment.');
    } else {
      setCommentText('');
      const { data } = await supabase
        .from('comments')
        .select('*, profiles(id, full_name, avatar_url)')
        .eq('post_id', post!.id)
        .order('created_at', { ascending: true });
      setComments((data as CommentWithAuthor[]) || []);
    }
    setSubmitting(false);
  }

  function sharePost() {
    if (navigator.share) {
      navigator.share({ title: post?.title || 'Post', url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied!');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505]">
        <PublicNav />
        <div className="max-w-2xl mx-auto px-4 pt-[76px] py-10 space-y-4">
          <div className="glass-card p-6 animate-pulse space-y-4">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-white/10 rounded w-1/3" />
                <div className="h-2 bg-white/10 rounded w-1/4" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-white/10 rounded w-full" />
              <div className="h-4 bg-white/10 rounded w-5/6" />
              <div className="h-4 bg-white/10 rounded w-4/5" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="min-h-screen bg-[#050505]">
        <PublicNav />
        <div className="max-w-2xl mx-auto px-4 pt-[76px] py-20 text-center">
          <Globe className="w-12 h-12 text-white/15 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Post not found</h1>
          <p className="text-white/40 text-sm mb-6">This post may have been removed or doesn't exist.</p>
          <Link href="/board" className="btn-brand text-sm px-5 py-2.5">Browse Community</Link>
        </div>
      </div>
    );
  }

  const author = post.profiles;
  const community = post.communities;
  const badge = scopeBadge[post.location_scope] ?? scopeBadge.global;
  const initials = author?.full_name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() ?? '?';
  const authorHref = author?.username ? `/user/${author.username}` : '#';

  return (
    <div className="min-h-screen bg-[#050505]">
      <PublicNav />

      <div className="max-w-2xl mx-auto px-4 pt-[76px] py-8">
        {/* Back */}
        <Link href="/board" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors mb-5">
          <ArrowLeft className="w-4 h-4" /> Back to Community
        </Link>

        {/* Post */}
        <article className="glass-card overflow-hidden mb-5">
          <div className="p-5 pb-4">
            {/* Author row */}
            <div className="flex items-start gap-3 mb-4">
              <Link href={authorHref} className="flex-shrink-0">
                <div className="w-11 h-11 rounded-full bg-gradient-brand flex items-center justify-center text-sm font-bold text-white hover:opacity-80 transition-opacity">
                  {initials}
                </div>
              </Link>
              <div className="flex-1 min-w-0">
                <Link href={authorHref}>
                  <span className="text-sm font-semibold text-white hover:text-emerald-400 transition-colors">
                    {author?.full_name ?? 'Community Member'}
                  </span>
                </Link>
                <div className="flex items-center gap-1.5 text-xs text-white/35 mt-0.5 flex-wrap">
                  {(author?.city || author?.region) && (
                    <><MapPin className="w-3 h-3" /><span>{author.city || author.region}</span><span>·</span></>
                  )}
                  <span>{format(new Date(post.created_at), 'dd MMM yyyy')}</span>
                  <span>·</span>
                  <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {community && (
                  <Link href={community.slug ? `/community/${community.slug}` : `/board`}>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25 transition-colors cursor-pointer">
                      {community.name}
                    </span>
                  </Link>
                )}
                <span className={badge.cls}>{badge.label}</span>
              </div>
            </div>

            {/* Title */}
            {post.title && (
              <h1 className="text-lg font-bold text-white mb-3 leading-snug">{post.title}</h1>
            )}

            {/* Content */}
            <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{post.content}</p>

            {/* Image */}
            {post.image_url && (
              <div className="mt-4 rounded-xl overflow-hidden">
                <img src={post.image_url} alt="Post image" className="w-full object-cover max-h-96" />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="px-5 py-3 border-t border-white/[0.05] flex items-center gap-0.5">
            <button
              onClick={toggleLike}
              className={cn(
                'flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg font-medium transition-all',
                liked ? 'text-rose-400 bg-rose-500/10' : 'text-white/40 hover:text-rose-400 hover:bg-rose-500/8'
              )}
            >
              <Heart className={cn('w-4 h-4', liked && 'fill-rose-400')} />
              {likeCount > 0 ? likeCount : ''} Like
            </button>
            <button
              onClick={() => !user && prompt('comment')}
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg font-medium text-white/40 hover:text-white/70 hover:bg-white/6 transition-all"
            >
              <MessageSquare className="w-4 h-4" />
              {comments.length > 0 ? comments.length : ''} Comment
            </button>
            <button
              onClick={sharePost}
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg font-medium text-white/40 hover:text-white/70 hover:bg-white/6 transition-all"
            >
              <Share2 className="w-4 h-4" /> Share
            </button>
            <button
              onClick={toggleSave}
              className={cn(
                'flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg font-medium transition-all ml-auto',
                saved ? 'text-amber-400 bg-amber-500/10' : 'text-white/40 hover:text-amber-400 hover:bg-amber-500/8'
              )}
            >
              <Bookmark className={cn('w-4 h-4', saved && 'fill-amber-400')} />
              {saved ? 'Saved' : 'Save'}
            </button>
          </div>
        </article>

        {/* Comments */}
        <div className="glass-card overflow-hidden">
          <div className="p-5 border-b border-white/[0.05]">
            <h2 className="text-sm font-semibold text-white">
              {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
            </h2>
          </div>

          <div className="p-5 space-y-4">
            {/* Comment form */}
            {user ? (
              <form onSubmit={submitComment} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                  {profile?.full_name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 flex gap-2">
                  <input
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write a comment…"
                    className="field-input text-sm py-2 flex-1 rounded-xl"
                  />
                  <button
                    type="submit"
                    disabled={!commentText.trim() || submitting}
                    className="btn-brand text-xs px-4 py-2 rounded-xl flex-shrink-0"
                  >
                    {submitting ? '…' : 'Post'}
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => prompt('comment')}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4 text-white/30" />
                </div>
                <span className="text-sm text-white/40">Join to leave a comment…</span>
              </button>
            )}

            {/* Comment list */}
            {comments.length === 0 ? (
              <p className="text-sm text-white/30 text-center py-4">No comments yet — be first!</p>
            ) : (
              <div className="space-y-3 mt-2">
                {comments.map((c) => {
                  const cInitials = c.profiles?.full_name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() ?? '?';
                  return (
                    <div key={c.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                        {cInitials}
                      </div>
                      <div className="flex-1 bg-white/[0.03] rounded-xl px-3.5 py-2.5">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-xs font-semibold text-white">{c.profiles?.full_name ?? 'User'}</span>
                          <span className="text-xs text-white/25">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                        </div>
                        <p className="text-sm text-white/70 leading-relaxed">{c.content}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Report link */}
        {user && (
          <div className="mt-3 text-center">
            <button
              onClick={async () => {
                if (!user) return;
                await supabase.from('reports').insert({ reporter_id: user.id, content_type: 'post', content_id: post.id, reason: 'other' });
                toast.success('Report submitted. Thank you.');
              }}
              className="text-xs text-white/20 hover:text-rose-400 transition-colors flex items-center gap-1 mx-auto"
            >
              <Flag className="w-3 h-3" /> Report post
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
