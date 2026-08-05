'use client';

import { MessageSquare } from 'lucide-react';

export default function MessagesPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
      <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4">
        <MessageSquare className="w-7 h-7 text-white/20" />
      </div>
      <h3 className="text-base font-semibold text-white/50 mb-1">Your Messages</h3>
      <p className="text-sm text-white/25 max-w-xs">
        Select a conversation from the left, or visit someone's profile to start a new one.
      </p>
    </div>
  );
}
