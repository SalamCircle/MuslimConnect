'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Moon, Eye, EyeOff, ArrowRight, Star } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      const { data: prof } = await supabase.from('profiles').select('role, is_admin, is_moderator').eq('id', authUser.id).maybeSingle();
      if (prof?.is_admin || prof?.role === 'admin') {
        router.replace('/dashboard/admin');
      } else if (prof?.is_moderator || prof?.role === 'moderator') {
        router.replace('/dashboard/admin/moderate');
      } else {
        router.replace('/dashboard');
      }
    } else {
      router.replace('/dashboard');
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 dot-grid" />
        <div className="absolute top-1/3 left-1/4 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl animate-float" />
        <div className="absolute bottom-1/3 right-1/4 w-64 h-64 rounded-full bg-cyan-500/10 blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="relative z-10 px-14 max-w-md">
          <Link href="/" className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-2xl bg-gradient-brand flex items-center justify-center glow-sm">
              <Moon className="w-5 h-5 text-white" fill="white" />
            </div>
            <span className="text-xl font-bold text-white">ConnectMuslim</span>
          </Link>
          <h2 className="text-3xl font-bold text-white mb-4 leading-tight">
            Welcome back to your <span className="text-gradient">community</span>
          </h2>
          <p className="text-white/55 mb-8 leading-relaxed">Connect with the Manchester Muslim community, discover local events, groups and businesses, and grow together.</p>
          <div className="space-y-3">
            {['Local events, mosques and businesses', 'Groups for students, youth and families', 'Free to browse, sign in to participate', 'Launching in Manchester — more cities soon'].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center flex-shrink-0">
                  <Star className="w-2.5 h-2.5 text-emerald-400" fill="currentColor" />
                </div>
                <span className="text-white/65 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <Link href="/" className="flex items-center gap-2 mb-10 lg:hidden">
            <div className="w-8 h-8 rounded-xl bg-gradient-brand flex items-center justify-center">
              <Moon className="w-4 h-4 text-white" fill="white" />
            </div>
            <span className="text-lg font-bold text-white">ConnectMuslim</span>
          </Link>

          <h1 className="text-2xl font-bold text-white mb-1">Sign in</h1>
          <p className="text-white/45 text-sm mb-8">
            New here?{' '}
            <Link href="/auth/signup" className="text-emerald-400 hover:text-emerald-300 transition-colors">Create an account</Link>
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wide">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" className="field-input" />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wide">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Your password" className="field-input pr-12" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/35 hover:text-white/65 transition-colors">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="text-right mt-1.5">
                <Link href="/auth/forgot-password" className="text-xs text-white/35 hover:text-emerald-400 transition-colors">Forgot password?</Link>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-brand w-full mt-2">
              {loading ? 'Signing in…' : <><ArrowRight className="w-4 h-4" /> Sign in</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
