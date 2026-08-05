'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Mosque } from '@/lib/types';
import { Building, Plus, Pencil, Trash2, Search, CheckCircle, X, Globe, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const UK_REGIONS = ['East Midlands','East of England','London','North East','North West','Northern Ireland','Scotland','South East','South West','Wales','West Midlands','Yorkshire and the Humber'];

type FormState = Omit<Mosque, 'id' | 'created_at'>;
const blank: FormState = { name: '', address: null, city: null, region: null, postcode: null, phone: null, website: null, latitude: null, longitude: null, is_verified: false };

export default function AdminMosquesPage() {
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{ open: boolean; editing: Mosque | null }>({ open: false, editing: null });
  const [form, setForm] = useState<FormState>(blank);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('mosques').select('*').order('name', { ascending: true });
    setMosques((data as Mosque[]) || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = search.trim()
    ? mosques.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()) || (m.city ?? '').toLowerCase().includes(search.toLowerCase()))
    : mosques;

  function openAdd() { setForm(blank); setModal({ open: true, editing: null }); }
  function openEdit(m: Mosque) {
    setForm({ name: m.name, address: m.address, city: m.city, region: m.region, postcode: m.postcode, phone: m.phone, website: m.website, latitude: m.latitude, longitude: m.longitude, is_verified: m.is_verified });
    setModal({ open: true, editing: m });
  }

  async function save() {
    if (!form.name.trim()) { toast.error('Name required.'); return; }
    setSaving(true);
    const payload = { ...form, name: form.name.trim() };
    if (modal.editing) {
      const { error } = await supabase.from('mosques').update(payload).eq('id', modal.editing.id);
      if (error) { toast.error('Failed to update.'); setSaving(false); return; }
      toast.success('Mosque updated.');
      setMosques((prev) => prev.map((m) => m.id === modal.editing!.id ? { ...m, ...payload } : m));
    } else {
      const { data, error } = await supabase.from('mosques').insert(payload).select().single();
      if (error) { toast.error('Failed to add.'); setSaving(false); return; }
      toast.success('Mosque added.');
      setMosques((prev) => [data as Mosque, ...prev]);
    }
    setSaving(false);
    setModal({ open: false, editing: null });
  }

  async function deleteMosque(id: string) {
    const { error } = await supabase.from('mosques').delete().eq('id', id);
    if (error) { toast.error('Failed to delete.'); return; }
    toast.success('Mosque deleted.');
    setMosques((prev) => prev.filter((m) => m.id !== id));
    setConfirmDelete(null);
  }

  async function toggleVerified(id: string, current: boolean) {
    const { error } = await supabase.from('mosques').update({ is_verified: !current }).eq('id', id);
    if (error) { toast.error('Failed.'); return; }
    setMosques((prev) => prev.map((m) => m.id === id ? { ...m, is_verified: !current } : m));
    toast.success(!current ? 'Mosque verified.' : 'Verification removed.');
  }

  function f(key: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((p) => ({ ...p, [key]: e.target.value || null }));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Mosques</h1>
          <p className="text-sm text-white/40 mt-1">{mosques.length} mosques · UK directory</p>
        </div>
        <button onClick={openAdd} className="btn-brand flex items-center gap-2 text-sm px-4 py-2">
          <Plus className="w-4 h-4" /> Add Mosque
        </button>
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search mosques…" className="field-input pl-10 w-full max-w-sm" />
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="glass-card p-4 animate-pulse h-16" />)}</div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['Mosque', 'Location', 'Contact', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center flex-shrink-0">
                        <Building className="w-4 h-4 text-teal-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{m.name}</p>
                        <p className="text-xs text-white/35 line-clamp-1">{m.address ?? '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-white/45">{[m.city, m.region].filter(Boolean).join(', ') || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      {m.phone && <span className="text-xs text-white/45 flex items-center gap-1"><Phone className="w-3 h-3" />{m.phone}</span>}
                      {m.website && <a href={m.website} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-400/70 flex items-center gap-1 hover:text-emerald-400 transition-colors"><Globe className="w-3 h-3" />Website</a>}
                      {!m.phone && !m.website && <span className="text-xs text-white/25">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {m.is_verified ? (
                      <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">Verified</span>
                    ) : (
                      <span className="text-[10px] text-white/25">Unverified</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => toggleVerified(m.id, m.is_verified)} className={cn('p-1.5 rounded-lg transition-all', m.is_verified ? 'text-emerald-400 bg-emerald-500/10' : 'text-white/25 hover:text-emerald-400 hover:bg-emerald-500/10')} title={m.is_verified ? 'Unverify' : 'Verify'}>
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button onClick={() => openEdit(m)} className="p-1.5 rounded-lg text-white/25 hover:text-white/70 hover:bg-white/6 transition-all" title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                      {confirmDelete === m.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => deleteMosque(m.id)} className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded-lg hover:bg-rose-500/20 transition-all">Confirm</button>
                          <button onClick={() => setConfirmDelete(null)} className="text-xs text-white/40 hover:text-white/70 px-1 py-1 rounded-lg transition-all">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDelete(m.id)} className="p-1.5 rounded-lg text-white/25 hover:text-rose-400 hover:bg-rose-500/10 transition-all" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-center text-white/30 text-sm py-8">No mosques found.</p>}
        </div>
      )}

      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-card w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-white">{modal.editing ? 'Edit Mosque' : 'Add Mosque'}</h2>
              <button onClick={() => setModal({ open: false, editing: null })} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/6 transition-all"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-white/60 mb-1.5 block">Mosque Name *</label>
                <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="field-input w-full" placeholder="e.g. East London Mosque" />
              </div>
              <div>
                <label className="text-xs font-medium text-white/60 mb-1.5 block">Address</label>
                <input value={form.address ?? ''} onChange={f('address')} className="field-input w-full" placeholder="Street address" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-white/60 mb-1.5 block">City</label>
                  <input value={form.city ?? ''} onChange={f('city')} className="field-input w-full" placeholder="e.g. London" />
                </div>
                <div>
                  <label className="text-xs font-medium text-white/60 mb-1.5 block">Region</label>
                  <select value={form.region ?? ''} onChange={(e) => setForm((p) => ({ ...p, region: e.target.value || null }))} className="field-input w-full">
                    <option value="">Select region</option>
                    {UK_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-white/60 mb-1.5 block">Postcode</label>
                  <input value={form.postcode ?? ''} onChange={f('postcode')} className="field-input w-full" placeholder="e.g. E1 1AA" />
                </div>
                <div>
                  <label className="text-xs font-medium text-white/60 mb-1.5 block">Phone</label>
                  <input value={form.phone ?? ''} onChange={f('phone')} className="field-input w-full" placeholder="+44 …" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-white/60 mb-1.5 block">Website</label>
                <input value={form.website ?? ''} onChange={f('website')} className="field-input w-full" placeholder="https://…" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input type="checkbox" checked={form.is_verified} onChange={(e) => setForm((p) => ({ ...p, is_verified: e.target.checked }))} className="accent-emerald-400" />
                <span className="text-sm text-white/70">Mark as verified</span>
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModal({ open: false, editing: null })} className="btn-ghost flex-1">Cancel</button>
              <button onClick={save} disabled={saving} className="btn-brand flex-1">{saving ? 'Saving…' : modal.editing ? 'Save Changes' : 'Add Mosque'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
