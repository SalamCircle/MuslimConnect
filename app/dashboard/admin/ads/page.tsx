'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { Advertisement } from '@/lib/types';
import { ImagePlus, Plus, Pencil, Trash2, Search, X, ToggleLeft, ToggleRight, MapPin, Smartphone, Monitor, Newspaper, PanelRight, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import AdPlacementPreview from '@/components/admin/ad-placement-preview';

const PLACEMENTS = [
  { value: 'mobile_top',     label: 'Mobile Top',       icon: Smartphone },
  { value: 'mobile_bottom',  label: 'Mobile Bottom',    icon: Smartphone },
  { value: 'desktop_top',    label: 'Desktop Top',      icon: Monitor },
  { value: 'feed_inline',    label: 'Feed Inline',      icon: Newspaper },
  { value: 'sidebar',        label: 'Sidebar',          icon: PanelRight },
  { value: 'homepage_banner', label: 'Homepage Banner', icon: Newspaper },
  { value: 'businesses_page', label: 'Businesses Page', icon: Newspaper },
  { value: 'jobs_page',      label: 'Jobs Page',        icon: Newspaper },
  { value: 'events_page',    label: 'Events Page',      icon: Newspaper },
];

const FILTER_TABS = [
  { id: 'all',           label: 'All',           slot: null },
  { id: 'mobile_top',    label: 'Mobile Top',    slot: 'mobile_top' },
  { id: 'mobile_bottom', label: 'Mobile Bottom', slot: 'mobile_bottom' },
  { id: 'desktop_top',   label: 'Desktop Top',   slot: 'desktop_top' },
  { id: 'feed_inline',   label: 'Feed',          slot: 'feed_inline' },
  { id: 'sidebar',       label: 'Sidebar',       slot: 'sidebar' },
  { id: 'page_banners',  label: 'Page Banners',  slot: 'page_banners' },
];

const PAGE_BANNER_SLOTS = ['homepage_banner', 'businesses_page', 'jobs_page', 'events_page'];

const SCOPES = [
  { value: '',       label: 'All Users (no location filter)' },
  { value: 'global', label: 'Global' },
  { value: 'uk',     label: 'United Kingdom' },
  { value: 'region', label: 'By Region' },
  { value: 'city',   label: 'By City' },
  { value: 'area',   label: 'By Area / Postcode' },
];

type FormState = {
  title: string;
  image_url: string;
  link_url: string;
  placement_slot: string;
  target_scope: string;
  target_city: string;
  target_region: string;
  active_from: string;
  active_to: string;
  is_active: boolean;
};

const blank: FormState = {
  title: '', image_url: '', link_url: '',
  placement_slot: 'mobile_top',
  target_scope: '', target_city: '', target_region: '',
  active_from: '', active_to: '',
  is_active: true,
};

export default function AdminAdsPage() {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [showPreview, setShowPreview] = useState(false);
  const [modal, setModal] = useState<{ open: boolean; editing: Advertisement | null }>({ open: false, editing: null });
  const [form, setForm] = useState<FormState>(blank);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadAds() {
    setLoading(true);
    const { data } = await supabase
      .from('advertisements')
      .select('*')
      .order('created_at', { ascending: false });
    setAds((data as Advertisement[]) || []);
    setLoading(false);
  }

  useEffect(() => { loadAds(); }, []);

  const countsBySlot = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of ads) {
      map[a.placement_slot] = (map[a.placement_slot] ?? 0) + 1;
    }
    map['page_banners'] = PAGE_BANNER_SLOTS.reduce((sum, s) => sum + (map[s] ?? 0), 0);
    return map;
  }, [ads]);

  const filtered = useMemo(() => {
    let result = ads;
    const tab = FILTER_TABS.find((t) => t.id === activeTab);
    if (tab?.slot === 'page_banners') {
      result = result.filter((a) => PAGE_BANNER_SLOTS.includes(a.placement_slot));
    } else if (tab?.slot) {
      result = result.filter((a) => a.placement_slot === tab.slot);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((a) =>
        a.title.toLowerCase().includes(q) ||
        a.placement_slot.includes(q) ||
        (a.target_city ?? '').toLowerCase().includes(q) ||
        (a.target_region ?? '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [ads, activeTab, search]);

  function openAdd(presetSlot?: string) {
    setForm({ ...blank, placement_slot: presetSlot ?? 'mobile_top' });
    setImageFile(null);
    setImagePreview(null);
    setModal({ open: true, editing: null });
  }

  function openEdit(a: Advertisement) {
    setForm({
      title: a.title,
      image_url: a.image_url ?? '',
      link_url: a.link_url ?? '',
      placement_slot: a.placement_slot,
      target_scope: a.target_scope ?? '',
      target_city: a.target_city ?? '',
      target_region: a.target_region ?? '',
      active_from: a.active_from ? a.active_from.substring(0, 10) : '',
      active_to: a.active_to ? a.active_to.substring(0, 10) : '',
      is_active: a.is_active,
    });
    setImageFile(null);
    setImagePreview(a.image_url ?? null);
    setModal({ open: true, editing: a });
  }

  function closeModal() {
    setModal({ open: false, editing: null });
    setImageFile(null);
    setImagePreview(null);
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('Image must be under 10 MB'); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    if (e.target) e.target.value = '';
  }

  function removeImage() {
    setImageFile(null);
    setImagePreview(null);
    setForm((p) => ({ ...p, image_url: '' }));
  }

  async function uploadAdImage(): Promise<string | null> {
    if (!imageFile) return form.image_url || null;
    setUploading(true);
    const ext = imageFile.name.split('.').pop() ?? 'jpg';
    const path = `ads/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('ad-media').upload(path, imageFile, { upsert: false });
    setUploading(false);
    if (error) { toast.error('Failed to upload image'); return null; }
    const { data } = supabase.storage.from('ad-media').getPublicUrl(path);
    return data.publicUrl;
  }

  async function save() {
    if (!form.title.trim()) { toast.error('Title required.'); return; }
    setSaving(true);

    const uploadedUrl = await uploadAdImage();
    if (imageFile && !uploadedUrl) { setSaving(false); return; }

    const needsRegion = form.target_scope === 'region' || form.target_scope === 'city' || form.target_scope === 'area';
    const needsCity = form.target_scope === 'city' || form.target_scope === 'area';

    const payload = {
      title: form.title.trim(),
      image_url: uploadedUrl,
      link_url: form.link_url || null,
      placement_slot: form.placement_slot,
      target_scope: form.target_scope || null,
      target_city: needsCity ? (form.target_city || null) : null,
      target_region: needsRegion ? (form.target_region || null) : null,
      active_from: form.active_from || null,
      active_to: form.active_to || null,
      is_active: form.is_active,
    };

    if (modal.editing) {
      const { error } = await supabase.from('advertisements').update(payload).eq('id', modal.editing.id);
      if (error) { toast.error('Failed to update: ' + error.message); setSaving(false); return; }
      toast.success('Ad updated.');
      setAds((prev) => prev.map((a) => a.id === modal.editing!.id ? { ...a, ...payload } : a));
    } else {
      const { data, error } = await supabase.from('advertisements').insert(payload).select().single();
      if (error) { toast.error('Failed to create: ' + error.message); setSaving(false); return; }
      toast.success('Ad created.');
      setAds((prev) => [data as Advertisement, ...prev]);
    }
    setSaving(false);
    closeModal();
  }

  async function deleteAd(id: string) {
    const { error } = await supabase.from('advertisements').delete().eq('id', id);
    if (error) { toast.error('Failed to delete.'); return; }
    toast.success('Ad deleted.');
    setAds((prev) => prev.filter((a) => a.id !== id));
    setConfirmDelete(null);
  }

  async function toggleActive(id: string, current: boolean) {
    const { error } = await supabase.from('advertisements').update({ is_active: !current }).eq('id', id);
    if (error) { toast.error('Failed.'); return; }
    setAds((prev) => prev.map((a) => a.id === id ? { ...a, is_active: !current } : a));
  }

  function targetLabel(a: Advertisement) {
    if (!a.target_scope) return 'Everyone';
    if (a.target_scope === 'global') return 'Global';
    if (a.target_scope === 'uk') return 'UK';
    if (a.target_scope === 'region') return a.target_region || 'Any region';
    if (a.target_scope === 'city') return [a.target_city, a.target_region].filter(Boolean).join(', ') || 'Any city';
    if (a.target_scope === 'area') return [a.target_city, a.target_region].filter(Boolean).join(', ') || 'Any area';
    return a.target_scope;
  }

  function placementMeta(slot: string) {
    return PLACEMENTS.find((p) => p.value === slot);
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold text-white">Advertisements</h1>
          <p className="text-sm text-white/40 mt-1">{ads.filter((a) => a.is_active).length} active · {ads.length} total</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreview((v) => !v)}
            className="flex items-center gap-2 text-sm px-3 py-2 rounded-xl border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-all"
          >
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">Placement Map</span>
          </button>
          <button onClick={() => openAdd()} className="btn-brand flex items-center gap-2 text-sm px-4 py-2">
            <Plus className="w-4 h-4" /> New Ad
          </button>
        </div>
      </div>

      {/* Placement preview panel */}
      {showPreview && (
        <div className="glass-card p-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white/80">Ad Placement Map</h2>
            <span className="text-xs text-white/30">Click a zone to filter ads by placement</span>
          </div>
          <AdPlacementPreview
            activeSlot={activeTab === 'all' ? '' : activeTab}
            counts={countsBySlot}
            onSelect={(slot) => {
              if (PAGE_BANNER_SLOTS.includes(slot)) setActiveTab('page_banners');
              else setActiveTab(slot);
              setShowPreview(false);
            }}
          />
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-1.5 mb-4 overflow-x-auto scrollbar-hide pb-1">
        {FILTER_TABS.map((tab) => {
          const count = tab.id === 'all'
            ? ads.length
            : (countsBySlot[tab.slot ?? ''] ?? 0);
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0',
                activeTab === tab.id
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/5 border border-transparent'
              )}
            >
              {tab.label}
              <span className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none',
                activeTab === tab.id ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/8 text-white/40'
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search ads…" className="field-input pl-10 w-full max-w-sm" />
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="glass-card p-4 animate-pulse h-16" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <p className="text-white/30 text-sm mb-3">No ads in this placement yet.</p>
          <button
            onClick={() => openAdd(FILTER_TABS.find((t) => t.id === activeTab)?.slot === 'page_banners' ? 'homepage_banner' : FILTER_TABS.find((t) => t.id === activeTab)?.slot ?? undefined)}
            className="btn-brand inline-flex items-center gap-2 text-sm px-4 py-2"
          >
            <Plus className="w-4 h-4" /> Create one here
          </button>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="glass-card overflow-hidden hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {['Ad', 'Placement', 'Target Audience', 'Duration', 'Active', 'Actions'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => {
                    const pm = placementMeta(a.placement_slot);
                    const PIcon = pm?.icon ?? Newspaper;
                    return (
                      <tr key={a.id} className={cn('border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors', !a.is_active && 'opacity-50')}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {a.image_url ? (
                              <img src={a.image_url} alt={a.title} className="w-10 h-10 rounded-xl object-cover border border-white/10 flex-shrink-0" />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                                <ImagePlus className="w-4 h-4 text-amber-400" />
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-medium text-white">{a.title}</p>
                              {a.link_url && <p className="text-xs text-white/30 truncate max-w-[160px]">{a.link_url}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 text-xs text-white/50">
                            <PIcon className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
                            {pm?.label ?? a.placement_slot}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 text-xs text-white/50">
                            <MapPin className="w-3 h-3 text-emerald-400/60 flex-shrink-0" />
                            {targetLabel(a)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-white/40">
                          {a.active_from || a.active_to ? (
                            <span>{a.active_from ? format(new Date(a.active_from), 'dd/MM/yy') : '—'} → {a.active_to ? format(new Date(a.active_to), 'dd/MM/yy') : '—'}</span>
                          ) : <span className="text-white/25">No limit</span>}
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => toggleActive(a.id, a.is_active)} className={cn('transition-colors', a.is_active ? 'text-emerald-400' : 'text-white/25 hover:text-white/50')}>
                            {a.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEdit(a)} className="p-1.5 rounded-lg text-white/25 hover:text-white/70 hover:bg-white/6 transition-all" title="Edit">
                              <Pencil className="w-4 h-4" />
                            </button>
                            {confirmDelete === a.id ? (
                              <div className="flex items-center gap-1">
                                <button onClick={() => deleteAd(a.id)} className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded-lg hover:bg-rose-500/20 transition-all">Confirm</button>
                                <button onClick={() => setConfirmDelete(null)} className="text-xs text-white/40 hover:text-white/70 px-1 py-1 rounded-lg transition-all">Cancel</button>
                              </div>
                            ) : (
                              <button onClick={() => setConfirmDelete(a.id)} className="p-1.5 rounded-lg text-white/25 hover:text-rose-400 hover:bg-rose-500/10 transition-all" title="Delete">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="space-y-2.5 md:hidden">
            {filtered.map((a) => {
              const pm = placementMeta(a.placement_slot);
              const PIcon = pm?.icon ?? Newspaper;
              return (
                <div key={a.id} className={cn('glass-card p-3.5', !a.is_active && 'opacity-60')}>
                  <div className="flex items-start gap-3">
                    {a.image_url ? (
                      <img src={a.image_url} alt={a.title} className="w-12 h-12 rounded-xl object-cover border border-white/10 flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                        <ImagePlus className="w-4 h-4 text-amber-400" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">{a.title}</p>
                      {a.link_url && <p className="text-xs text-white/30 truncate">{a.link_url}</p>}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-[10px] text-white/50 bg-white/5 px-1.5 py-0.5 rounded">
                          <PIcon className="w-3 h-3" />{pm?.label ?? a.placement_slot}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400/70 bg-emerald-500/5 px-1.5 py-0.5 rounded">
                          <MapPin className="w-2.5 h-2.5" />{targetLabel(a)}
                        </span>
                      </div>
                      <p className="text-[10px] text-white/30 mt-1.5">
                        {a.active_from || a.active_to ? (
                          `${a.active_from ? format(new Date(a.active_from), 'dd/MM/yy') : '—'} → ${a.active_to ? format(new Date(a.active_to), 'dd/MM/yy') : '—'}`
                        ) : 'No time limit'}
                      </p>
                    </div>
                    <button onClick={() => toggleActive(a.id, a.is_active)} className={cn('transition-colors flex-shrink-0', a.is_active ? 'text-emerald-400' : 'text-white/25')}>
                      {a.is_active ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/[0.06]">
                    <button onClick={() => openEdit(a)} className="flex-1 flex items-center justify-center gap-1.5 text-xs text-white/60 hover:text-white py-1.5 rounded-lg hover:bg-white/5 transition-all">
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                    {confirmDelete === a.id ? (
                      <div className="flex items-center gap-1.5 flex-1">
                        <button onClick={() => deleteAd(a.id)} className="flex-1 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 py-1.5 rounded-lg hover:bg-rose-500/20 transition-all">Delete</button>
                        <button onClick={() => setConfirmDelete(null)} className="flex-1 text-xs text-white/40 py-1.5 rounded-lg hover:bg-white/5 transition-all">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDelete(a.id)} className="flex-1 flex items-center justify-center gap-1.5 text-xs text-white/60 hover:text-rose-400 py-1.5 rounded-lg hover:bg-rose-500/10 transition-all">
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Create / Edit modal */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-card w-full sm:max-w-md max-h-[92vh] sm:max-h-[90vh] overflow-y-auto p-5 sm:p-6 rounded-t-2xl sm:rounded-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-white">{modal.editing ? 'Edit Ad' : 'New Advertisement'}</h2>
              <button onClick={closeModal} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/6 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-white/60 mb-1.5 block">Title *</label>
                <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} className="field-input w-full" placeholder="Ad title" />
              </div>

              <div>
                <label className="text-xs font-medium text-white/60 mb-1.5 block">Placement Slot</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {PLACEMENTS.map((p) => {
                    const PIcon = p.icon;
                    return (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, placement_slot: p.value }))}
                        className={cn(
                          'flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border text-[10px] font-medium transition-all',
                          form.placement_slot === p.value
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                            : 'border-white/10 text-white/40 hover:border-white/20 hover:text-white/70'
                        )}
                      >
                        <PIcon className="w-4 h-4" />
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-white/60 mb-1.5 block">Ad Image</label>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/gif,image/webp" onChange={handleImageSelect} className="hidden" />
                {imagePreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-white/10">
                    <img src={imagePreview} alt="Ad preview" className="w-full max-h-40 object-cover" />
                    <div className="absolute top-2 right-2 flex gap-1.5">
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="text-xs bg-black/60 text-white/80 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-black/80 transition-colors">Change</button>
                      <button type="button" onClick={removeImage} className="w-7 h-7 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full h-24 rounded-xl border border-dashed border-white/20 hover:border-emerald-500/40 flex flex-col items-center justify-center gap-2 text-white/40 hover:text-white/60 transition-all hover:bg-white/[0.02]">
                    <ImagePlus className="w-5 h-5" />
                    <span className="text-xs">Click to upload image</span>
                    <span className="text-[10px] text-white/25">JPEG, PNG, GIF, WebP · max 10 MB</span>
                  </button>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-white/60 mb-1.5 block">Link URL</label>
                <input value={form.link_url} onChange={(e) => setForm((p) => ({ ...p, link_url: e.target.value }))} className="field-input w-full" placeholder="https://…" />
              </div>

              <div className="pt-2 space-y-3 border-t border-white/[0.06]">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs font-semibold text-white/70">Location Targeting</span>
                </div>
                <div>
                  <label className="text-xs font-medium text-white/50 mb-1.5 block">Show this ad to</label>
                  <select
                    value={form.target_scope}
                    onChange={(e) => setForm((p) => ({ ...p, target_scope: e.target.value, target_city: '', target_region: '' }))}
                    className="field-input w-full"
                  >
                    {SCOPES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>

                {(form.target_scope === 'region' || form.target_scope === 'city' || form.target_scope === 'area') && (
                  <div>
                    <label className="text-xs font-medium text-white/50 mb-1.5 block">Region</label>
                    <input
                      value={form.target_region}
                      onChange={(e) => setForm((p) => ({ ...p, target_region: e.target.value }))}
                      className="field-input w-full"
                      placeholder="e.g. Greater Manchester"
                    />
                  </div>
                )}

                {(form.target_scope === 'city' || form.target_scope === 'area') && (
                  <div>
                    <label className="text-xs font-medium text-white/50 mb-1.5 block">City</label>
                    <input
                      value={form.target_city}
                      onChange={(e) => setForm((p) => ({ ...p, target_city: e.target.value }))}
                      className="field-input w-full"
                      placeholder="e.g. Manchester"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-xs font-medium text-white/60 mb-1.5 block">Active From</label>
                  <input type="date" value={form.active_from} onChange={(e) => setForm((p) => ({ ...p, active_from: e.target.value }))} className="field-input w-full" />
                </div>
                <div>
                  <label className="text-xs font-medium text-white/60 mb-1.5 block">Active To</label>
                  <input type="date" value={form.active_to} onChange={(e) => setForm((p) => ({ ...p, active_to: e.target.value }))} className="field-input w-full" />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))} className="accent-emerald-400" />
                <span className="text-sm text-white/70">Active (visible on site)</span>
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={closeModal} className="btn-ghost flex-1">Cancel</button>
              <button onClick={save} disabled={saving || uploading} className="btn-brand flex-1">
                {saving || uploading ? 'Saving…' : modal.editing ? 'Save Changes' : 'Create Ad'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
