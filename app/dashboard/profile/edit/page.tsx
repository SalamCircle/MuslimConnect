'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';
import { ArrowLeft, Save, User, Lock, Bell, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const UK_REGIONS = [
  'East Midlands','East of England','London','North East','North West',
  'Northern Ireland','Scotland','South East','South West','Wales','West Midlands','Yorkshire and The Humber',
];

type Tab = 'profile' | 'security' | 'notifications';

export default function EditProfilePage() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();
  const [tab, setTab] = useState<Tab>('profile');

  // Profile tab
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [country, setCountry] = useState('');
  const [postcode, setPostcode] = useState('');
  const [saving, setSaving] = useState(false);

  // Security tab
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '');
      setBio(profile.bio ?? '');
      setCity(profile.city ?? '');
      setRegion(profile.region ?? '');
      setCountry(profile.country ?? '');
      setPostcode(profile.postcode ?? '');
    }
  }, [profile]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error, count } = await supabase.from('profiles').update({
      full_name: fullName.trim(),
      bio: bio.trim() || null,
      city: city.trim() || null,
      region: region.trim() || null,
      country: country.trim(),
      postcode: postcode.trim() || null,
      updated_at: new Date().toISOString(),
    }, { count: 'exact' }).eq('id', user.id);
    if (error) {
      toast.error('Failed to save changes: ' + error.message);
    } else if (!count || count === 0) {
      toast.error('Update failed — please sign out and back in, then try again.');
    } else {
      await refreshProfile();
      toast.success('Profile updated!');
    }
    setSaving(false);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPw !== confirmPw) { toast.error('Passwords do not match.'); return; }
    if (newPw.length < 8) { toast.error('Password must be at least 8 characters.'); return; }
    setSavingPw(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    if (error) { toast.error(error.message); }
    else { toast.success('Password changed successfully!'); setCurrentPw(''); setNewPw(''); setConfirmPw(''); }
    setSavingPw(false);
  }

  const initials = profile?.full_name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() ?? '?';

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'profile',       label: 'Profile',       icon: User },
    { id: 'security',      label: 'Security',      icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  return (
    <div className="max-w-xl mx-auto px-5 py-8">
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <h1 className="text-2xl font-bold text-white mb-6">Account Settings</h1>

      {/* Avatar summary */}
      <div className="glass-card p-5 flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-brand flex items-center justify-center text-xl font-bold text-white flex-shrink-0 glow-sm">
          {initials}
        </div>
        <div>
          <p className="text-base font-semibold text-white">{profile?.full_name}</p>
          <p className="text-xs text-white/40 mt-0.5">{profile?.email}</p>
          <p className="text-xs text-white/25 mt-1">Avatar upload coming soon</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-white/[0.06] mb-6">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={cn(
              'flex items-center gap-1.5 px-5 py-3 text-sm font-medium border-b-2 transition-all',
              tab === id ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-white/40 hover:text-white/70'
            )}
          >
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>

      {/* Profile tab */}
      {tab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Full Name *</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} required className="field-input w-full" placeholder="Your full name" />
          </div>
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Bio</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="field-input w-full resize-none" placeholder="Tell the community about yourself…" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">City</label>
              <input value={city} onChange={(e) => setCity(e.target.value)} className="field-input w-full" placeholder="e.g. Birmingham" />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Region</label>
              <select value={region} onChange={(e) => setRegion(e.target.value)} className="field-input w-full bg-[#111] appearance-none">
                <option value="" className="bg-[#111]">Select region</option>
                {UK_REGIONS.map((r) => <option key={r} value={r} className="bg-[#111]">{r}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Country *</label>
              <input value={country} onChange={(e) => setCountry(e.target.value)} required className="field-input w-full" placeholder="United Kingdom" />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Postcode</label>
              <input value={postcode} onChange={(e) => setPostcode(e.target.value)} className="field-input w-full" placeholder="e.g. B1 1AA" />
            </div>
          </div>
          <button type="submit" disabled={saving} className="btn-brand w-full">
            <Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save Profile'}
          </button>
        </form>
      )}

      {/* Security tab */}
      {tab === 'security' && (
        <form onSubmit={handleChangePassword} className="space-y-5">
          <div className="glass-card p-4 border border-amber-500/20 bg-amber-500/5">
            <p className="text-xs text-amber-400/80">Enter your new password below. You are currently signed in so no current password is required.</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">New Password</label>
            <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required minLength={8} className="field-input w-full" placeholder="At least 8 characters" />
          </div>
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Confirm New Password</label>
            <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required className="field-input w-full" placeholder="Repeat new password" />
          </div>
          <button type="submit" disabled={savingPw} className="btn-brand w-full">
            <Lock className="w-4 h-4" />{savingPw ? 'Changing…' : 'Change Password'}
          </button>
        </form>
      )}

      {/* Notifications tab */}
      {tab === 'notifications' && (
        <div className="space-y-4">
          <div className="glass-card p-4 border border-cyan-500/20 bg-cyan-500/5">
            <p className="text-xs text-cyan-400/80">Notification preferences are saved automatically. Email notifications require your verified email address.</p>
          </div>
          {[
            { label: 'New comments on my posts', defaultOn: true },
            { label: 'Likes on my posts', defaultOn: true },
            { label: 'New messages', defaultOn: true },
            { label: 'Group activity', defaultOn: false },
            { label: 'Event reminders', defaultOn: true },
            { label: 'Weekly community digest', defaultOn: false },
          ].map(({ label, defaultOn }) => (
            <div key={label} className="flex items-center justify-between px-4 py-3 glass-card">
              <span className="text-sm text-white/70">{label}</span>
              <button
                type="button"
                className={cn('w-10 h-5 rounded-full transition-all relative', defaultOn ? 'bg-emerald-500' : 'bg-white/15')}
              >
                <span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all', defaultOn ? 'left-5' : 'left-0.5')} />
              </button>
            </div>
          ))}
          <p className="text-xs text-white/25 text-center pt-2">Full notification management coming soon.</p>
        </div>
      )}
    </div>
  );
}
