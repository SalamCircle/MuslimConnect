'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, LocateFixed, Loader2, Building, Store, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface NearbyPlace {
  id: string;
  name: string;
  city: string | null;
  region: string | null;
  postcode: string | null;
  category: string | null;
  distance_miles: number;
}

const PLACE_CATEGORY_LABELS: Record<string, string> = {
  mosque: 'Mosque',
  restaurant: 'Restaurant',
  grocery: 'Grocery',
  accountancy: 'Accountancy',
  retail: 'Shop',
  service: 'Service',
  other: 'Business',
};

function categoryLabel(cat: string | null, isMosque: boolean): string {
  if (isMosque) return 'Mosque';
  if (cat && PLACE_CATEGORY_LABELS[cat]) return PLACE_CATEGORY_LABELS[cat];
  return 'Business';
}

export default function NearbyDiscovery() {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [mosques, setMosques] = useState<NearbyPlace[]>([]);
  const [businesses, setBusinesses] = useState<NearbyPlace[]>([]);
  const [searched, setSearched] = useState(false);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const router = useRouter();

  async function runSearch(lat: number, lng: number, label?: string) {
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/nearby`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ lat, lng, radius: 30, limit: 3 }),
      });
      if (!res.ok) throw new Error(`Search failed (${res.status})`);
      const data = await res.json();
      if (!data || typeof data !== 'object' || !('mosques' in data) || !('businesses' in data)) {
        throw new Error('Unexpected response shape');
      }
      setMosques(Array.isArray(data.mosques) ? data.mosques : []);
      setBusinesses(Array.isArray(data.businesses) ? data.businesses : []);
      if (label) setLocationLabel(label);
    } catch (err) {
      toast.error('Could not fetch nearby places. Please try again.');
      setMosques([]);
      setBusinesses([]);
    } finally {
      setLoading(false);
    }
  }

  async function geocodeAndSearch(rawLocation: string) {
    const trimmed = rawLocation.trim();
    if (!trimmed) return;
    setLoading(true);
    setSearched(true);
    try {
      const looksLikePostcode = /^[A-Za-z]{1,2}\d/.test(trimmed);
      let coords: { lat: number; lng: number } | null = null;

      if (looksLikePostcode) {
        const cleaned = trimmed.replace(/\s+/g, '').toLowerCase();
        const fullRes = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(cleaned)}`);
        if (fullRes.ok) {
          const j = await fullRes.json();
          if (j?.status === 200 && j?.result) coords = { lat: j.result.latitude, lng: j.result.longitude };
        }
        if (!coords) {
          const outcode = trimmed.split(/\s+/)[0].toLowerCase();
          const outRes = await fetch(`https://api.postcodes.io/outcodes/${encodeURIComponent(outcode)}`);
          if (outRes.ok) {
            const j = await outRes.json();
            if (j?.status === 200 && j?.result) coords = { lat: j.result.latitude, lng: j.result.longitude };
          }
        }
      }

      if (!coords) {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trimmed + ', UK')}&limit=1`,
          { headers: { 'User-Agent': 'ConnectMuslim/1.0' } },
        );
        if (geoRes.ok) {
          const arr = await geoRes.json();
          if (Array.isArray(arr) && arr.length > 0 && arr[0].lat && arr[0].lon) {
            coords = { lat: parseFloat(arr[0].lat), lng: parseFloat(arr[0].lon) };
          }
        }
      }

      if (!coords) {
        toast.error('Could not find that location. Try a town, city or postcode.');
        setMosques([]);
        setBusinesses([]);
        setSearched(true);
        setLoading(false);
        return;
      }
      await runSearch(coords.lat, coords.lng, trimmed);
    } catch {
      toast.error('Something went wrong finding that location.');
      setMosques([]);
      setBusinesses([]);
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    geocodeAndSearch(q);
  }

  function useMyLocation() {
    if (!('geolocation' in navigator)) {
      toast.error('Geolocation is not supported on this device.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLocating(false);
        setLocationLabel('Your current location');
        await runSearch(pos.coords.latitude, pos.coords.longitude, 'Your current location');
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          toast.error('Location permission denied. Enter a town or postcode instead.');
        } else {
          toast.error('Could not get your location. Try a town or postcode instead.');
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }

  const hasResults = mosques.length > 0 || businesses.length > 0;

  return (
    <div>
      <div className="glass-card p-5 sm:p-7 rounded-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 pointer-events-none" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Enter town, city or postcode"
              className="w-full glass-input rounded-xl pl-12 pr-4 py-3.5 text-base text-white placeholder-white/35 outline-none"
              aria-label="Enter town, city or postcode"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-brand text-[15px] px-6 py-3.5 whitespace-nowrap">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            Explore nearby
          </button>
        </form>

        <div className="flex items-center gap-3 mt-3.5">
          <span className="text-sm text-white/40">or</span>
          <button
            onClick={useMyLocation}
            disabled={locating || loading}
            className="inline-flex items-center gap-2 text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors disabled:opacity-50"
          >
            {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />}
            Use my location
          </button>
        </div>
        <p className="text-xs text-white/35 mt-2">
          We&apos;ll ask for your permission before using your location. Your exact position is never stored.
        </p>
      </div>

      {searched && !loading && !hasResults && (
        <div className="glass-card p-8 text-center rounded-2xl mt-4">
          <MapPin className="w-8 h-8 text-white/15 mx-auto mb-3" />
          <p className="text-white/55 text-sm">
            No mosques or Muslim-owned businesses found within 30 miles{locationLabel ? ` of ${locationLabel}` : ''}.
          </p>
          <p className="text-white/35 text-xs mt-1.5">
            Try a different location, or <button onClick={() => router.push('/mosques')} className="text-emerald-400 hover:underline">browse all mosques</button>.
          </p>
        </div>
      )}

      {searched && (hasResults || loading) && (
        <div className="grid md:grid-cols-2 gap-4 mt-4">
          {/* Mosques near you */}
          <div className="glass-card p-5 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Building className="w-4.5 h-4.5 text-emerald-400" /> Mosques near you
              </h3>
              <button onClick={() => router.push('/mosques')} className="text-xs font-medium text-emerald-400 hover:underline">
                View all
              </button>
            </div>
            {loading ? (
              <div className="space-y-2.5">
                {[0, 1, 2].map((i) => <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />)}
              </div>
            ) : mosques.length === 0 ? (
              <p className="text-sm text-white/40 py-3">No mosques found nearby.</p>
            ) : (
              <ul className="space-y-2">
                {mosques.map((m) => (
                  <li key={m.id}>
                    <button
                      onClick={() => router.push('/mosques')}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/10 transition-all text-left"
                    >
                      <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                        <Building className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{m.name}</p>
                        <p className="text-xs text-white/40 truncate">{m.city ? `${m.city} · ` : ''}{categoryLabel(m.category, true)}</p>
                      </div>
                      <span className="text-xs font-medium text-emerald-400 whitespace-nowrap flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {m.distance_miles} mi
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Businesses near you */}
          <div className="glass-card p-5 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Store className="w-4.5 h-4.5 text-amber-400" /> Muslim-owned businesses
              </h3>
              <button onClick={() => router.push('/businesses')} className="text-xs font-medium text-amber-400 hover:underline">
                View all
              </button>
            </div>
            {loading ? (
              <div className="space-y-2.5">
                {[0, 1, 2].map((i) => <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />)}
              </div>
            ) : businesses.length === 0 ? (
              <p className="text-sm text-white/40 py-3">No businesses found nearby yet.</p>
            ) : (
              <ul className="space-y-2">
                {businesses.map((b) => (
                  <li key={b.id}>
                    <button
                      onClick={() => router.push('/businesses')}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/10 transition-all text-left"
                    >
                      <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                        <Store className="w-4 h-4 text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{b.name}</p>
                        <p className="text-xs text-white/40 truncate">{b.city ? `${b.city} · ` : ''}{categoryLabel(b.category, false)}</p>
                      </div>
                      <span className="text-xs font-medium text-amber-400 whitespace-nowrap flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {b.distance_miles} mi
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
