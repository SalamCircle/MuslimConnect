'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';
import type { Notification } from '@/lib/types';
import { Bell, Check, MessageSquare, Heart, Users, Briefcase, Calendar, Flag } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const typeIcons: Record<string, React.ElementType> = {
  comment:                 MessageSquare,
  reply:                   MessageSquare,
  like:                    Heart,
  group_request_accepted:  Users,
  event_approved:          Calendar,
  job_approved:            Briefcase,
  mention:                 MessageSquare,
  report_actioned:         Flag,
};

const typeColors: Record<string, string> = {
  comment:                'text-cyan-400 bg-cyan-500/10',
  reply:                  'text-cyan-400 bg-cyan-500/10',
  like:                   'text-rose-400 bg-rose-500/10',
  group_request_accepted: 'text-emerald-400 bg-emerald-500/10',
  event_approved:         'text-blue-400 bg-blue-500/10',
  job_approved:           'text-amber-400 bg-amber-500/10',
  mention:                'text-purple-400 bg-purple-500/10',
  report_actioned:        'text-orange-400 bg-orange-500/10',
};

export default function NotificationsPage() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!profile) return;
    setLoading(true);
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setNotifications((data as Notification[]) || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [profile]);

  async function markAllRead() {
    if (!profile) return;
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', profile.id)
      .eq('is_read', false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  async function markRead(id: string) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
  }

  const unread = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-emerald-400" />
            Notifications
          </h1>
          {unread > 0 && (
            <p className="text-sm text-white/40 mt-1">{unread} unread</p>
          )}
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} className="btn-ghost text-sm flex items-center gap-1.5">
            <Check className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-card p-4 animate-pulse h-16" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <Bell className="w-10 h-10 text-white/10 mx-auto mb-3" />
          <p className="text-white/30 text-sm">No notifications yet</p>
          <p className="text-white/20 text-xs mt-1">Activity from posts, comments, and events will appear here.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {notifications.map((n) => {
            const Icon = typeIcons[n.type] ?? Bell;
            const colorCls = typeColors[n.type] ?? 'text-white/40 bg-white/6';
            return (
              <button
                key={n.id}
                onClick={() => !n.is_read && markRead(n.id)}
                className={cn(
                  'glass-card p-4 w-full text-left flex items-start gap-3 transition-all hover:bg-white/[0.03]',
                  !n.is_read && 'border-l-2 border-emerald-500'
                )}
              >
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', colorCls)}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm leading-snug', n.is_read ? 'text-white/55' : 'text-white font-medium')}>{n.message}</p>
                  <p className="text-xs text-white/25 mt-1">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
                </div>
                {!n.is_read && (
                  <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0 mt-1.5" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
