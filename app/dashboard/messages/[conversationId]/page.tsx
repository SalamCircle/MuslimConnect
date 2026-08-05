'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';
import type { Message, Profile } from '@/lib/types';
import { Send, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateDivider(ts: string) {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function ConversationPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [other, setOther] = useState<Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'is_online'> | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  async function loadConversation() {
    if (!user || !conversationId) return;
    const [msgRes, convRes] = await Promise.all([
      supabase.from('messages').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: true }),
      supabase.from('conversations').select(`
        participant_a_id, participant_b_id,
        profile_a:profiles!conversations_participant_a_id_fkey(id, full_name, avatar_url, is_online),
        profile_b:profiles!conversations_participant_b_id_fkey(id, full_name, avatar_url, is_online)
      `).eq('id', conversationId).maybeSingle(),
    ]);
    setMessages((msgRes.data as Message[]) || []);
    if (convRes.data) {
      const isA = (convRes.data as any).participant_a_id === user.id;
      setOther(isA ? (convRes.data as any).profile_b : (convRes.data as any).profile_a);
    }
    setLoading(false);

    // Mark messages as read
    if (convRes.data) {
      const field = (convRes.data as any).participant_a_id === user.id ? 'unread_count_a' : 'unread_count_b';
      await supabase.from('conversations').update({ [field]: 0 }).eq('id', conversationId);
    }
  }

  useEffect(() => { loadConversation(); }, [conversationId, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Realtime — deduplicate against optimistic messages already in state
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const incoming = payload.new as Message;
          setMessages((prev) => {
            // Drop if already present (optimistic or duplicate event)
            if (prev.some((m) => m.id === incoming.id)) return prev;
            // Replace matching optimistic placeholder (same sender + content + no real id prefix)
            const idx = prev.findIndex(
              (m) => m.id.startsWith('optimistic-') && m.sender_id === incoming.sender_id && m.content === incoming.content
            );
            if (idx !== -1) {
              const next = [...prev];
              next[idx] = incoming;
              return next;
            }
            return [...prev, incoming];
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || !user || !conversationId) return;

    // Clear input immediately
    setInput('');
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    // Optimistic update — message appears instantly
    const optimisticId = `optimistic-${Date.now()}`;
    const optimistic: Message = {
      id: optimisticId,
      conversation_id: conversationId,
      sender_id: user.id,
      content: text,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    // Fire insert — DB trigger handles last_message + unread_count update
    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: text,
    });

    if (error) {
      // Roll back the optimistic message
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setInput(text);
    }

    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e as any);
    }
  }

  const initials = other?.full_name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() ?? '?';

  let lastDate = '';

  if (loading) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="h-[60px] border-b border-white/[0.06] flex items-center px-5 gap-3 animate-pulse">
          <div className="w-8 h-8 rounded-full bg-white/10" />
          <div className="h-4 bg-white/10 rounded w-32" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="h-[60px] border-b border-white/[0.06] flex items-center px-5 gap-3 flex-shrink-0 bg-[#070707]">
        <Link href="/dashboard/messages" className="md:hidden text-white/40 hover:text-white/70 mr-1">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="relative flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center text-xs font-bold text-white">
            {initials}
          </div>
          {other?.is_online && (
            <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 border-2 border-[#070707]" />
          )}
        </div>
        <div>
          <Link href={other ? `/dashboard/profile/${other.id}` : '#'} className="text-sm font-semibold text-white hover:text-emerald-400 transition-colors">
            {other?.full_name ?? 'Unknown'}
          </Link>
          <p className="text-xs text-white/30">{other?.is_online ? 'Online' : 'Offline'}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1 scrollbar-hide">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center pb-8">
            <p className="text-sm text-white/25">No messages yet. Say salaam!</p>
          </div>
        )}
        {messages.map((msg) => {
          const isMine = msg.sender_id === user?.id;
          const isOptimistic = msg.id.startsWith('optimistic-');
          const dateStr = formatDateDivider(msg.created_at);
          const showDivider = dateStr !== lastDate;
          lastDate = dateStr;
          return (
            <div key={msg.id}>
              {showDivider && (
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-white/[0.05]" />
                  <span className="text-xs text-white/20">{dateStr}</span>
                  <div className="flex-1 h-px bg-white/[0.05]" />
                </div>
              )}
              <div className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[70%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed transition-opacity',
                    isMine
                      ? 'bg-emerald-600/80 text-white rounded-br-sm'
                      : 'bg-white/[0.07] text-white/85 rounded-bl-sm',
                    isOptimistic && 'opacity-70'
                  )}
                >
                  <p>{msg.content}</p>
                  <p className={cn('text-[10px] mt-1', isMine ? 'text-white/50 text-right' : 'text-white/25')}>
                    {formatTime(msg.created_at)}
                    {isOptimistic && <span className="ml-1">·</span>}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="flex-shrink-0 px-4 py-3 border-t border-white/[0.06] bg-[#070707]">
        <div className="flex items-end gap-2 glass-card px-3 py-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            rows={1}
            className="flex-1 bg-transparent text-sm text-white placeholder-white/25 resize-none outline-none py-1 scrollbar-hide"
            style={{ maxHeight: '120px' }}
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className={cn(
              'w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all',
              input.trim() ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-white/5 text-white/20 cursor-not-allowed'
            )}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-[10px] text-white/20 mt-1 px-1">Enter to send · Shift+Enter for new line</p>
      </form>
    </div>
  );
}
