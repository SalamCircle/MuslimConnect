'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { Search, Shield, ShieldOff, Ban, ChevronRight, UserCog, MapPin, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const UK_REGIONS = [
  'East Midlands','East of England','London','North East','North West',
  'Northern Ireland','Scotland','South East','South West','Wales','West Midlands','Yorkshire and The Humber',
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [showRegionMenu, setShowRegionMenu] = useState(false);

  async function load() {
    setLoading(true);
    let q = supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(200);
    if (regionFilter) q = q.eq('region', regionFilter);
    const { data } = await q;
    setUsers((data as Profile[]) || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [regionFilter]);

  const filtered = search.trim()
    ? users.filter((u) => u.full_name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
    : users;

  async function toggleField(userId: string, field: 'is_admin' | 'is_moderator' | 'is_suspended' | 'is_banned', current: boolean) {
    const updates: Record<string, unknown> = { [field]: !current };
    if (field === 'is_admin') updates.role = !current ? 'admin' : 'user';
    if (field === 'is_moderator') updates.role = !current ? 'moderator' : 'user';
    const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
    if (error) { toast.error('Action failed.'); return; }
    toast.success('User updated.');
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, ...updates } as Profile : u));
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-white">Users</h1>
          <p className="text-sm text-white/40 mt-1">{filtered.length} member{filtered.length !== 1 ? 's' : ''}{regionFilter ? ` in ${regionFilter}` : ''}</p>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowRegionMenu((v) => !v)}
            className="flex items-center gap-2 text-sm bg-white/6 border border-white/10 rounded-xl px-3 py-2 text-white/70 hover:text-white hover:bg-white/10 transition-all"
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            {regionFilter || 'All Regions'}
            <ChevronDown className="w-3.5 h-3.5 text-white/30" />
          </button>
          {showRegionMenu && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-[#111] border border-white/[0.08] rounded-xl shadow-xl z-50 overflow-hidden max-h-72 overflow-y-auto">
              <button
                onClick={() => { setRegionFilter(''); setShowRegionMenu(false); }}
                className={cn('w-full text-left px-3 py-2.5 text-sm transition-colors', !regionFilter ? 'text-emerald-400 bg-emerald-500/10' : 'text-white/70 hover:text-white hover:bg-white/6')}
              >
                All Regions
              </button>
              {UK_REGIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => { setRegionFilter(r); setShowRegionMenu(false); }}
                  className={cn('w-full text-left px-3 py-2.5 text-sm transition-colors', regionFilter === r ? 'text-emerald-400 bg-emerald-500/10' : 'text-white/70 hover:text-white hover:bg-white/6')}
                >
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email…" className="field-input pl-10 w-full max-w-sm" />
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3,4].map((i) => <div key={i} className="glass-card p-4 animate-pulse h-16" />)}</div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {['Member', 'Location', 'Joined', 'Role / Status', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const initials = u.full_name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() ?? '?';
                  return (
                    <tr key={u.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center text-xs font-bold text-white flex-shrink-0">{initials}</div>
                          <div>
                            <p className="text-sm font-medium text-white">{u.full_name}</p>
                            <p className="text-xs text-white/35">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-white/45">
                          {u.city && <p>{u.city}</p>}
                          {u.region && <p className="text-white/30">{u.region}</p>}
                          {!u.city && !u.region && '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-white/35">{formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5 flex-wrap">
                          {u.is_admin && <span className="text-[10px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full">Admin</span>}
                          {u.is_moderator && !u.is_admin && <span className="text-[10px] font-medium text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded-full">Moderator</span>}
                          {u.is_suspended && <span className="text-[10px] font-medium text-orange-400 bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded-full">Suspended</span>}
                          {u.is_banned && <span className="text-[10px] font-medium text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded-full">Banned</span>}
                          {!u.is_admin && !u.is_moderator && !u.is_suspended && !u.is_banned && (
                            <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">Active</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Link href={`/dashboard/profile/${u.id}`} className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/6 transition-all" title="View profile">
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                          <button onClick={() => toggleField(u.id, 'is_admin', u.is_admin)} className={cn('p-1.5 rounded-lg transition-all', u.is_admin ? 'text-amber-400 bg-amber-500/10' : 'text-white/30 hover:text-amber-400 hover:bg-amber-500/10')} title={u.is_admin ? 'Remove admin' : 'Make admin'}>
                            <Shield className="w-4 h-4" />
                          </button>
                          <button onClick={() => toggleField(u.id, 'is_moderator', u.is_moderator)} className={cn('p-1.5 rounded-lg transition-all', u.is_moderator ? 'text-blue-400 bg-blue-500/10' : 'text-white/30 hover:text-blue-400 hover:bg-blue-500/10')} title={u.is_moderator ? 'Remove moderator' : 'Make moderator'}>
                            <UserCog className="w-4 h-4" />
                          </button>
                          <button onClick={() => toggleField(u.id, 'is_suspended', u.is_suspended)} className={cn('p-1.5 rounded-lg transition-all', u.is_suspended ? 'text-orange-400 bg-orange-500/10' : 'text-white/30 hover:text-orange-400 hover:bg-orange-500/10')} title={u.is_suspended ? 'Unsuspend' : 'Suspend'}>
                            <ShieldOff className="w-4 h-4" />
                          </button>
                          <button onClick={() => toggleField(u.id, 'is_banned', u.is_banned)} className={cn('p-1.5 rounded-lg transition-all', u.is_banned ? 'text-rose-400 bg-rose-500/10' : 'text-white/30 hover:text-rose-400 hover:bg-rose-500/10')} title={u.is_banned ? 'Unban' : 'Ban'}>
                            <Ban className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && <p className="text-center text-white/30 text-sm py-8">No users found{regionFilter ? ` in ${regionFilter}` : ''}.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
