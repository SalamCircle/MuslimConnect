'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

export default function HomeSearchBar() {
  const [q, setQ] = useState('');
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = q.trim();
    if (!trimmed) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/25 pointer-events-none" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search people, groups, businesses, mosques, jobs, or events..."
        className="field-input pl-12 py-4 text-white/70 text-base w-full"
      />
      {q && (
        <button
          type="submit"
          className="absolute right-3 top-1/2 -translate-y-1/2 btn-brand text-sm px-4 py-2 rounded-lg"
        >
          Search
        </button>
      )}
    </form>
  );
}
