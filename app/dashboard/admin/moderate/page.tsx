'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { MessageSquare, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function ModeratorOverviewPage() {
  const [stats, setStats] = useState({ pendingReports: 0, pendingPosts: 0, hiddenPosts: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [reports, pendingPosts, hiddenPosts] = await Promise.all([
        supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('posts').select('id', { count: 'exact', head: true }).eq('status', 'active').eq('is_approved', false),
        supabase.from('posts').select('id', { count: 'exact', head: true }).eq('status', 'hidden'),
      ]);
      setStats({
        pendingReports: reports.count ?? 0,
        pendingPosts: pendingPosts.count ?? 0,
        hiddenPosts: hiddenPosts.count ?? 0,
      });
      setLoading(false);
    }
    load();
  }, []);

  const cards = [
    { label: 'Pending Reports', value: stats.pendingReports, icon: AlertTriangle, color: 'text-rose-400 bg-rose-500/10', href: '/dashboard/admin/moderate/reports' },
    { label: 'Unapproved Posts', value: stats.pendingPosts, icon: Clock, color: 'text-amber-400 bg-amber-500/10', href: '/dashboard/admin/moderate/posts' },
    { label: 'Hidden Posts', value: stats.hiddenPosts, icon: MessageSquare, color: 'text-orange-400 bg-orange-500/10', href: '/dashboard/admin/moderate/posts' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Moderator Overview</h1>
        <p className="text-sm text-white/40 mt-1">Review flagged content and community reports.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="glass-card p-6 animate-pulse h-24" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {cards.map(({ label, value, icon: Icon, color, href }) => (
            <Link key={label} href={href} className="glass-card p-5 flex items-center gap-4 hover:bg-white/[0.03] transition-colors group">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="text-xs text-white/40">{label}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="glass-card p-6">
        <h2 className="text-sm font-semibold text-white mb-3">Quick Actions</h2>
        <div className="flex flex-col gap-2">
          <Link href="/dashboard/admin/moderate/reports" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span className="text-sm text-white/70">Review pending reports</span>
          </Link>
          <Link href="/dashboard/admin/moderate/posts" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors">
            <MessageSquare className="w-4 h-4 text-cyan-400" />
            <span className="text-sm text-white/70">Moderate community posts</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
