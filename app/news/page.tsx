'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import PublicNav from '@/components/navigation/public-nav';
import type { News, NewsCategory } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { Globe, MapPin, Users, TrendingUp, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

const categories: { value: NewsCategory | 'all'; label: string; icon: React.ElementType }[] = [
  { value: 'all',       label: 'All',       icon: Globe },
  { value: 'uk',        label: 'UK',        icon: TrendingUp },
  { value: 'world',     label: 'World',     icon: Globe },
  { value: 'local',     label: 'Local',     icon: MapPin },
  { value: 'community', label: 'Community', icon: Users },
];

const catBadge: Record<string, string> = {
  uk:        'bg-blue-500/15 text-blue-400 border-blue-500/20',
  world:     'bg-violet-500/15 text-violet-400 border-violet-500/20',
  local:     'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  community: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  general:   'bg-white/10 text-white/50 border-white/10',
};

export default function NewsPage() {
  const [articles, setArticles] = useState<News[]>([]);
  const [filter, setFilter] = useState<NewsCategory | 'all'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      let q = supabase
        .from('news')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(30);
      if (filter !== 'all') q = q.eq('category', filter);
      const { data } = await q;
      setArticles((data as News[]) || []);
      setLoading(false);
    }
    load();
  }, [filter]);

  const featured = articles.filter((a) => a.is_featured);
  const rest = articles.filter((a) => !a.is_featured);

  return (
    <div className="min-h-screen bg-[#050505]">
      <PublicNav />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-[76px] py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Muslim News</h1>
          <p className="text-white/45 mt-1.5">Stay informed with the latest from the UK Muslim community and beyond.</p>
        </div>

        {/* Category tabs */}
        <div className="flex gap-1 border-b border-white/[0.06] mb-8 overflow-x-auto scrollbar-hide">
          {categories.map(({ value, label, icon: Icon }) => (
            <button key={value} onClick={() => setFilter(value)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap flex-shrink-0',
                filter === value ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-white/40 hover:text-white/70'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="glass-card overflow-hidden animate-pulse">
                <div className="h-48 bg-white/10" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-white/10 rounded w-3/4" />
                  <div className="h-3 bg-white/10 rounded w-full" />
                  <div className="h-3 bg-white/10 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <TrendingUp className="w-10 h-10 text-white/15 mx-auto mb-3" />
            <p className="text-white/40">No articles in this category yet.</p>
          </div>
        ) : (
          <>
            {/* Featured */}
            {featured.length > 0 && filter === 'all' && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Star className="w-4 h-4 text-amber-400" />
                  <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Featured</h2>
                </div>
                <div className="grid md:grid-cols-2 gap-5">
                  {featured.map((a) => (
                    <ArticleCard key={a.id} article={a} featured />
                  ))}
                </div>
              </div>
            )}

            {/* All articles */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {(filter === 'all' ? rest : articles).map((a) => (
                <ArticleCard key={a.id} article={a} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ArticleCard({ article, featured = false }: { article: News; featured?: boolean }) {
  const badgeCls = catBadge[article.category] ?? catBadge.general;

  return (
    <div className={cn('glass-card overflow-hidden group transition-all hover:border-white/15', featured && 'md:col-span-1')}>
      {article.image_url && (
        <div className="h-48 overflow-hidden">
          <img
            src={article.image_url}
            alt={article.title}
            className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500"
          />
        </div>
      )}
      <div className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full border', badgeCls)}>
            {article.category.charAt(0).toUpperCase() + article.category.slice(1)}
          </span>
          <span className="text-xs text-white/30">
            {formatDistanceToNow(new Date(article.published_at), { addSuffix: true })}
          </span>
        </div>
        <h3 className="text-sm font-semibold text-white leading-snug mb-2 group-hover:text-emerald-400 transition-colors line-clamp-2">
          {article.title}
        </h3>
        {article.excerpt && (
          <p className="text-xs text-white/50 leading-relaxed line-clamp-3">{article.excerpt}</p>
        )}
      </div>
    </div>
  );
}
