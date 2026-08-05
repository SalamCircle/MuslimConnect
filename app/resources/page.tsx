'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import PublicNav from '@/components/navigation/public-nav';
import type { Resource, ResourceCategory } from '@/lib/types';
import { BookOpen, BookMarked, Mic, FileText, GraduationCap, TrendingUp, Star, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

const categories: { value: ResourceCategory | 'all'; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'all',             label: 'All Resources', icon: BookOpen,       color: 'text-white/60' },
  { value: 'quran',           label: 'Quran',         icon: BookMarked,     color: 'text-emerald-400' },
  { value: 'hadith',          label: 'Hadith',        icon: BookOpen,       color: 'text-cyan-400' },
  { value: 'duas',            label: 'Duas',          icon: Mic,            color: 'text-amber-400' },
  { value: 'articles',        label: 'Articles',      icon: FileText,       color: 'text-blue-400' },
  { value: 'learning',        label: 'Learning',      icon: GraduationCap,  color: 'text-violet-400' },
  { value: 'islamic_finance', label: 'Finance',       icon: TrendingUp,     color: 'text-rose-400' },
];

const catMeta: Record<string, { color: string; bg: string; border: string }> = {
  quran:           { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  hadith:          { color: 'text-cyan-400',    bg: 'bg-cyan-500/10',    border: 'border-cyan-500/20' },
  duas:            { color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20' },
  articles:        { color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20' },
  learning:        { color: 'text-violet-400',  bg: 'bg-violet-500/10',  border: 'border-violet-500/20' },
  islamic_finance: { color: 'text-rose-400',    bg: 'bg-rose-500/10',    border: 'border-rose-500/20' },
};

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [filter, setFilter] = useState<ResourceCategory | 'all'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      let q = supabase.from('resources').select('*').order('is_featured', { ascending: false }).order('created_at', { ascending: false }).limit(40);
      if (filter !== 'all') q = q.eq('category', filter);
      const { data } = await q;
      setResources((data as Resource[]) || []);
      setLoading(false);
    }
    load();
  }, [filter]);

  return (
    <div className="min-h-screen bg-[#050505]">
      <PublicNav />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-[76px] py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Islamic Resources</h1>
          <p className="text-white/45 mt-1.5">Quran, Hadith, Duas, learning materials, and more — all in one place.</p>
        </div>

        {/* Category tabs */}
        <div className="flex gap-1 overflow-x-auto scrollbar-hide border-b border-white/[0.06] mb-8">
          {categories.map(({ value, label, icon: Icon, color }) => (
            <button key={value} onClick={() => setFilter(value)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap flex-shrink-0',
                filter === value ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-white/40 hover:text-white/70'
              )}
            >
              <Icon className={cn('w-4 h-4', filter === value ? 'text-emerald-400' : color)} />
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="glass-card p-5 animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-white/10 mb-3" />
                <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
                <div className="h-3 bg-white/10 rounded w-full mb-1" />
                <div className="h-3 bg-white/10 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : resources.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <BookOpen className="w-10 h-10 text-white/15 mx-auto mb-3" />
            <p className="text-white/40 mb-2">No resources in this category yet.</p>
            <Link href="/auth/signup" className="text-emerald-400 text-sm hover:underline">Join to contribute resources</Link>
          </div>
        ) : (
          <>
            {resources.filter((r) => r.is_featured).length > 0 && filter === 'all' && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Star className="w-4 h-4 text-amber-400" />
                  <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider">Featured</h2>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {resources.filter((r) => r.is_featured).map((r) => (
                    <ResourceCard key={r.id} resource={r} />
                  ))}
                </div>
              </div>
            )}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {(filter === 'all' ? resources.filter((r) => !r.is_featured) : resources).map((r) => (
                <ResourceCard key={r.id} resource={r} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ResourceCard({ resource }: { resource: Resource }) {
  const meta = catMeta[resource.category] ?? { color: 'text-white/60', bg: 'bg-white/5', border: 'border-white/10' };
  const catLabel = resource.category.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const cat = categories.find((c) => c.value === resource.category);
  const Icon = cat?.icon ?? BookOpen;

  return (
    <div className={cn('glass-card p-5 border flex flex-col', meta.border, meta.bg)}>
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-black/20 flex items-center justify-center flex-shrink-0">
          <Icon className={cn('w-5 h-5', meta.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <span className={cn('text-xs font-medium', meta.color)}>{catLabel}</span>
          {resource.is_featured && <span className="ml-2 text-xs text-amber-400/70">Featured</span>}
        </div>
      </div>
      <h3 className="text-sm font-semibold text-white leading-snug mb-2">{resource.title}</h3>
      {resource.description && (
        <p className="text-xs text-white/50 leading-relaxed flex-1 mb-4 line-clamp-3">{resource.description}</p>
      )}
      {resource.url && (
        <a href={resource.url} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors mt-auto"
        >
          <ExternalLink className="w-3 h-3" /> Open Resource
        </a>
      )}
    </div>
  );
}
