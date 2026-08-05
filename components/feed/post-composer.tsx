'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';
import type { Community, LocationScope, PostWithAuthor } from '@/lib/types';
import { MapPin, Globe, Building2, Flag, TrendingUp, ChevronDown, Users, Send, ImagePlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PostComposerProps {
  defaultScope?: LocationScope;
  communityId?: string;
  onPosted: (post: PostWithAuthor) => void;
}

const scopes: { value: LocationScope; label: string; icon: React.ElementType; desc: string }[] = [
  { value: 'area',   label: 'My Area',        icon: MapPin,     desc: 'Your postcode' },
  { value: 'city',   label: 'My City',        icon: Building2,  desc: 'Your city' },
  { value: 'region', label: 'My Region',      icon: TrendingUp, desc: 'Your region' },
  { value: 'uk',     label: 'United Kingdom', icon: Flag,       desc: 'UK-wide' },
  { value: 'global', label: 'Global',         icon: Globe,      desc: 'Worldwide' },
];

export default function PostComposer({ defaultScope = 'city', communityId, onPosted }: PostComposerProps) {
  const { user, profile } = useAuth();
  const [content, setContent] = useState('');
  const [scope, setScope] = useState<LocationScope>(defaultScope);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [showScopeMenu, setShowScopeMenu] = useState(false);
  const [showCommunityMenu, setShowCommunityMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('community_members')
      .select('communities(*)')
      .eq('user_id', user.id)
      .then(({ data }) => {
        const comms = (data || []).map((r: { communities: unknown }) => r.communities).filter(Boolean) as Community[];
        setCommunities(comms);
      });
  }, [user]);

  useEffect(() => { setScope(defaultScope); }, [defaultScope]);

  function autoResize() {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('Image must be under 10 MB'); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setFocused(true);
    if (e.target) e.target.value = '';
  }

  function removeImage() {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
  }

  async function uploadImage(): Promise<string | null> {
    if (!imageFile || !user) return null;
    const ext = imageFile.name.split('.').pop() ?? 'jpg';
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('post-media').upload(path, imageFile, { upsert: false });
    if (error) { toast.error('Failed to upload image'); return null; }
    const { data } = supabase.storage.from('post-media').getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || !user || !profile) return;
    setLoading(true);

    let image_url: string | null = null;
    if (imageFile) {
      image_url = await uploadImage();
      if (!image_url) { setLoading(false); return; }
    }

    const insertPayload = {
      user_id: user.id,
      content: content.trim(),
      status: 'active' as const,
      location_scope: scope,
      community_id: communityId ?? selectedCommunity?.id ?? null,
      country: profile.country,
      region: profile.region,
      city: profile.city,
      postcode: profile.postcode,
      image_url,
    };

    const { data: inserted, error } = await supabase
      .from('posts')
      .insert(insertPayload)
      .select('id, created_at, updated_at')
      .single();

    if (error || !inserted) {
      toast.error('Failed to post. Please try again.');
    } else {
      const newPost: PostWithAuthor = {
        ...insertPayload,
        id: (inserted as { id: string; created_at: string; updated_at: string }).id,
        title: null,
        like_count: 0,
        comment_count: 0,
        save_count: 0,
        share_count: 0,
        slug: null,
        is_featured: false,
        is_approved: true,
        created_at: (inserted as { id: string; created_at: string; updated_at: string }).created_at,
        updated_at: (inserted as { id: string; created_at: string; updated_at: string }).updated_at,
        profiles: {
          id: profile.id,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          city: profile.city,
          region: profile.region,
          username: profile.username ?? null,
        },
        communities: selectedCommunity
          ? { id: selectedCommunity.id, name: selectedCommunity.name, category: selectedCommunity.category, slug: selectedCommunity.slug ?? null }
          : null,
      };
      setContent('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      setFocused(false);
      setSelectedCommunity(null);
      removeImage();
      onPosted(newPost);
      toast.success('Post shared!');
    }
    setLoading(false);
  }

  const currentScope = scopes.find((s) => s.value === scope) ?? scopes[1];
  const ScopeIcon = currentScope.icon;
  const scopeDisplayLabel = scope === 'area' && profile?.postcode
    ? profile.postcode
    : scope === 'city' && profile?.city
    ? profile.city
    : scope === 'region' && profile?.region
    ? profile.region
    : currentScope.label;

  const initials = profile?.full_name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() ?? '?';

  return (
    <div className="glass-card p-4">
      <form onSubmit={handleSubmit}>
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-brand flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => { setContent(e.target.value); autoResize(); }}
              onFocus={() => setFocused(true)}
              placeholder="Share something with your community…"
              rows={focused ? 3 : 2}
              className="w-full bg-transparent text-sm text-white placeholder-white/30 outline-none resize-none leading-relaxed transition-all"
              style={{ minHeight: focused ? '72px' : '44px' }}
            />

            {/* Image preview */}
            {imagePreview && (
              <div className="relative mt-2 rounded-xl overflow-hidden border border-white/10">
                <img src={imagePreview} alt="Preview" className="w-full max-h-64 object-cover rounded-xl" />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {(focused || content.trim() || imagePreview) && (
              <div className="mt-3 pt-3 border-t border-white/[0.07] space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Scope selector */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => { setShowScopeMenu(!showScopeMenu); setShowCommunityMenu(false); }}
                      className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white bg-white/8 hover:bg-white/12 border border-white/10 rounded-lg px-2.5 py-1.5 transition-all"
                    >
                      <ScopeIcon className="w-3 h-3 text-emerald-400" />
                      {scopeDisplayLabel}
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    {showScopeMenu && (
                      <div className="absolute top-full left-0 mt-1 w-48 glass-card border border-white/10 rounded-xl p-1 z-50 shadow-2xl">
                        {scopes.map(({ value, label, icon: Icon, desc }) => {
                          const displayLabel = value === 'area' && profile?.postcode
                            ? profile.postcode
                            : value === 'city' && profile?.city
                            ? profile.city
                            : value === 'region' && profile?.region
                            ? profile.region
                            : label;
                          return (
                            <button
                              key={value}
                              type="button"
                              onClick={() => { setScope(value); setShowScopeMenu(false); }}
                              className={cn(
                                'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all text-left',
                                scope === value ? 'bg-emerald-500/15 text-emerald-400' : 'text-white/60 hover:bg-white/8 hover:text-white'
                              )}
                            >
                              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                              <div>
                                <div className="font-medium">{displayLabel}</div>
                                <div className="text-white/35">{desc}</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Community selector */}
                  {!communityId && communities.length > 0 && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => { setShowCommunityMenu(!showCommunityMenu); setShowScopeMenu(false); }}
                        className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white bg-white/8 hover:bg-white/12 border border-white/10 rounded-lg px-2.5 py-1.5 transition-all"
                      >
                        <Users className="w-3 h-3 text-cyan-400" />
                        {selectedCommunity ? selectedCommunity.name : 'Community'}
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      {showCommunityMenu && (
                        <div className="absolute top-full left-0 mt-1 w-52 glass-card border border-white/10 rounded-xl p-1 z-50 shadow-2xl max-h-48 overflow-y-auto scrollbar-hide">
                          <button
                            type="button"
                            onClick={() => { setSelectedCommunity(null); setShowCommunityMenu(false); }}
                            className={cn('w-full text-left px-3 py-2 rounded-lg text-xs transition-all',
                              !selectedCommunity ? 'bg-emerald-500/15 text-emerald-400' : 'text-white/50 hover:bg-white/8 hover:text-white'
                            )}
                          >No community</button>
                          {communities.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => { setSelectedCommunity(c); setShowCommunityMenu(false); }}
                              className={cn('w-full text-left px-3 py-2 rounded-lg text-xs transition-all',
                                selectedCommunity?.id === c.id ? 'bg-emerald-500/15 text-emerald-400' : 'text-white/60 hover:bg-white/8 hover:text-white'
                              )}
                            >{c.name}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Action row */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 text-xs text-white/50 hover:text-emerald-400 px-2.5 py-1.5 rounded-lg hover:bg-emerald-500/8 transition-all"
                    >
                      <ImagePlus className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Photo</span>
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setContent(''); setFocused(false); setSelectedCommunity(null); removeImage(); }}
                      className="btn-ghost text-xs px-3 py-1.5"
                    >Cancel</button>
                    <button
                      type="submit"
                      disabled={!content.trim() || loading}
                      className="btn-brand text-xs px-4 py-1.5 gap-1.5"
                    >
                      <Send className="w-3 h-3" />
                      {loading ? 'Posting…' : 'Post'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
