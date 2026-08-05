import Link from 'next/link';
import PublicNav from '@/components/navigation/public-nav';
import { supabase } from '@/lib/supabase';
import type { Community } from '@/lib/types';
import {
  GraduationCap, Briefcase, Heart, Moon, Code, Baby, BookMarked,
  Users, Star, ArrowRight, Zap
} from 'lucide-react';

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

async function getCommunities(): Promise<Community[]> {
  const { data } = await supabase.from('communities').select('*').eq('is_public', true).order('member_count', { ascending: false });
  return (data as Community[]) || [];
}

export default async function CommunitiesPage() {
  const communities = await getCommunities();

  return (
    <div className="min-h-screen bg-[#050505]">
      <PublicNav />

      <div className="max-w-6xl mx-auto px-6 pt-24 pb-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-3">Community Groups in Manchester</h1>
          <p className="text-white/50 text-lg max-w-xl mx-auto">
            Interest groups for Manchester Muslims — students, business, youth, sisters, brothers and more
          </p>
          <Link href="/auth/signup" className="btn-brand inline-flex mt-6 px-6 py-3">
            <Zap className="w-4 h-4" /> Join a community
          </Link>
        </div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {communities.map((community) => {
            const meta = categoryMeta[community.category] || categoryMeta.general;
            const Icon = meta.icon;
            return (
              <div key={community.id} className={`glass-card border p-6 flex flex-col ${meta.bg}`}>
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-black/25 flex items-center justify-center flex-shrink-0">
                    <Icon className={`w-6 h-6 ${meta.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white text-base">{community.name}</h3>
                    <p className="text-xs text-white/40 flex items-center gap-1 mt-0.5">
                      <Users className="w-3 h-3" />
                      {community.member_count.toLocaleString()} members
                    </p>
                  </div>
                </div>
                {community.description && (
                  <p className="text-sm text-white/55 leading-relaxed flex-1 mb-5">{community.description}</p>
                )}
                <Link href="/auth/signup" className={`w-full py-2.5 rounded-xl text-sm font-semibold text-center transition-all bg-gradient-brand text-white hover:opacity-85`}>
                  Join Community
                </Link>
              </div>
            );
          })}
        </div>

        {/* Logged-in CTA */}
        <div className="mt-16 glass-card p-10 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">Already a member?</h2>
          <p className="text-white/50 mb-6">Sign in to see your communities and join the conversation</p>
          <div className="flex gap-3 justify-center">
            <Link href="/auth/login" className="btn-ghost px-6 py-2.5">Sign in</Link>
            <Link href="/auth/signup" className="btn-brand px-6 py-2.5">
              <Zap className="w-4 h-4" /> Create account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
