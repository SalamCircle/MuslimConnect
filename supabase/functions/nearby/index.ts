import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const EARTH_RADIUS_MILES = 3958.8;

interface NearbyRequest {
  lat: number;
  lng: number;
  radius?: number;
  limit?: number;
}

interface PlaceRow {
  id: string;
  name: string;
  city: string | null;
  region: string | null;
  postcode: string | null;
  latitude: number | null;
  longitude: number | null;
  address?: string | null;
  category?: string | null;
}

interface PlaceResult {
  id: string;
  name: string;
  city: string | null;
  region: string | null;
  postcode: string | null;
  category: string | null;
  distance_miles: number;
}

function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_MILES * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function geocodePostcode(postcode: string): Promise<{ lat: number; lng: number } | null> {
  const cleaned = postcode.replace(/\s+/g, "").toLowerCase();
  try {
    const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(cleaned)}`, {
      headers: { "User-Agent": "ConnectMuslim/1.0" },
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json?.status !== 200 || !json?.result) return null;
    return { lat: json.result.latitude, lng: json.result.longitude };
  } catch {
    return null;
  }
}

async function geocodeOutcode(postcode: string): Promise<{ lat: number; lng: number } | null> {
  const cleaned = postcode.split(/\s+/)[0].toLowerCase();
  try {
    const res = await fetch(`https://api.postcodes.io/outcodes/${encodeURIComponent(cleaned)}`, {
      headers: { "User-Agent": "ConnectMuslim/1.0" },
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json?.status !== 200 || !json?.result) return null;
    return { lat: json.result.latitude, lng: json.result.longitude };
  } catch {
    return null;
  }
}

async function resolvePostcodeCoords(rows: PlaceRow[]): Promise<void> {
  const needsGeocoding = rows.filter((r) => (r.latitude === null || r.longitude === null) && !!r.postcode);
  for (const row of needsGeocoding) {
    const coords = (await geocodePostcode(row.postcode!)) || (await geocodeOutcode(row.postcode!));
    if (coords) {
      row.latitude = coords.lat;
      row.longitude = coords.lng;
    }
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body: NearbyRequest = await req.json();
    const { lat, lng, radius = 25, limit = 6 } = body;

    if (typeof lat !== "number" || typeof lng !== "number") {
      return new Response(JSON.stringify({ error: "lat and lng are required numbers" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [mosquesRes, businessesRes] = await Promise.all([
      supabase
        .from("mosques")
        .select("id, name, city, region, postcode, latitude, longitude, address")
        .limit(200),
      supabase
        .from("businesses")
        .select("id, name, city, region, postcode, category")
        .limit(200),
    ]);

    const mosques = (mosquesRes.data ?? []) as unknown as PlaceRow[];
    const businesses = (businessesRes.data ?? []) as unknown as PlaceRow[];

    await resolvePostcodeCoords([...mosques, ...businesses]);

    const withDistance = <T extends PlaceRow>(rows: T[]): T[] =>
      rows
        .filter((r) => r.latitude !== null && r.longitude !== null)
        .map((r) => ({ ...r, distance_miles: haversineMiles(lat, lng, r.latitude!, r.longitude!) }))
        .filter((r) => r.distance_miles <= radius)
        .sort((a, b) => a.distance_miles - b.distance_miles)
        .slice(0, limit);

    const mosqueResults: PlaceResult[] = withDistance(mosques).map((r) => ({
      id: r.id,
      name: r.name,
      city: r.city,
      region: r.region,
      postcode: r.postcode,
      category: "mosque",
      distance_miles: Math.round((r as any).distance_miles * 10) / 10,
    }));

    const businessResults: PlaceResult[] = withDistance(businesses).map((r) => ({
      id: r.id,
      name: r.name,
      city: r.city,
      region: r.region,
      postcode: r.postcode,
      category: r.category ?? "business",
      distance_miles: Math.round((r as any).distance_miles * 10) / 10,
    }));

    return new Response(JSON.stringify({ mosques: mosqueResults, businesses: businessResults }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err?.message ?? err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
