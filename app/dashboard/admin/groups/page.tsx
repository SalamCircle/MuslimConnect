'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Community } from '@/lib/types';
import { Trash2, Users, Search } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function AdminGroupsPage() {
  const [groups, setGroups] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('communities').select('*').order('member_count', { ascending: false });
    setGroups((data as Community[]) || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = search.trim() ? groups.filter((g) => g.name.toLowerCase().includes(search.toLowerCase())) : groups;

  async function deleteGroup(id: string) {
    const { error } = await supabase.from('communities').delete().eq('id', id);
    if (error) { toast.error('Failed to delete group.'); return; }
    toast.success('Group deleted.');
    setGroups((g) => g.filter((x) => x.id !== id));
    setConfirmDelete(null);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Groups</h1>
          <p className="text-sm text-white/40 mt-1">{groups.length} groups</p>
        </div>
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search groups…" className="field-input pl-10 w-full max-w-sm" />
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="glass-card p-4 animate-pulse h-16" />)}</div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['Group', 'Category', 'Members', 'Posts', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((g) => (
                <tr key={g.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <Users className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{g.name}</p>
                        <p className="text-xs text-white/35 line-clamp-1">{g.description ?? '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className="text-xs text-white/50 capitalize">{g.category.replace('_', ' ')}</span></td>
                  <td className="px-4 py-3 text-xs text-white/60">{g.member_count.toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs text-white/60">{g.post_count.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {confirmDelete === g.id ? (
                      <div className="flex items-center gap-2">
                        <button onClick={() => deleteGroup(g.id)} className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded-lg hover:bg-rose-500/20 transition-all">Confirm</button>
                        <button onClick={() => setConfirmDelete(null)} className="text-xs text-white/40 hover:text-white/70 px-2 py-1 rounded-lg transition-all">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDelete(g.id)} className="p-1.5 rounded-lg text-white/25 hover:text-rose-400 hover:bg-rose-500/10 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-center text-white/30 text-sm py-8">No groups found.</p>}
        </div>
      )}
    </div>
  );
}
