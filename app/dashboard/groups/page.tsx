'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';
import type { Community, CommunityCategory } from '@/lib/types';
import {
  GraduationCap, Briefcase, Moon, Code, Baby, BookMarked,
  Users, Star, CheckCircle2, Plus, X, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

const categoryMeta: Record<string, { icon: React.ElementType; color: string; bg: string; border: string }> = {
  students:        { icon: GraduationCap, color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20' },
  business:        { icon: Briefcase,     color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20' },
  reverts:         { icon: Moon,          color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  technology:      { icon: Code,          color: 'text-violet-400',  bg: 'bg-violet-500/10',  border: 'border-violet-500/20' },
  parenting:       { icon: Baby,          color: 'text-pink-400',    bg: 'bg-pink-500/10',    border: 'border-pink-500/20' },
  islamic_studies: { icon: BookMarked,    color: 'text-cyan-400',    bg: 'bg-cyan-500/10',    border: 'border-cyan-500/20' },
  brothers:        { icon: Users,         color: 'text-teal-400',    bg: 'bg-teal-500/10',    border: 'border-teal-500/20' },
  sisters:         { icon: Users,         color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/20' },
  youth:           { icon: Star,          color: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/20' },
  professionals:   { icon: Briefcase,     color: 'text-indigo-400',  bg: 'bg-indigo-500/10',  border: 'border-indigo-500/20' },
  general:         { icon: Users,         color: 'text-white/60',    bg: 'bg-white/5',        border: 'border-white/10' },
};

const categoryOptions: CommunityCategory[] = [
  'students', 'business', 'reverts', 'technology', 'parenting',
  'islamic_studies', 'brothers', 'sisters', 'youth', 'professionals', 'general',
];

const categoryLabels: Record<string, string> = {
  students: 'Students', business: 'Business', reverts: 'New Muslims & Reverts',
  technology: 'Technology', parenting: 'Parenting', islamic_studies: 'Islamic Studies',
  brothers: 'Brothers', sisters: 'Sisters', youth: 'Youth', professionals: 'Professionals', general: 'General',
};

export default function GroupsPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Community[]>([]);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  async function loadData() {
    const [gRes, mRes] = await Promise.all([
      supabase.from('communities').select('*').eq('is_public', true)
        .not('category', 'eq', 'marriage')
        .order('member_count', { ascending: false }),
      user ? supabase.from('community_members').select('community_id').eq('user_id', user.id) : Promise.resolve({ data: [] }),
    ]);
    setGroups((gRes.data as Community[]) || []);
    setJoinedIds(new Set(((mRes.data || []) as { community_id: string }[]).map((r) => r.community_id)));
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [user]);

  async function toggleMembership(group: Community) {
    if (!user) return;
    setJoiningId(group.id);
    const joined = joinedIds.has(group.id);
    if (joined) {
      await supabase.from('community_members').delete().eq('community_id', group.id).eq('user_id', user.id);
      setJoinedIds((p) => { const s = new Set(p); s.delete(group.id); return s; });
      toast.success(`Left ${group.name}`);
    } else {
      await supabase.from('community_members').insert({ community_id: group.id, user_id: user.id, role: 'member' });
      setJoinedIds((p) => { const s = new Set(p); s.add(group.id); return s; });
      toast.success(`Joined ${group.name}!`);
    }
    setJoiningId(null);
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="h-8 w-48 bg-white/10 rounded-lg animate-pulse mb-8" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="glass-card p-6 h-52 animate-pulse" />)}
        </div>
      </div>
    );
  }

  const myGroups = groups.filter((g) => joinedIds.has(g.id));
  const otherGroups = groups.filter((g) => !joinedIds.has(g.id));

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Groups</h1>
          <p className="text-sm text-white/45 mt-1">
            {joinedIds.size > 0 ? `You're in ${joinedIds.size} ${joinedIds.size === 1 ? 'group' : 'groups'}` : 'Find your people'}
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-brand text-sm px-4 py-2.5">
          <Plus className="w-4 h-4" /> Create Group
        </button>
      </div>

      {myGroups.length > 0 && (
        <div className="mb-10">
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Your Groups</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myGroups.map((g) => <GroupCard key={g.id} group={g} joined onToggle={toggleMembership} joining={joiningId === g.id} />)}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
          {myGroups.length > 0 ? 'Discover More' : 'All Groups'}
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {otherGroups.map((g) => <GroupCard key={g.id} group={g} joined={false} onToggle={toggleMembership} joining={joiningId === g.id} />)}
        </div>
      </div>

      {showCreate && (
        <CreateGroupModal userId={user?.id ?? ''} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); loadData(); }} />
      )}
    </div>
  );
}

function GroupCard({ group, joined, joining, onToggle }: { group: Community; joined: boolean; joining: boolean; onToggle: (g: Community) => void }) {
  const meta = categoryMeta[group.category] ?? categoryMeta.general;
  const Icon = meta.icon;

  return (
    <div className={`glass-card border p-5 flex flex-col ${meta.bg} ${meta.border}`}>
      <div className="flex items-start gap-3 mb-3">
        <div className="w-11 h-11 rounded-2xl bg-black/25 flex items-center justify-center flex-shrink-0">
          <Icon className={`w-5 h-5 ${meta.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-semibold text-white text-sm truncate">{group.name}</h3>
            {joined && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
          </div>
          <p className="text-xs text-white/35 flex items-center gap-1 mt-0.5">
            <Users className="w-3 h-3" />
            {group.member_count.toLocaleString()} members
            {group.post_count > 0 && <> · {group.post_count} posts</>}
          </p>
        </div>
      </div>
      {group.description && (
        <p className="text-xs text-white/50 leading-relaxed flex-1 mb-4 line-clamp-2">{group.description}</p>
      )}
      <div className="flex gap-2 mt-auto">
        <Link href={`/dashboard/groups/${group.id}`} className="btn-ghost text-xs px-3 py-2 flex-1 flex items-center justify-center gap-1">
          View <ArrowRight className="w-3 h-3" />
        </Link>
        <button
          onClick={() => onToggle(group)}
          disabled={joining}
          className={`text-xs px-3 py-2 rounded-xl font-semibold transition-all flex items-center gap-1.5 ${
            joined ? 'bg-white/8 text-white/50 hover:bg-rose-500/15 hover:text-rose-400 border border-white/10'
                   : 'btn-brand'
          }`}
        >
          {joining ? '…' : joined ? 'Leave' : <><Plus className="w-3.5 h-3.5" />Join</>}
        </button>
      </div>
    </div>
  );
}

function CreateGroupModal({ userId, onClose, onCreated }: { userId: string; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<CommunityCategory>('general');
  const [saving, setSaving] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !userId) return;
    setSaving(true);
    const { error } = await supabase.from('communities').insert({
      name: name.trim(), description: description.trim() || null, category, creator_id: userId, is_public: true,
    });
    if (error) { toast.error('Failed to create group: ' + error.message); }
    else { toast.success(`"${name}" group created!`); onCreated(); }
    setSaving(false);
  }

  const selectedMeta = categoryMeta[category];
  const SelectedIcon = selectedMeta.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-card w-full max-w-md p-6 z-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">Create a Group</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/8 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Group Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} placeholder="e.g. London Tech Muslims" className="field-input" />
          </div>
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Category</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <SelectedIcon className={`w-4 h-4 ${selectedMeta.color}`} />
              </div>
              <select value={category} onChange={(e) => setCategory(e.target.value as CommunityCategory)} className="field-input pl-9 appearance-none cursor-pointer bg-[#111]">
                {categoryOptions.map((c) => <option key={c} value={c} className="bg-[#111]">{categoryLabels[c]}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Description <span className="text-white/25">(optional)</span></label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={300} placeholder="What is this group about?" className="field-input resize-none" />
            <p className="text-xs text-white/25 mt-1 text-right">{description.length}/300</p>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 py-2.5">Cancel</button>
            <button type="submit" disabled={!name.trim() || saving} className="btn-brand flex-1 py-2.5">
              {saving ? 'Creating…' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
