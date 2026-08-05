'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';
import type { ConversationWithOther } from '@/lib/types';
import { MessageSquare, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [conversations, setConversations] = useState<ConversationWithOther[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  async function loadConversations() {
    if (!user) return;
    const { data } = await supabase
      .from('conversations')
      .select(`
        *,
        profile_a:profiles!conversations_participant_a_id_fkey(id, full_name, avatar_url, is_online),
        profile_b:profiles!conversations_participant_b_id_fkey(id, full_name, avatar_url, is_online)
      `)
      .or(`participant_a_id.eq.${user.id},participant_b_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false });

    const mapped: ConversationWithOther[] = ((data as any[]) || []).map((c) => {
      const isA = c.participant_a_id === user.id;
      const other = isA ? c.profile_b : c.profile_a;
      return { ...c, other, unread_for_me: isA ? c.unread_count_a : c.unread_count_b };
    });
    setConversations(mapped);
    setLoading(false);
  }

  useEffect(() => { loadConversations(); }, [user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('conversations-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => loadConversations())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const filtered = search.trim()
    ? conversations.filter((c) => c.other?.full_name?.toLowerCase().includes(search.toLowerCase()))
    : conversations;

  // Mobile: show list OR chat, not both
  const activeId = pathname.split('/messages/')[1];
  const hasActive = Boolean(activeId);

  return (
    <div className="flex h-[calc(100vh-120px)] md:h-screen overflow-hidden flex-1">
      {/* Conversation list — hidden on mobile when a chat is open */}
      <div className={cn(
        'border-r border-white/[0.06] flex-col bg-[#070707]',
        'w-full md:w-80 md:flex-shrink-0',
        hasActive ? 'hidden md:flex' : 'flex'
      )}>
        <div className="px-4 pt-5 pb-3 border-b border-white/[0.06] flex-shrink-0">
          <h2 className="text-base font-bold text-white mb-3">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations…"
              className="field-input pl-8 w-full text-xs py-2"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-11 h-11 rounded-full bg-white/10 flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-white/10 rounded w-1/2" />
                    <div className="h-3 bg-white/10 rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-4 text-center pb-12">
              <MessageSquare className="w-10 h-10 text-white/10 mb-3" />
              <p className="text-sm text-white/30">{search ? 'No conversations match' : 'No messages yet'}</p>
              <p className="text-xs text-white/20 mt-1">Visit someone's profile to start a conversation</p>
            </div>
          ) : (
            <div className="py-1">
              {filtered.map((conv) => {
                const initials = conv.other?.full_name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() ?? '?';
                const isActive = activeId === conv.id;
                return (
                  <Link
                    key={conv.id}
                    href={`/dashboard/messages/${conv.id}`}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3.5 transition-colors',
                      isActive ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'
                    )}
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-11 h-11 rounded-full bg-gradient-brand flex items-center justify-center text-sm font-bold text-white">
                        {initials}
                      </div>
                      {conv.other?.is_online && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#070707]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={cn('text-sm font-medium truncate', conv.unread_for_me > 0 ? 'text-white' : 'text-white/80')}>
                          {conv.other?.full_name ?? 'Unknown'}
                        </span>
                        <span className="text-xs text-white/25 flex-shrink-0 ml-2">
                          {timeAgo(conv.last_message_at)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn('text-xs truncate', conv.unread_for_me > 0 ? 'text-white/60' : 'text-white/30')}>
                          {conv.last_message ?? 'Start a conversation'}
                        </p>
                        {conv.unread_for_me > 0 && (
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500 text-[10px] font-bold text-white flex items-center justify-center">
                            {conv.unread_for_me > 9 ? '9+' : conv.unread_for_me}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Chat panel — full width on mobile when a conversation is open */}
      <div className={cn(
        'flex-col min-w-0 flex-1',
        hasActive ? 'flex' : 'hidden md:flex'
      )}>
        {children}
      </div>
    </div>
  );
}
