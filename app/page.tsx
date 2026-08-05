import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import PublicNav from '@/components/navigation/public-nav';
import NearbyDiscovery from '@/components/home/nearby-discovery';
import {
  ArrowRight, UserPlus, Users, MapPin,
  Store, Calendar, Building,
  ShieldCheck, Eye, Moon, Star, CheckCircle2, Sparkles,
} from 'lucide-react';
import type { PostWithAuthor, Event, Community, Job, Mosque, Business } from '@/lib/types';

async function fetchHomeData() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const MAN_REGION = 'North West';
  const MAN_CITIES = ['Manchester', 'Salford', 'Oldham', 'Bolton', 'Bury', 'Rochdale', 'Stockport', 'Ashton-under-Lyne'];

  const [postsRes, eventsRes, commRes, jobsRes, mosquesRes, businessesRes] = await Promise.all([
    supabase.from('posts')
      .select('*, profiles!posts_user_id_fkey!left(id, full_name, avatar_url, city, region, username), communities!posts_community_id_fkey!left(id, name, category, slug)')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(2),
    supabase.from('events')
      .select('*')
      .eq('status', 'approved')
      .gte('start_datetime', new Date().toISOString())
      .or(`city.in.(${MAN_CITIES.join(',')}),region.eq.${MAN_REGION}`)
      .order('is_featured', { ascending: false })
      .order('start_datetime', { ascending: true })
      .limit(4),
    supabase.from('communities')
      .select('*')
      .eq('is_public', true)
      .order('member_count', { ascending: false })
      .limit(4),
    supabase.from('jobs')
      .select('*')
      .eq('status', 'approved')
      .or(`city.in.(${MAN_CITIES.join(',')}),region.eq.${MAN_REGION},city.is.null`)
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(4),
    supabase.from('mosques')
      .select('id, name, city, region, postcode, is_verified')
      .or(`city.in.(${MAN_CITIES.join(',')}),region.eq.${MAN_REGION}`)
      .order('is_verified', { ascending: false })
      .order('name', { ascending: true })
      .limit(4),
    supabase.from('businesses')
      .select('id, name, category, city, region, description, is_verified, is_sponsored')
      .or(`city.in.(${MAN_CITIES.join(',')}),region.eq.${MAN_REGION}`)
      .order('is_sponsored', { ascending: false })
      .order('is_verified', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(4),
  ]);

  const mosqueCount = await supabase.from('mosques').select('id', { count: 'exact', head: true });
  const businessCount = await supabase.from('businesses').select('id', { count: 'exact', head: true });
  const eventCount = await supabase.from('events')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'approved')
    .gte('start_datetime', new Date().toISOString());
  const jobCount = await supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'approved');

  return {
    posts: (postsRes.data as unknown as PostWithAuthor[]) || [],
    events: (eventsRes.data as Event[]) || [],
    communities: (commRes.data as Community[]) || [],
    jobs: (jobsRes.data as Job[]) || [],
    mosques: (mosquesRes.data as unknown as Pick<Mosque, 'id'|'name'|'city'|'region'|'postcode'|'is_verified'>[]) || [],
    businesses: (businessesRes.data as unknown as Pick<Business, 'id'|'name'|'category'|'city'|'region'|'description'|'is_verified'|'is_sponsored'>[]) || [],
    counts: {
      mosques: mosqueCount.count ?? 0,
      businesses: businessCount.count ?? 0,
      events: eventCount.count ?? 0,
      jobs: jobCount.count ?? 0,
    },
  };
}

const platformCards = [
  { icon: Calendar,  label: 'Events',     desc: 'Discover local events',          href: '/events',      color: 'text-violet-400',  bg: 'bg-violet-500/10 border-violet-500/20',   access: 'public',  accessLabel: 'No login needed' },
  { icon: Users,     label: 'Groups',     desc: 'Join interest groups',           href: '/communities', color: 'text-cyan-400',    bg: 'bg-cyan-500/10 border-cyan-500/20',       access: 'public',  accessLabel: 'Browse publicly' },
  { icon: Building,  label: 'Mosques',    desc: 'Find a mosque near you',         href: '/mosques',     color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20',       access: 'public',  accessLabel: 'No login needed' },
  { icon: Store,     label: 'Businesses', desc: 'Muslim-owned businesses',        href: '/businesses',  color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20',     access: 'public',  accessLabel: 'No login needed' },
  { icon: Store,     label: 'Jobs',       desc: 'Find your next opportunity',     href: '/jobs',        color: 'text-rose-400',    bg: 'bg-rose-500/10 border-rose-500/20',       access: 'public',  accessLabel: 'No login needed' },
  { icon: Users,     label: 'Community',  desc: 'Read and join discussions',      href: '/board',       color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', access: 'public',  accessLabel: 'Browse publicly' },
];

const whyUs = [
  { icon: MapPin,    title: 'Built for Manchester first',    desc: 'A focused, local directory of events, groups, mosques, businesses and jobs across Greater Manchester — useful from your very first visit, before thousands join.' },
  { icon: ShieldCheck,title: 'Trusted and verified listings', desc: 'Verified businesses and mosques, clear community guidelines, and active moderation keep the space respectful and reliable.' },
  { icon: Sparkles,  title: 'Everything in one place',        desc: 'Events, groups, mosques, businesses and jobs — no more juggling five different apps and WhatsApp groups to find what is happening near you.' },
  { icon: Moon,      title: 'Built around Islamic values',    desc: 'Designed for the Manchester Muslim community, with respect, modesty and shared values at its core.' },
];

const businessCategoryLabels: Record<string, string> = {
  halal_restaurant: 'Restaurant', restaurant: 'Restaurant', grocery: 'Grocery',
  accountancy: 'Accountancy', retail: 'Shop', service: 'Service', tutor: 'Tutor',
  islamic_school: 'Islamic School', islamic_finance: 'Islamic Finance',
  muslim_business: 'Business', other: 'Business',
};

const footerColumns = [
  {
    title: 'Discover',
    links: [
      { label: 'Events', href: '/events' },
      { label: 'Groups', href: '/communities' },
      { label: 'Mosques', href: '/mosques' },
      { label: 'Businesses', href: '/businesses' },
      { label: 'Jobs', href: '/jobs' },
      { label: 'Community', href: '/board' },
    ],
  },
  {
    title: 'Platform',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Community Guidelines', href: '/safety' },
      { label: 'Safety Centre', href: '/safety' },
    ],
  },
  {
    title: 'For Organisations',
    links: [
      { label: 'List your business', href: '/businesses' },
      { label: 'Promote an event', href: '/events' },
      { label: 'Post a job', href: '/jobs' },
      { label: 'Get verified', href: '/about' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Contact', href: '/about' },
      { label: 'Report a Concern', href: '/about' },
      { label: 'Help Centre', href: '/about' },
    ],
  },
];

export default async function HomePage() {
  const { posts, events, communities, jobs, mosques, businesses, counts } = await fetchHomeData();
  const manchesterCounters = [
    { label: 'mosques listed', value: counts.mosques, icon: Building, href: '/mosques' },
    { label: 'businesses', value: counts.businesses, icon: Store, href: '/businesses' },
    { label: 'upcoming events', value: counts.events, icon: Calendar, href: '/events' },
    { label: 'jobs & roles', value: counts.jobs, icon: Users, href: '/jobs' },
  ];

  return (
    <div className="min-h-screen bg-[#050505]">
      <PublicNav />

      {/* Hero */}
      <section className="relative flex items-center justify-center overflow-hidden pt-16 pb-12">
        <div className="absolute inset-0 dot-grid opacity-50" />
        <div className="absolute top-[15%] left-[10%] w-[420px] h-[420px] rounded-full bg-emerald-500/8 blur-3xl animate-float" />
        <div className="absolute bottom-[10%] right-[10%] w-[360px] h-[360px] rounded-full bg-cyan-500/8 blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="relative z-10 text-center max-w-3xl mx-auto px-6 animate-fade-up">
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-5 text-sm text-white/65">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            Connecting Muslim communities across the UK
          </div>
          <h1 className="text-[2.25rem] sm:text-5xl font-bold text-white leading-[1.08] mb-4 tracking-tight">
            Connect with Muslims <span className="text-gradient">near you</span>
          </h1>
          <p className="text-base sm:text-lg text-white/60 max-w-xl mx-auto mb-6 leading-relaxed">
            Discover local events, groups, mosques, Muslim-owned businesses and opportunities near you.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-5">
            <Link href="/events" className="btn-brand text-base px-7 py-3 glow-md">
              Explore the community <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/auth/signup" className="btn-ghost text-base px-7 py-3">
              <UserPlus className="w-4 h-4" /> Join ConnectMuslim
            </Link>
          </div>

          {/* Manchester counters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto mt-7">
            {manchesterCounters.map(({ label, value, icon: Icon, href }) => (
              <Link key={label} href={href}>
                <div className="glass-card p-4 text-center hover:scale-[1.03] transition-all duration-200">
                  <Icon className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
                  <p className="text-2xl font-bold text-white">{value}</p>
                  <p className="text-xs text-white/45 mt-0.5">{label}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Explore freely panel */}
      <section className="py-5 px-6 border-t border-white/[0.04] bg-emerald-500/[0.02]">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-3 sm:gap-5 text-center sm:text-left">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <Eye className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1">
            <p className="text-base font-semibold text-white">Explore without an account</p>
            <p className="text-sm text-white/55 leading-relaxed">
              Browse public posts, events, groups, mosques, businesses and jobs. Create a free account when you want to join discussions, save content or message members.
            </p>
          </div>
        </div>
      </section>

      {/* Location discovery */}
      <section className="py-16 px-6 border-t border-white/[0.04]">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-7">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">What is happening near you?</h2>
            <p className="text-white/55 text-base">Find mosques, Muslim-owned businesses and events around Manchester. Enter a postcode, area, or use your location.</p>
          </div>
          <NearbyDiscovery />
        </div>
      </section>

      {/* Platform categories — discovery first */}
      <section className="py-16 px-6 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Everything in one place</h2>
            <p className="text-white/55 text-base">Six trusted directories for the Manchester Muslim community.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {platformCards.map(({ icon: Icon, label, desc, href, color, bg, access, accessLabel }) => (
              <Link key={label} href={href}>
                <div className={`glass-card border p-5 flex flex-col items-start gap-3 hover:scale-[1.03] transition-all duration-200 min-h-[140px] ${bg}`}>
                  <div className="flex items-center justify-between w-full">
                    <div className="w-12 h-12 rounded-xl bg-black/25 flex items-center justify-center">
                      <Icon className={`w-6 h-6 ${color}`} />
                    </div>
                    {access === 'public' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400/80 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">
                        <Eye className="w-3 h-3" /> Public
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5">
                        Public
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-base font-semibold text-white">{label}</p>
                    <p className="text-sm text-white/45 leading-snug mt-0.5">{desc}</p>
                    <p className="text-[11px] text-white/30 mt-1">{accessLabel}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Upcoming events — first directory */}
      <section className="py-16 px-6 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-6 gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1.5">Upcoming Events in Manchester</h2>
              <p className="text-white/55 text-sm">Browse public events freely. Sign in to save an event or register your interest.</p>
            </div>
            <Link href="/events" className="btn-ghost text-sm px-4 py-2.5 whitespace-nowrap flex-shrink-0">
              View all events <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {events.length > 0 ? (
            <div className="grid sm:grid-cols-2 gap-5">
              {events.map((e) => {
                const cat = (e.category ?? 'event').replace('_', ' ');
                const dateStr = new Date(e.start_datetime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                return (
                  <Link key={e.id} href="/events">
                    <div className={`glass-card p-5 hover:scale-[1.02] transition-all duration-200 border ${e.is_featured ? 'border-amber-500/20 bg-amber-500/5' : 'border-white/[0.06]'} min-h-[120px]`}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-xs font-medium text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2.5 py-0.5 rounded-full capitalize">{cat}</span>
                        {e.is_featured && (
                          <span className="flex items-center gap-0.5 text-[10px] font-medium text-amber-400">
                            <Star className="w-3 h-3 fill-amber-400" /> Featured
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-semibold text-white mt-2 mb-2 leading-snug">{e.title}</h3>
                      {e.description && <p className="text-xs text-white/45 leading-relaxed line-clamp-2 mb-3">{e.description}</p>}
                      <div className="flex items-center gap-3 text-sm text-white/45">
                        <span className="flex items-center gap-1"><Calendar className="w-4 h-4 text-emerald-400/60" />{dateStr}</span>
                        {e.city && <span className="flex items-center gap-1"><MapPin className="w-4 h-4 text-white/30" />{e.city}</span>}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="glass-card p-10 text-center border border-white/[0.06]">
              <Calendar className="w-10 h-10 text-white/15 mx-auto mb-3" />
              <p className="text-white/55 font-medium">We&apos;re adding Manchester events now</p>
              <p className="text-white/35 text-sm mt-1.5">Know of an event we should include? <Link href="/about" className="text-emerald-400 hover:underline">Tell us about it</Link>.</p>
            </div>
          )}
        </div>
      </section>

      {/* Mosques */}
      <section className="py-16 px-6 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-6 gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1.5">Mosques in Greater Manchester</h2>
              <p className="text-white/55 text-sm">Search mosque listings without an account. Sign in to suggest updates or manage a listing.</p>
            </div>
            <Link href="/mosques" className="btn-ghost text-sm px-4 py-2.5 whitespace-nowrap flex-shrink-0">
              View all mosques <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {mosques.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {mosques.map((m) => (
                <Link key={m.id} href="/mosques">
                  <div className="glass-card p-5 hover:scale-[1.02] transition-all duration-200 border border-blue-500/10 bg-blue-500/[0.04] min-h-[130px]">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                        <Building className="w-5.5 h-5.5 text-blue-400" />
                      </div>
                      {m.is_verified && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                    </div>
                    <p className="text-sm font-semibold text-white leading-snug mb-1">{m.name}</p>
                    <p className="text-xs text-white/45 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />{m.city ? `${m.city}` : 'Manchester'}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="glass-card p-10 text-center border border-white/[0.06]">
              <Building className="w-10 h-10 text-white/15 mx-auto mb-3" />
              <p className="text-white/55 font-medium">We&apos;re adding Manchester mosques now</p>
              <p className="text-white/35 text-sm mt-1.5">Know a mosque we should include? <Link href="/about" className="text-emerald-400 hover:underline">Suggest it here</Link>.</p>
            </div>
          )}
        </div>
      </section>

      {/* Muslim-owned businesses */}
      <section className="py-16 px-6 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-6 gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1.5">Muslim-Owned Businesses</h2>
              <p className="text-white/55 text-sm">Browse local businesses freely. Sign in to save favourites, leave feedback or claim a listing.</p>
            </div>
            <Link href="/businesses" className="btn-ghost text-sm px-4 py-2.5 whitespace-nowrap flex-shrink-0">
              View all businesses <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {businesses.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {businesses.map((b) => {
                const category = b.category;
                const desc = b.description;
                return (
                  <Link key={b.id} href="/businesses">
                    <div className={`glass-card p-5 hover:scale-[1.02] transition-all duration-200 border ${b.is_sponsored ? 'border-amber-500/20 bg-amber-500/5' : 'border-amber-500/10 bg-amber-500/[0.04]'} min-h-[130px]`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                          <Store className="w-5.5 h-5.5 text-amber-400" />
                        </div>
                        <div className="flex items-center gap-1">
                          {b.is_sponsored && <span className="text-[10px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-1.5 py-0.5">Featured</span>}
                          {b.is_verified && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-white leading-snug mb-1">{b.name}</p>
                      <span className="inline-block text-[11px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5 mb-1.5">
                        {businessCategoryLabels[category] ?? category}
                      </span>
                      {desc && <p className="text-xs text-white/45 leading-relaxed line-clamp-2">{desc}</p>}
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="glass-card p-10 text-center border border-white/[0.06]">
              <Store className="w-10 h-10 text-white/15 mx-auto mb-3" />
              <p className="text-white/55 font-medium">We&apos;re adding Manchester businesses now</p>
              <p className="text-white/35 text-sm mt-1.5">Run a Muslim-owned business in Manchester? <Link href="/about" className="text-emerald-400 hover:underline">Get listed</Link>.</p>
            </div>
          )}
        </div>
      </section>

      {/* Latest jobs */}
      <section className="py-16 px-6 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-6 gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1.5">Jobs &amp; Volunteering in Manchester</h2>
              <p className="text-white/55 text-sm">Browse opportunities without logging in. Sign in to save jobs or contact the advertiser.</p>
            </div>
            <Link href="/jobs" className="btn-ghost text-sm px-4 py-2.5 whitespace-nowrap flex-shrink-0">
              Browse all jobs <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {jobs.length > 0 ? (
            <div className="space-y-3">
              {jobs.map((j) => {
                const location = j.city || j.location;
                const type = (j.job_type ?? 'job').replace('_', ' ');
                return (
                  <Link key={j.id} href="/jobs">
                    <div className={`glass-card p-5 flex items-center gap-4 hover:scale-[1.01] transition-all duration-200 border ${j.is_featured ? 'border-amber-500/20 bg-amber-500/5' : 'border-white/[0.06]'} min-h-[72px]`}>
                      <div className="w-11 h-11 rounded-xl bg-black/20 flex items-center justify-center flex-shrink-0">
                        {j.job_type === 'volunteer' ? <Users className="w-5.5 h-5.5 text-rose-400" /> : <Store className="w-5.5 h-5.5 text-rose-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-semibold text-white">{j.title}</p>
                        <p className="text-sm text-white/50 mt-0.5">{j.employer}</p>
                      </div>
                      <div className="hidden sm:flex flex-col items-end gap-1">
                        {location && <span className="text-sm text-white/50 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{location}</span>}
                        <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full capitalize">{type}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="glass-card p-10 text-center border border-white/[0.06]">
              <Store className="w-10 h-10 text-white/15 mx-auto mb-3" />
              <p className="text-white/55 font-medium">We&apos;re adding Manchester jobs now</p>
              <p className="text-white/35 text-sm mt-1.5">Hiring in Manchester? <Link href="/about" className="text-emerald-400 hover:underline">Post a role</Link>.</p>
            </div>
          )}
        </div>
      </section>

      {/* Discover groups */}
      <section className="py-16 px-6 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-6 gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1.5">Discover Groups</h2>
              <p className="text-white/55 text-sm">Explore public groups. Sign in to join and participate.</p>
            </div>
            <Link href="/communities" className="btn-ghost text-sm px-4 py-2.5 whitespace-nowrap flex-shrink-0">
              Discover more groups <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {communities.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {communities.map((c) => (
                <Link key={c.id} href={c.slug ? `/community/${c.slug}` : '/communities'}>
                  <div className="glass-card border border-emerald-500/10 bg-emerald-500/5 p-5 hover:scale-[1.02] transition-all duration-200 min-h-[130px]">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                        <Users className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white leading-tight">{c.name}</p>
                        <p className="text-xs text-emerald-400">{c.member_count.toLocaleString()} {c.member_count === 1 ? 'member' : 'members'}</p>
                      </div>
                    </div>
                    {c.description && <p className="text-xs text-white/45 leading-relaxed line-clamp-2">{c.description}</p>}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="glass-card p-10 text-center border border-white/[0.06]">
              <Users className="w-10 h-10 text-white/15 mx-auto mb-3" />
              <p className="text-white/55 font-medium">Community groups are coming soon</p>
              <p className="text-white/35 text-sm mt-1.5"><Link href="/auth/signup" className="text-emerald-400 hover:underline">Join free</Link> to be notified when groups open.</p>
            </div>
          )}
        </div>
      </section>

      {/* Latest community posts — demoted below directories */}
      <section className="py-16 px-6 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-6 gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1.5">Community Posts</h2>
              <p className="text-white/55 text-sm">Anyone can browse. Sign in to post, comment or react.</p>
            </div>
            <Link href="/board" className="btn-ghost text-sm px-4 py-2.5 whitespace-nowrap flex-shrink-0">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {posts.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              {posts.map((p) => {
                const author = p.profiles;
                const initials = author?.full_name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() ?? '?';
                const authorHref = author?.username ? `/user/${author.username}` : '#';
                const postHref = p.slug ? `/post/${p.slug}` : '/board';
                return (
                  <div key={p.id} className="glass-card p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-brand flex items-center justify-center text-sm font-bold text-white flex-shrink-0">{initials}</div>
                      <div>
                        <Link href={authorHref}><p className="text-sm font-semibold text-white hover:text-emerald-400 transition-colors">{author?.full_name ?? 'Community Member'}</p></Link>
                        <p className="text-[13px] text-white/40 flex items-center gap-1">
                          {author?.city && <><MapPin className="w-3 h-3" />{author.city} · </>}
                          {new Date(p.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Link href={postHref}>
                      <p className="text-base text-white/75 leading-relaxed mb-3 line-clamp-3 hover:text-white/90 transition-colors">{p.content}</p>
                    </Link>
                    <div className="flex items-center gap-4 text-[13px] text-white/35">
                      <span>{p.like_count} likes</span><span>{p.comment_count} replies</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="glass-card p-10 text-center border border-white/[0.06]">
              <Users className="w-10 h-10 text-white/15 mx-auto mb-3" />
              <p className="text-white/55 font-medium">Community discussions will appear here</p>
              <p className="text-white/35 text-sm mt-1.5">Once members join, this is where conversations happen. <Link href="/auth/signup" className="text-emerald-400 hover:underline">Join free</Link> to start one.</p>
            </div>
          )}
        </div>
      </section>

      {/* Why ConnectMuslim — Manchester focused */}
      <section className="py-16 px-6 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Why ConnectMuslim?</h2>
            <p className="text-white/55 text-base">A focused, trusted place for the Manchester Muslim community — discovery and opportunity in one place.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {whyUs.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="glass-card p-6 flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white mb-1.5">{title}</h3>
                  <p className="text-sm text-white/55 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 border-t border-white/[0.04]">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-brand flex items-center justify-center mx-auto mb-7 glow-md animate-pulse-glow">
            <Moon className="w-8 h-8 text-white" fill="white" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Ready to join your <span className="text-gradient">Manchester community?</span>
          </h2>
          <p className="text-white/55 text-lg mb-7">Free forever. Create an account when you are ready to participate.</p>
          <div className="flex flex-col sm:flex-row gap-3.5 justify-center">
            <Link href="/events" className="btn-brand text-base px-10 py-4 glow-md">
              Explore the community <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/auth/signup" className="btn-ghost text-base px-8 py-4">
              <UserPlus className="w-4 h-4" /> Join ConnectMuslim Free
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-14 px-6 bg-black/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-10">
            <div className="col-span-2 sm:col-span-1">
              <Link href="/" className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-lg bg-gradient-brand flex items-center justify-center">
                  <Moon className="w-4.5 h-4.5 text-white" fill="white" />
                </div>
                <span className="font-bold text-white text-base">ConnectMuslim</span>
              </Link>
              <p className="text-sm text-white/45 leading-relaxed max-w-xs">
                The Manchester Muslim community platform. Discover events, groups, mosques, businesses and jobs near you.
              </p>
              <p className="text-xs text-white/30 mt-3">Launching in Manchester · More cities coming soon</p>
            </div>
            {footerColumns.map((col) => (
              <div key={col.title}>
                <p className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-3.5">{col.title}</p>
                <div className="space-y-2.5">
                  {col.links.map((link) => (
                    <Link key={link.label} href={link.href} className="block text-sm text-white/45 hover:text-white/80 transition-colors">
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-white/[0.06] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-white/35">© 2026 ConnectMuslim. Built for the Manchester Muslim community.</p>
            <div className="flex items-center gap-5">
              <Link href="/about" className="text-sm text-white/40 hover:text-white/70 transition-colors">Privacy</Link>
              <Link href="/about" className="text-sm text-white/40 hover:text-white/70 transition-colors">Terms</Link>
              <Link href="/about" className="text-sm text-white/40 hover:text-white/70 transition-colors">About</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
