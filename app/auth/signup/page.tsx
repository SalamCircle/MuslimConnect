'use client';

import { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Moon, Eye, EyeOff, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const UK_CITIES_BY_REGION: Record<string, string[]> = {
  'London': [
    'Barking','Barnet','Bexley','Brent','Bromley','Camden','City of London',
    'Croydon','Ealing','Enfield','Greenwich','Hackney','Hammersmith','Haringey',
    'Harrow','Havering','Hillingdon','Hounslow','Islington','Kensington','Kingston',
    'Lambeth','Lewisham','Merton','Newham','Redbridge','Richmond','Southwark',
    'Sutton','Tower Hamlets','Waltham Forest','Wandsworth','Westminster',
  ],
  'North West': [
    'Blackburn','Blackpool','Bolton','Burnley','Bury','Chester','Leigh',
    'Liverpool','Manchester','Oldham','Preston','Rochdale','Salford',
    'Stockport','Wigan','Wirral',
  ],
  'Yorkshire and The Humber': [
    'Bradford','Doncaster','Harrogate','Huddersfield','Hull','Leeds',
    'Rotherham','Sheffield','Wakefield','York',
  ],
  'West Midlands': [
    'Birmingham','Coventry','Dudley','Sandwell','Solihull','Stoke-on-Trent',
    'Walsall','Wolverhampton','Worcester',
  ],
  'East Midlands': [
    'Derby','Leicester','Lincoln','Loughborough','Mansfield','Northampton',
    'Nottingham','Peterborough',
  ],
  'East of England': [
    'Cambridge','Chelmsford','Colchester','Ipswich','Luton','Norwich',
    'Southend-on-Sea','Stevenage','Watford',
  ],
  'South East': [
    'Brighton','Canterbury','Guildford','Milton Keynes','Oxford','Portsmouth',
    'Reading','Slough','Southampton','Swindon',
  ],
  'South West': [
    'Bath','Bournemouth','Bristol','Cheltenham','Exeter','Gloucester',
    'Plymouth','Taunton','Torquay',
  ],
  'North East': [
    'Durham','Gateshead','Middlesbrough','Newcastle upon Tyne','Sunderland',
  ],
  'Scotland': [
    'Aberdeen','Dundee','Edinburgh','Glasgow','Inverness','Perth','Stirling',
  ],
  'Wales': [
    'Cardiff','Newport','Swansea','Wrexham',
  ],
  'Northern Ireland': [
    'Belfast','Derry','Lisburn','Newry',
  ],
};

const UK_REGIONS = Object.keys(UK_CITIES_BY_REGION).sort();

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const cityInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    full_name: '', email: '', password: '',
    country: 'United Kingdom', region: '', city: '', postcode: '',
    gender: 'prefer_not_to_say', date_of_birth: '',
  });

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  function handleRegionChange(region: string) {
    set('region', region);
    set('city', '');
    setCitySearch('');
  }

  function handleCitySelect(city: string) {
    set('city', city);
    setCitySearch(city);
    setShowCityDropdown(false);
  }

  const availableCities = useMemo(() => {
    const cities = form.region ? (UK_CITIES_BY_REGION[form.region] ?? []) : [];
    const q = citySearch.trim().toLowerCase();
    return q ? cities.filter((c) => c.toLowerCase().includes(q)) : cities;
  }, [form.region, citySearch]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step === 1) { setStep(2); return; }
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.full_name } },
    });
    if (error) { toast.error(error.message); setLoading(false); return; }

    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: form.full_name,
        email: form.email,
        country: form.country,
        region: form.region || null,
        city: form.city || null,
        postcode: form.postcode || null,
        gender: form.gender,
        date_of_birth: form.date_of_birth || null,
      }, { onConflict: 'id' });
      if (profileError) {
        toast.error('Account created, but we could not save your profile details. Please edit your profile after signing in.');
      } else {
        toast.success('Welcome to ConnectMuslim!');
      }
      router.push('/dashboard');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-xl bg-gradient-brand flex items-center justify-center">
            <Moon className="w-4 h-4 text-white" fill="white" />
          </div>
          <span className="text-lg font-bold text-white">ConnectMuslim</span>
        </Link>

        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-8">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${step >= s ? 'bg-gradient-brand text-white' : 'bg-white/8 text-white/35'}`}>{s}</div>
              {s < 2 && <div className={`h-px flex-1 w-16 transition-all ${step >= 2 ? 'bg-emerald-500' : 'bg-white/10'}`} />}
            </div>
          ))}
          <span className="text-xs text-white/40 ml-1">{step === 1 ? 'Account details' : 'Your location'}</span>
        </div>

        <h1 className="text-2xl font-bold text-white mb-1">{step === 1 ? 'Create your account' : 'Where are you based?'}</h1>
        <p className="text-white/45 text-sm mb-7">
          {step === 1 ? <>Already have an account? <Link href="/auth/login" className="text-emerald-400 hover:text-emerald-300 transition-colors">Sign in</Link></> : 'Help us connect you with your local community'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {step === 1 ? (
            <>
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wide">Full Name</label>
                <input type="text" value={form.full_name} onChange={(e) => set('full_name', e.target.value)} required placeholder="Your full name" className="field-input" />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wide">Email</label>
                <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required placeholder="you@example.com" className="field-input" />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wide">Password</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} value={form.password} onChange={(e) => set('password', e.target.value)} required minLength={6} placeholder="At least 6 characters" className="field-input pr-12" />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/35 hover:text-white/65 transition-colors">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wide">Country</label>
                <select value={form.country} onChange={(e) => set('country', e.target.value)} className="field-input">
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wide">Region</label>
                <select
                  value={form.region}
                  onChange={(e) => handleRegionChange(e.target.value)}
                  className="field-input"
                >
                  <option value="">Select your region</option>
                  {UK_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wide">
                  City / Town{form.region ? ` (${form.region})` : ''}
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
                  <input
                    ref={cityInputRef}
                    type="text"
                    value={citySearch}
                    onChange={(e) => {
                      setCitySearch(e.target.value);
                      set('city', e.target.value);
                      setShowCityDropdown(true);
                    }}
                    onFocus={() => setShowCityDropdown(true)}
                    onBlur={() => setTimeout(() => setShowCityDropdown(false), 150)}
                    placeholder={form.region ? `Search cities in ${form.region}…` : 'Select a region first'}
                    disabled={!form.region}
                    className="field-input pl-9"
                  />
                  {showCityDropdown && availableCities.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-[#111] border border-white/[0.08] rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                      {availableCities.map((city) => (
                        <button
                          key={city}
                          type="button"
                          onMouseDown={() => handleCitySelect(city)}
                          className={cn(
                            'w-full text-left px-3 py-2.5 text-sm transition-colors',
                            form.city === city
                              ? 'text-emerald-400 bg-emerald-500/10'
                              : 'text-white/70 hover:text-white hover:bg-white/6'
                          )}
                        >
                          {city}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wide">Postcode</label>
                <input
                  type="text"
                  value={form.postcode}
                  onChange={(e) => set('postcode', e.target.value.toUpperCase())}
                  placeholder="e.g. M1 1AA"
                  maxLength={8}
                  className="field-input"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wide">I am a</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'male',              label: 'Brother' },
                    { value: 'female',            label: 'Sister' },
                    { value: 'prefer_not_to_say', label: 'Prefer not' },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => set('gender', value)}
                      className={cn(
                        'py-2.5 rounded-xl text-sm font-medium border transition-all',
                        form.gender === value
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                          : 'bg-white/[0.04] border-white/[0.08] text-white/50 hover:text-white/80 hover:bg-white/8'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wide">Date of Birth</label>
                <input type="date" value={form.date_of_birth} onChange={(e) => set('date_of_birth', e.target.value)} className="field-input" />
              </div>
            </>
          )}

          <div className="flex gap-3 pt-1">
            {step === 2 && (
              <button type="button" onClick={() => setStep(1)} className="btn-ghost flex-1">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            )}
            <button type="submit" disabled={loading} className="btn-brand flex-1">
              {loading ? 'Creating…' : step === 1 ? <>Continue <ChevronRight className="w-4 h-4" /></> : 'Join ConnectMuslim'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
