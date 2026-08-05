'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Moon, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const redirectTo = `${window.location.origin}/auth/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) { toast.error(error.message); } else { setSent(true); }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center gap-2 mb-10">
          <div className="w-8 h-8 rounded-xl bg-gradient-brand flex items-center justify-center">
            <Moon className="w-4 h-4 text-white" fill="white" />
          </div>
          <span className="text-lg font-bold text-white">ConnectMuslim</span>
        </Link>

        {sent ? (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Check your email</h1>
            <p className="text-white/50 mb-6 text-sm">We sent a reset link to <span className="text-white/80">{email}</span></p>
            <Link href="/auth/login" className="btn-brand inline-flex">Back to sign in</Link>
          </div>
        ) : (
          <>
            <Link href="/auth/login" className="flex items-center gap-1.5 text-sm text-white/45 hover:text-white/70 mb-8 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to sign in
            </Link>
            <h1 className="text-2xl font-bold text-white mb-1">Reset your password</h1>
            <p className="text-white/45 text-sm mb-7">Enter your email and we'll send you a reset link.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" className="field-input" />
              <button type="submit" disabled={loading} className="btn-brand w-full">
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
