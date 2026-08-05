'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Business } from '@/lib/types';
import { Store, Plus, Pencil, Trash2, Search, MapPin, Globe, Phone, CheckCircle, Star, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const UK_REGIONS = ['East Midlands','East of England','London','North East','North West','Northern Ireland','Scotland','South East','South West','Wales','West Midlands','Yorkshire and the Humber'];
const CATEGORIES = ['restaurant','grocery','finance','legal','healthcare','education','real_estate','retail','technology','charity','beauty','construction','other'];

type FormState = Omit<Business, 'id' | 'created_at' | 'owner_id'>;

const blank: FormState = { name: '', description: null, category: 'other', address: null, region: null, city: null, postcode: null, phone: null, email: null, website: null, image_url: null, is_sponsored: false, is_verified: false };

export default function AdminBusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{ open: boolean; editing: Business | null }>({ open: false, editing: null });
  const [form, setForm] = useState<FormState>(blank);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('businesses').select('*').order('created_at', { ascending: false });
    setBusinesses((data as Business[]) || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = search.trim()
    ? businesses.filter((b) => b.name.toLowerCase().includes(search.toLowerCase()) || (b.city ?? '').toLowerCase().includes(search.toLowerCase()))
    : businesses;

  function openAdd() { setForm(blank); setModal({ open: true, editing: null }); }
  function openEdit(b: Business) {
    setForm({ name: b.name, description: b.description, category: b.category, address: b.address, region: b.region, city: b.city, postcode: b.postcode, phone: b.phone, email: b.email, website: b.website, image_url: b.image_url, is_sponsored: b.is_sponsored, is_verified: b.is_verified });
    setModal({ open: true, editing: b });
  }

  async function save() {
    if (!form.name.trim()) { toast.error('Name required.'); return; }
    setSaving(true);
    const payload = { ...form, name: form.name.trim() };
    if (modal.editing) {
      const { error } = await supabase.from('businesses').update(payload).eq('id', modal.editing.id);
      if (error) { toast.error('Failed to update.'); setSaving(false); return; }
      toast.success('Business updated.');
      setBusinesses((prev) => prev.map((b) => b.id === modal.editing!.id ? { ...b, ...payload } : b));
    } else {
      const { data, error } = await supabase.from('businesses').insert(payload).select().single();
      if (error) { toast.error('Failed to add.'); setSaving(false); return; }
      toast.success('Business added.');
      setBusinesses((prev) => [data as Business, ...prev]);
    }
    setSaving(false);
    setModal({ open: false, editing: null });
  }

  async function deleteBusiness(id: string) {
    const { error } = await supabase.from('businesses').delete().eq('id', id);
    if (error) { toast.error('Failed to delete.'); return; }
    toast.success('Business deleted.');
    setBusinesses((prev) => prev.filter((b) => b.id !== id));
    setConfirmDelete(null);
  }

  async function toggleField(id: string, field: 'is_verified' | 'is_sponsored', current: boolean) {
    const { error } = await supabase.from('businesses').update({ [field]: !current }).eq('id', id);
    if (error) { toast.error('Failed.'); return; }
    setBusinesses((prev) => prev.map((b) => b.id === id ? { ...b, [field]: !current } : b));
  }

  function f(key: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm((p) => ({ ...p, [key]: e.target.value || null }));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Businesses</h1>
          <p className="text-sm text-white/40 mt-1">{businesses.length} listings · admin-managed directory</p>
        </div>
        <button onClick={openAdd} className="btn-brand flex items-center gap-2 text-sm px-4 py-2">
          <Plus className="w-4 h-4" /> Add Business
        </button>
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search businesses…" className="field-input pl-10 w-full max-w-sm" />
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="glass-card p-4 animate-pulse h-16" />)}</div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['Business', 'Category', 'Location', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr key={b.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                        <Store className="w-4 h-4 text-amber-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{b.name}</p>
                        <p className="text-xs text-white/35 line-clamp-1">{b.description ?? '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-white/50 capitalize">{b.category.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-xs text-white/45">{[b.city, b.region].filter(Boolean).join(', ') || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 flex-wrap">
                      {b.is_verified && <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">Verified</span>}
                      {b.is_sponsored && <span className="text-[10px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full">Sponsored</span>}
                      {!b.is_verified && !b.is_sponsored && <span className="text-[10px] text-white/25">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => toggleField(b.id, 'is_verified', b.is_verified)} className={cn('p-1.5 rounded-lg transition-all', b.is_verified ? 'text-emerald-400 bg-emerald-500/10' : 'text-white/25 hover:text-emerald-400 hover:bg-emerald-500/10')} title={b.is_verified ? 'Unverify' : 'Verify'}>
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button onClick={() => toggleField(b.id, 'is_sponsored', b.is_sponsored)} className={cn('p-1.5 rounded-lg transition-all', b.is_sponsored ? 'text-amber-400 bg-amber-500/10' : 'text-white/25 hover:text-amber-400 hover:bg-amber-500/10')} title={b.is_sponsored ? 'Unsponsor' : 'Sponsor'}>
                        <Star className="w-4 h-4" />
                      </button>
                      <button onClick={() => openEdit(b)} className="p-1.5 rounded-lg text-white/25 hover:text-white/70 hover:bg-white/6 transition-all" title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                      {confirmDelete === b.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => deleteBusiness(b.id)} className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded-lg hover:bg-rose-500/20 transition-all">Confirm</button>
                          <button onClick={() => setConfirmDelete(null)} className="text-xs text-white/40 hover:text-white/70 px-1 py-1 rounded-lg transition-all">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDelete(b.id)} className="p-1.5 rounded-lg text-white/25 hover:text-rose-400 hover:bg-rose-500/10 transition-all" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-center text-white/30 text-sm py-8">No businesses found.</p>}
        </div>
      )}

      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-card w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-white">{modal.editing ? 'Edit Business' : 'Add Business'}</h2>
              <button onClick={() => setModal({ open: false, editing: null })} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/6 transition-all"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-white/60 mb-1.5 block">Business Name *</label>
                <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="field-input w-full" placeholder="Business name" />
              </div>
              <div>
                <label className="text-xs font-medium text-white/60 mb-1.5 block">Category</label>
                <select value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} className="field-input w-full capitalize">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-white/60 mb-1.5 block">Description</label>
                <textarea value={form.description ?? ''} onChange={f('description')} rows={3} className="field-input w-full resize-none" placeholder="Short description…" />
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
                  <label className="text-xs font-medium text-white/60 mb-1.5 block">Phone</label>
                  <input value={form.phone ?? ''} onChange={f('phone')} className="field-input w-full" placeholder="+44 …" />
                </div>
                <div>
                  <label className="text-xs font-medium text-white/60 mb-1.5 block">Email</label>
                  <input value={form.email ?? ''} onChange={f('email')} className="field-input w-full" placeholder="hello@…" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-white/60 mb-1.5 block">Website</label>
                <input value={form.website ?? ''} onChange={f('website')} className="field-input w-full" placeholder="https://…" />
              </div>
              <div className="flex gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_verified} onChange={(e) => setForm((p) => ({ ...p, is_verified: e.target.checked }))} className="accent-emerald-400" />
                  <span className="text-sm text-white/70">Verified</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_sponsored} onChange={(e) => setForm((p) => ({ ...p, is_sponsored: e.target.checked }))} className="accent-amber-400" />
                  <span className="text-sm text-white/70">Sponsored</span>
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModal({ open: false, editing: null })} className="btn-ghost flex-1">Cancel</button>
              <button onClick={save} disabled={saving} className="btn-brand flex-1">{saving ? 'Saving…' : modal.editing ? 'Save Changes' : 'Add Business'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
