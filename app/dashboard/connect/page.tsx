'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';
import type { Profile } from '@/lib/types';
import { MapPin, Search, Users } from 'lucide-react';

export default function ConnectPage() {
  const { user, profile } = useAuth();
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user?.id ?? '')
        .order('last_seen', { ascending: false })
        .limit(50);
      setMembers((data as Profile[]) || []);
      setLoading(false);
    }
    if (user) load();
  }, [user]);

  const filtered = members.filter((m) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      m.full_name?.toLowerCase().includes(q) ||
      m.city?.toLowerCase().includes(q) ||
      m.region?.toLowerCase().includes(q)
    );
  });

  const nearby = filtered.filter((m) => profile?.city && m.city === profile.city);
  const others = filtered.filter((m) => !profile?.city || m.city !== profile.city);

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Connect</h1>
        <p className="text-sm text-white/45 mt-1">Discover Muslims near you in Manchester</p>
      </div>

      {/* Search */}
      <div className="relative mb-8">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or city…"
          className="field-input pl-10"
        />
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass-card p-4 flex gap-3 animate-pulse">
              <div className="w-12 h-12 rounded-full bg-white/10 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-white/10 rounded w-2/3" />
                <div className="h-3 bg-white/10 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {nearby.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                Near You · {profile?.city}
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {nearby.map((m) => <MemberCard key={m.id} member={m} />)}
              </div>
            </div>
          )}

          <div>
            <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              {nearby.length > 0 ? 'Other Members' : `All Members (${filtered.length})`}
            </h2>
            {others.length === 0 && nearby.length === 0 ? (
              <div className="glass-card p-10 text-center">
                <p className="text-white/40 text-sm">No members found.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {others.map((m) => <MemberCard key={m.id} member={m} />)}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function MemberCard({ member }: { member: Profile }) {
  const initials = member.full_name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() ?? '?';

  return (
    <Link href={`/dashboard/profile/${member.id}`}>
      <div className="glass-card p-4 flex items-center gap-3 cursor-pointer">
        <div className="w-11 h-11 rounded-full bg-gradient-brand flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{member.full_name}</p>
          <p className="text-xs text-white/40 flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3" />
            {[member.city, member.region].filter(Boolean).join(', ') || member.country}
          </p>
          {member.bio && (
            <p className="text-xs text-white/30 truncate mt-0.5">{member.bio}</p>
          )}
        </div>
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${member.is_online ? 'bg-emerald-400' : 'bg-white/20'}`} />
      </div>
    </Link>
  );
}
