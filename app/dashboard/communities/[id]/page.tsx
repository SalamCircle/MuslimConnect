'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';
import type { Community } from '@/lib/types';
import {
  GraduationCap, Briefcase, Heart, Moon, Code, Baby, BookMarked,
  Users, Star, ArrowLeft, CheckCircle2, Plus
} from 'lucide-react';
import Feed from '@/components/feed/feed';
import { toast } from 'sonner';

const categoryMeta: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  students:        { icon: GraduationCap, color: 'text-blue-400',    bg: 'bg-blue-500/10' },
  business:        { icon: Briefcase,     color: 'text-amber-400',   bg: 'bg-amber-500/10' },
  marriage:        { icon: Heart,         color: 'text-rose-400',    bg: 'bg-rose-500/10' },
  reverts:         { icon: Moon,          color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  technology:      { icon: Code,          color: 'text-violet-400',  bg: 'bg-violet-500/10' },
  parenting:       { icon: Baby,          color: 'text-pink-400',    bg: 'bg-pink-500/10' },
  islamic_studies: { icon: BookMarked,    color: 'text-cyan-400',    bg: 'bg-cyan-500/10' },
  brothers:        { icon: Users,         color: 'text-teal-400',    bg: 'bg-teal-500/10' },
  sisters:         { icon: Users,         color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10' },
  youth:           { icon: Star,          color: 'text-orange-400',  bg: 'bg-orange-500/10' },
  professionals:   { icon: Briefcase,     color: 'text-indigo-400',  bg: 'bg-indigo-500/10' },
  general:         { icon: Users,         color: 'text-white/60',    bg: 'bg-white/5' },
};

export default function CommunityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [community, setCommunity] = useState<Community | null>(null);
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    async function load() {
      const [commRes, memberRes] = await Promise.all([
        supabase.from('communities').select('*').eq('id', id).maybeSingle(),
        user ? supabase.from('community_members').select('id').eq('community_id', id).eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      setCommunity(commRes.data as Community | null);
      setJoined(!!memberRes.data);
      setLoading(false);
    }
    if (id) load();
  }, [id, user]);

  async function toggleMembership() {
    if (!user || !community) return;
    setToggling(true);
    if (joined) {
      await supabase.from('community_members').delete()
        .eq('community_id', community.id).eq('user_id', user.id);
      setJoined(false);
      toast.success(`Left ${community.name}`);
    } else {
      await supabase.from('community_members').insert({
        community_id: community.id,
        user_id: user.id,
        role: 'member',
      });
      setJoined(true);
      toast.success(`Joined ${community.name}!`);
    }
    setToggling(false);
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="glass-card p-8 animate-pulse">
          <div className="h-6 bg-white/10 rounded w-1/3 mb-4" />
          <div className="h-4 bg-white/10 rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-8 text-center">
        <p className="text-white/40">Community not found.</p>
      </div>
    );
  }

  const meta = categoryMeta[community.category] || categoryMeta.general;
  const Icon = meta.icon;

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <button onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Community header */}
      <div className={`glass-card p-6 mb-6 ${meta.bg} border border-white/[0.08]`}>
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-black/25 flex items-center justify-center flex-shrink-0">
            <Icon className={`w-7 h-7 ${meta.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-xl font-bold text-white">{community.name}</h1>
              {joined && (
                <span className="badge-emerald text-xs flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Member
                </span>
              )}
            </div>
            <p className="text-sm text-white/45 flex items-center gap-1.5 mb-3">
              <Users className="w-3.5 h-3.5" />
              {community.member_count.toLocaleString()} members
            </p>
            {community.description && (
              <p className="text-sm text-white/60 leading-relaxed mb-4">{community.description}</p>
            )}
            <button
              onClick={toggleMembership}
              disabled={toggling}
              className={joined
                ? 'btn-ghost text-xs px-4 py-2 hover:text-rose-400'
                : 'btn-brand text-xs px-4 py-2'}
            >
              {toggling ? '…' : joined ? 'Leave Community' : <><Plus className="w-3.5 h-3.5" />Join Community</>}
            </button>
          </div>
        </div>
      </div>

      {/* Community feed — shows global scope filtered by community_id */}
      <Feed scope="global" communityId={community.id} />
    </div>
  );
}
