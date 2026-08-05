'use client';

import { useState, useRef, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Heart, MessageSquare, Bookmark, MapPin, Flag, Share2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';
import { useAuthPrompt } from '@/components/auth-prompt-modal';
import type { PostWithAuthor, CommentWithAuthor } from '@/lib/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface PostCardProps {
  post: PostWithAuthor;
  likedByMe: boolean;
  savedByMe: boolean;
  onLikeToggle: (postId: string, liked: boolean) => void;
  onSaveToggle: (postId: string, saved: boolean) => void;
}

const scopeBadge: Record<string, { label: string; cls: string }> = {
  area:   { label: 'Area',   cls: 'badge-emerald' },
  city:   { label: 'City',   cls: 'badge-cyan' },
  region: { label: 'Region', cls: 'badge-blue' },
  uk:     { label: 'UK',     cls: 'badge-violet' },
  global: { label: 'Global', cls: 'badge-amber' },
};

export default function PostCard({ post, likedByMe, savedByMe, onLikeToggle, onSaveToggle }: PostCardProps) {
  const { user, profile } = useAuth();
  const { prompt } = useAuthPrompt();
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [localLiked, setLocalLiked] = useState(likedByMe);
  const [localLikeCount, setLocalLikeCount] = useState(post.like_count);
  const [localSaved, setLocalSaved] = useState(savedByMe);
  const [showReportMenu, setShowReportMenu] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const reportReasons = [
    { value: 'spam',           label: 'Spam' },
    { value: 'harassment',     label: 'Harassment' },
    { value: 'offensive',      label: 'Offensive Content' },
    { value: 'misinformation', label: 'Misinformation' },
    { value: 'other',          label: 'Other' },
  ] as const;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (reportRef.current && !reportRef.current.contains(e.target as Node)) {
        setShowReportMenu(false);
      }
    }
    if (showReportMenu) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showReportMenu]);

  async function submitReport(reason: typeof reportReasons[number]['value']) {
    if (!user) { prompt('generic'); return; }
    setReportSubmitting(true);
    setShowReportMenu(false);
    const { error } = await supabase.from('reports').insert({
      reporter_id: user.id,
      content_type: 'post',
      content_id: post.id,
      reason,
    });
    if (error) {
      toast.error('Failed to submit report');
    } else {
      toast.success('Report submitted. Thank you.');
    }
    setReportSubmitting(false);
  }

  async function toggleLike() {
    if (!user) { prompt('like'); return; }
    const next = !localLiked;
    setLocalLiked(next);
    setLocalLikeCount((c) => c + (next ? 1 : -1));
    onLikeToggle(post.id, next);
    if (next) {
      await supabase.from('post_likes').insert({ post_id: post.id, user_id: user.id });
    } else {
      await supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', user.id);
    }
  }

  async function toggleSave() {
    if (!user) { prompt('save'); return; }
    const next = !localSaved;
    setLocalSaved(next);
    onSaveToggle(post.id, next);
    if (next) {
      await supabase.from('post_saves').insert({ post_id: post.id, user_id: user.id });
      toast.success('Post saved!');
    } else {
      await supabase.from('post_saves').delete().eq('post_id', post.id).eq('user_id', user.id);
    }
  }

  function sharePost() {
    const url = post.slug ? `${window.location.origin}/post/${post.slug}` : window.location.href;
    if (navigator.share) {
      navigator.share({ url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Link copied!');
    }
  }

  async function loadComments() {
    if (showComments) { setShowComments(false); return; }
    setLoadingComments(true);
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(id, full_name, avatar_url)')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true });
    setComments((data as CommentWithAuthor[]) || []);
    setShowComments(true);
    setLoadingComments(false);
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!user) { prompt('comment'); return; }
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    const { error } = await supabase.from('comments').insert({
      post_id: post.id,
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
        .eq('post_id', post.id)
        .order('created_at', { ascending: true });
      setComments((data as CommentWithAuthor[]) || []);
    }
    setSubmittingComment(false);
  }

  const author = post.profiles;
  const community = post.communities;
  const badge = scopeBadge[post.location_scope] ?? scopeBadge.global;
  const authorInitials = author?.full_name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() ?? '?';
  const authorHref = author?.username ? `/user/${author.username}` : (author?.id ? `/dashboard/profile/${author.id}` : '#');
  const communityHref = community?.slug ? `/community/${community.slug}` : (community?.id ? `/dashboard/communities/${community.id}` : '#');
  const postHref = post.slug ? `/post/${post.slug}` : '#';

  return (
    <article className="glass-card overflow-hidden">
      {/* Card header */}
      <div className="p-4 pb-3">
        <div className="flex items-start gap-3">
          <Link href={authorHref} className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-brand flex items-center justify-center text-sm font-bold text-white hover:opacity-80 transition-opacity">
              {authorInitials}
            </div>
          </Link>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <Link href={authorHref}>
                  <span className="text-sm font-semibold text-white hover:text-emerald-400 transition-colors">
                    {author?.full_name ?? 'Unknown'}
                  </span>
                </Link>
                <div className="flex items-center gap-1.5 text-xs text-white/35 mt-0.5 flex-wrap">
                  {(author?.city || author?.region) && (
                    <>
                      <MapPin className="w-3 h-3" />
                      <span>{author.city || author.region}</span>
                      <span>·</span>
                    </>
                  )}
                  <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {community && (
                  <Link href={communityHref}>
                    <span className="badge-emerald text-xs hover:bg-emerald-500/20 transition-colors cursor-pointer">
                      {community.name}
                    </span>
                  </Link>
                )}
                <span className={cn('text-xs', badge.cls)}>{badge.label}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <Link href={postHref}>
          <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap hover:text-white/95 transition-colors">{post.content}</p>
        </Link>
        {post.image_url && (
          <Link href={postHref}>
            <img src={post.image_url} alt="Post" className="mt-3 rounded-xl w-full object-cover max-h-64" />
          </Link>
        )}
      </div>

      {/* Actions bar */}
      <div className="px-4 py-2.5 border-t border-white/[0.05] flex items-center gap-0.5">
        {/* Like */}
        <button
          onClick={toggleLike}
          className={cn(
            'flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg font-medium transition-all',
            localLiked
              ? 'text-rose-400 bg-rose-500/10'
              : 'text-white/40 hover:text-white/70 hover:bg-white/6'
          )}
        >
          <Heart className={cn('w-4 h-4', localLiked && 'fill-rose-400')} />
          <span>{localLikeCount > 0 ? localLikeCount : ''}</span>
          <span className="hidden sm:inline">{localLiked ? 'Liked' : 'Like'}</span>
        </button>

        {/* Comment */}
        <button
          onClick={user ? loadComments : () => prompt('comment')}
          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg font-medium text-white/40 hover:text-white/70 hover:bg-white/6 transition-all"
        >
          <MessageSquare className="w-4 h-4" />
          <span>{post.comment_count > 0 ? post.comment_count : ''}</span>
          <span className="hidden sm:inline">Comment</span>
        </button>

        {/* Share */}
        <button
          onClick={sharePost}
          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg font-medium text-white/40 hover:text-white/70 hover:bg-white/6 transition-all"
        >
          <Share2 className="w-4 h-4" />
        </button>

        {/* Save — pushed right */}
        <button
          onClick={toggleSave}
          className={cn(
            'flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg font-medium transition-all ml-auto',
            localSaved
              ? 'text-amber-400 bg-amber-500/10'
              : 'text-white/40 hover:text-white/70 hover:bg-white/6'
          )}
        >
          <Bookmark className={cn('w-4 h-4', localSaved && 'fill-amber-400')} />
          <span className="hidden sm:inline">{localSaved ? 'Saved' : 'Save'}</span>
        </button>

        {/* Report */}
        {user && (
          <div className="relative" ref={reportRef}>
            <button
              onClick={() => setShowReportMenu((v) => !v)}
              disabled={reportSubmitting}
              className="flex items-center gap-1.5 text-xs px-2 py-2 rounded-lg font-medium text-white/25 hover:text-rose-400 hover:bg-rose-500/8 transition-all"
              title="Report"
            >
              <Flag className="w-3.5 h-3.5" />
            </button>
            {showReportMenu && (
              <div className="absolute right-0 bottom-full mb-1 w-44 bg-[#111] border border-white/[0.08] rounded-xl shadow-xl z-50 overflow-hidden">
                <p className="px-3 py-2 text-xs font-semibold text-white/35 uppercase tracking-wider border-b border-white/[0.06]">Report reason</p>
                {reportReasons.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => submitReport(value)}
                    className="w-full text-left px-3 py-2.5 text-xs text-white/70 hover:text-white hover:bg-white/6 transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Comments section */}
      {showComments && (
        <div className="border-t border-white/[0.05] bg-white/[0.015]">
          <div className="p-4 space-y-3">
            {loadingComments ? (
              <div className="text-xs text-white/30 text-center py-2">Loading comments…</div>
            ) : comments.length === 0 ? (
              <p className="text-xs text-white/30 text-center py-2">No comments yet — be first!</p>
            ) : (
              comments.map((c) => {
                const cInitials = c.profiles?.full_name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() ?? '?';
                return (
                  <div key={c.id} className="flex gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-gradient-brand flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                      {cInitials}
                    </div>
                    <div className="flex-1 min-w-0 bg-white/[0.04] rounded-xl px-3 py-2">
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="text-xs font-semibold text-white">{c.profiles?.full_name ?? 'User'}</span>
                        <span className="text-xs text-white/25">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                      </div>
                      <p className="text-xs text-white/65 leading-relaxed">{c.content}</p>
                    </div>
                  </div>
                );
              })
            )}

            {user ? (
              <form onSubmit={submitComment} className="flex gap-2.5 mt-1">
                <div className="w-7 h-7 rounded-full bg-gradient-brand flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                  {profile?.full_name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 flex gap-2">
                  <input
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write a comment…"
                    className="field-input text-xs py-2 flex-1 rounded-xl"
                  />
                  <button
                    type="submit"
                    disabled={!commentText.trim() || submittingComment}
                    className="btn-brand text-xs px-3 py-2 rounded-xl"
                  >
                    {submittingComment ? '…' : 'Send'}
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => prompt('comment')}
                className="w-full text-xs text-white/35 hover:text-white/60 transition-colors py-2 text-center"
              >
                Sign in to comment…
              </button>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

