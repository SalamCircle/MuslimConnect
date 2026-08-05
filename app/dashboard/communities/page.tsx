'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';
import type { Community, CommunityCategory } from '@/lib/types';
import {
  GraduationCap, Briefcase, Heart, Moon, Code, Baby, BookMarked,
  Users, Star, CheckCircle2, Plus, X, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

const categoryMeta: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  students:        { icon: GraduationCap, color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20' },
  business:        { icon: Briefcase,     color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20' },
  marriage:        { icon: Heart,         color: 'text-rose-400',    bg: 'bg-rose-500/10 border-rose-500/20' },
  reverts:         { icon: Moon,          color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  technology:      { icon: Code,          color: 'text-violet-400',  bg: 'bg-violet-500/10 border-violet-500/20' },
  parenting:       { icon: Baby,          color: 'text-pink-400',    bg: 'bg-pink-500/10 border-pink-500/20' },
  islamic_studies: { icon: BookMarked,    color: 'text-cyan-400',    bg: 'bg-cyan-500/10 border-cyan-500/20' },
  brothers:        { icon: Users,         color: 'text-teal-400',    bg: 'bg-teal-500/10 border-teal-500/20' },
  sisters:         { icon: Users,         color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10 border-fuchsia-500/20' },
  youth:           { icon: Star,          color: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/20' },
  professionals:   { icon: Briefcase,     color: 'text-indigo-400',  bg: 'bg-indigo-500/10 border-indigo-500/20' },
  general:         { icon: Users,         color: 'text-white/60',    bg: 'bg-white/5 border-white/10' },
};

const categoryOptions: CommunityCategory[] = [
  'students', 'business', 'reverts', 'technology',
  'parenting', 'islamic_studies', 'brothers', 'sisters', 'youth',
  'professionals', 'general',
];

const categoryLabels: Record<CommunityCategory, string> = {
  students: 'Students', business: 'Business',
  reverts: 'New Muslims & Reverts', technology: 'Technology', parenting: 'Parenting',
  islamic_studies: 'Islamic Studies', brothers: 'Brothers', sisters: 'Sisters',
  youth: 'Youth', professionals: 'Professionals', general: 'General',
};

export default function CommunitiesPage() {
  const { user } = useAuth();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  async function loadData() {
    const [commRes, memberRes] = await Promise.all([
      supabase.from('communities').select('*').eq('is_public', true).order('member_count', { ascending: false }),
      user ? supabase.from('community_members').select('community_id').eq('user_id', user.id) : Promise.resolve({ data: [] }),
    ]);
    setCommunities((commRes.data as Community[]) || []);
    setJoinedIds(new Set(((memberRes.data || []) as { community_id: string }[]).map((r) => r.community_id)));
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [user]);

  async function toggleMembership(community: Community) {
    if (!user) return;
    setJoiningId(community.id);
    const joined = joinedIds.has(community.id);
    if (joined) {
      await supabase.from('community_members').delete()
        .eq('community_id', community.id).eq('user_id', user.id);
      setJoinedIds((prev) => { const s = new Set(prev); s.delete(community.id); return s; });
      toast.success(`Left ${community.name}`);
    } else {
      await supabase.from('community_members').insert({ community_id: community.id, user_id: user.id, role: 'member' });
      setJoinedIds((prev) => { const s = new Set(prev); s.add(community.id); return s; });
      toast.success(`Joined ${community.name}!`);
    }
    setJoiningId(null);
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="h-8 w-48 bg-white/10 rounded-lg animate-pulse mb-8" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="glass-card p-6 h-48 animate-pulse" />)}
        </div>
      </div>
    );
  }

  const joinedCommunities = communities.filter((c) => joinedIds.has(c.id));
  const otherCommunities = communities.filter((c) => !joinedIds.has(c.id));

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Communities</h1>
          <p className="text-sm text-white/45 mt-1">
            {joinedIds.size > 0 ? `You're in ${joinedIds.size} ${joinedIds.size === 1 ? 'community' : 'communities'}` : 'Find your people'}
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-brand text-sm px-4 py-2.5">
          <Plus className="w-4 h-4" /> Create Community
        </button>
      </div>

      {joinedCommunities.length > 0 && (
        <div className="mb-10">
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Your Communities</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {joinedCommunities.map((c) => (
              <CommunityCard key={c.id} community={c} joined onToggle={toggleMembership} joining={joiningId === c.id} />
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
          {joinedCommunities.length > 0 ? 'Discover More' : 'All Communities'}
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {otherCommunities.map((c) => (
            <CommunityCard key={c.id} community={c} joined={false} onToggle={toggleMembership} joining={joiningId === c.id} />
          ))}
        </div>
      </div>

      {showCreate && (
        <CreateCommunityModal
          userId={user?.id ?? ''}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); loadData(); }}
        />
      )}
    </div>
  );
}

function CommunityCard({
  community, joined, joining, onToggle,
}: {
  community: Community; joined: boolean; joining: boolean; onToggle: (c: Community) => void;
}) {
  const meta = categoryMeta[community.category] || categoryMeta.general;
  const Icon = meta.icon;

  return (
    <div className={`glass-card border p-5 flex flex-col ${meta.bg}`}>
      <div className="flex items-start gap-3 mb-3">
        <div className="w-11 h-11 rounded-2xl bg-black/25 flex items-center justify-center flex-shrink-0">
          <Icon className={`w-5 h-5 ${meta.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-semibold text-white text-sm truncate">{community.name}</h3>
            {joined && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
          </div>
          <p className="text-xs text-white/35 flex items-center gap-1 mt-0.5">
            <Users className="w-3 h-3" />
            {community.member_count.toLocaleString()} members
            {community.post_count > 0 && <> · {community.post_count} posts</>}
          </p>
        </div>
      </div>
      {community.description && (
        <p className="text-xs text-white/50 leading-relaxed flex-1 mb-4 line-clamp-2">{community.description}</p>
      )}
      <div className="flex gap-2 mt-auto">
        <Link href={`/dashboard/communities/${community.id}`} className="btn-ghost text-xs px-3 py-2 flex-1 text-center flex items-center justify-center gap-1">
          Feed <ArrowRight className="w-3 h-3" />
        </Link>
        <button
          onClick={() => onToggle(community)}
          disabled={joining}
          className={`text-xs px-3 py-2 rounded-xl font-semibold transition-all flex items-center gap-1.5 ${
            joined
              ? 'bg-white/8 text-white/50 hover:bg-rose-500/15 hover:text-rose-400 border border-white/10'
              : 'btn-brand'
          }`}
        >
          {joining ? '…' : joined ? 'Leave' : <><Plus className="w-3.5 h-3.5" />Join</>}
        </button>
      </div>
    </div>
  );
}

function CreateCommunityModal({
  userId, onClose, onCreated,
}: {
  userId: string; onClose: () => void; onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<CommunityCategory>('general');
  const [saving, setSaving] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !userId) return;
    setSaving(true);

    const { error } = await supabase.from('communities').insert({
      name: name.trim(),
      description: description.trim() || null,
      category,
      creator_id: userId,
      is_public: true,
    });

    if (error) {
      toast.error('Failed to create community: ' + error.message);
    } else {
      toast.success(`"${name}" community created!`);
      onCreated();
    }
    setSaving(false);
  }

  const selectedMeta = categoryMeta[category];
  const SelectedIcon = selectedMeta.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-card w-full max-w-md p-6 z-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">Create a Community</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/8 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Community Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={60}
              placeholder="e.g. London Tech Muslims"
              className="field-input"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Category</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <SelectedIcon className={`w-4 h-4 ${selectedMeta.color}`} />
              </div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CommunityCategory)}
                className="field-input pl-9 appearance-none cursor-pointer"
              >
                {categoryOptions.map((c) => (
                  <option key={c} value={c} className="bg-[#111]">{categoryLabels[c]}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Description <span className="text-white/25">(optional)</span></label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={300}
              placeholder="What is this community about?"
              className="field-input resize-none"
            />
            <p className="text-xs text-white/25 mt-1 text-right">{description.length}/300</p>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 py-2.5">Cancel</button>
            <button type="submit" disabled={!name.trim() || saving} className="btn-brand flex-1 py-2.5">
              {saving ? 'Creating…' : 'Create Community'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
