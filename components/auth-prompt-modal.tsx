'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import Link from 'next/link';
import { X, Users, MessageSquare, Heart, Bell, BookOpen, Bookmark, Send, CalendarPlus, Store, PenSquare, Lock } from 'lucide-react';

export type AuthAction =
  | 'comment'
  | 'like'
  | 'save'
  | 'message'
  | 'join'
  | 'post'
  | 'create_event'
  | 'add_listing'
  | 'generic';

interface AuthPromptContextValue {
  prompt: (action?: AuthAction) => void;
}

const AuthPromptContext = createContext<AuthPromptContextValue>({ prompt: () => {} });

interface ActionConfig {
  icon: React.ElementType;
  title: string;
  message: string;
  benefits: { icon: React.ElementType; text: string }[];
}

const ACTION_CONFIG: Record<AuthAction, ActionConfig> = {
  join: {
    icon: Users,
    title: 'Join this group',
    message: 'Create a free account or sign in to join groups and participate in discussions.',
    benefits: [
      { icon: Users, text: 'Join and follow communities' },
      { icon: MessageSquare, text: 'Post, comment and react' },
      { icon: Bell, text: 'Get updates from your groups' },
    ],
  },
  comment: {
    icon: MessageSquare,
    title: 'Join the conversation',
    message: 'Create a free account or sign in to comment on posts and take part in discussions.',
    benefits: [
      { icon: MessageSquare, text: 'Comment and reply to posts' },
      { icon: Heart, text: 'Like and react to contributions' },
      { icon: Users, text: 'Follow members and communities' },
    ],
  },
  like: {
    icon: Heart,
    title: 'React to this post',
    message: 'Create a free account or sign in to like posts and show your appreciation.',
    benefits: [
      { icon: Heart, text: 'Like and react to posts' },
      { icon: MessageSquare, text: 'Comment and join discussions' },
      { icon: Users, text: 'Follow members and communities' },
    ],
  },
  save: {
    icon: Bookmark,
    title: 'Save this for later',
    message: 'Create a free account or sign in to save posts, jobs, events, businesses and mosques.',
    benefits: [
      { icon: Bookmark, text: 'Save posts, jobs and events' },
      { icon: Heart, text: 'Like and react to posts' },
      { icon: Users, text: 'Follow members and communities' },
    ],
  },
  message: {
    icon: Send,
    title: 'Send a message',
    message: 'Create a free account or sign in to message other members privately.',
    benefits: [
      { icon: Send, text: 'Private conversations with members' },
      { icon: Users, text: 'Follow members and communities' },
      { icon: Bell, text: 'Get notified of new messages' },
    ],
  },
  post: {
    icon: PenSquare,
    title: 'Share with the community',
    message: 'Create a free account or sign in to publish posts and share with Muslims near you.',
    benefits: [
      { icon: PenSquare, text: 'Publish posts and updates' },
      { icon: MessageSquare, text: 'Comment and react' },
      { icon: Users, text: 'Join groups and communities' },
    ],
  },
  create_event: {
    icon: CalendarPlus,
    title: 'Publish an event',
    message: 'Create a free account or sign in to publish events and invite your community.',
    benefits: [
      { icon: CalendarPlus, text: 'Create and manage events' },
      { icon: Bell, text: 'Track attendees and updates' },
      { icon: Users, text: 'Reach Muslims in your area' },
    ],
  },
  add_listing: {
    icon: Store,
    title: 'Add a listing',
    message: 'Create a free account or sign in to manage a mosque or business listing.',
    benefits: [
      { icon: Store, text: 'Manage your own listings' },
      { icon: Bell, text: 'Respond to feedback and updates' },
      { icon: Users, text: 'Reach the local community' },
    ],
  },
  generic: {
    icon: Users,
    title: 'Join ConnectMuslim',
    message: 'Become part of the community. Free forever.',
    benefits: [
      { icon: MessageSquare, text: 'Share thoughts and join discussions' },
      { icon: Heart, text: 'Like and react to community posts' },
      { icon: Users, text: 'Follow members and join communities' },
      { icon: Bell, text: 'Get notifications about your interests' },
      { icon: BookOpen, text: 'Access all resources and events' },
    ],
  },
};

export function AuthPromptProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<AuthAction>('generic');

  const prompt = useCallback((act: AuthAction = 'generic') => {
    setAction(act);
    setOpen(true);
  }, []);

  const config = ACTION_CONFIG[action] ?? ACTION_CONFIG.generic;
  const Icon = config.icon;

  return (
    <AuthPromptContext.Provider value={{ prompt }}>
      {children}
      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={config.title}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md bg-[#0e0e0e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-fade-up">
            <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500" />

            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-white/40 hover:text-white hover:bg-white/8 transition-all"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-7">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/20">
                <Icon className="w-6 h-6 text-white" />
              </div>

              <h2 className="text-xl font-bold text-white mb-1">{config.title}</h2>
              <p className="text-sm text-white/55 mb-5 leading-relaxed">{config.message}</p>

              <ul className="space-y-2.5 mb-6">
                {config.benefits.map(({ icon: BIcon, text }) => (
                  <li key={text} className="flex items-center gap-3 text-sm text-white/75">
                    <span className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <BIcon className="w-3.5 h-3.5 text-emerald-400" />
                    </span>
                    {text}
                  </li>
                ))}
              </ul>

              <Link
                href="/auth/signup"
                className="block w-full text-center py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-white font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-emerald-500/20 mb-3"
              >
                Create Free Account
              </Link>
              <div className="flex items-center justify-center gap-1.5 text-xs text-white/40">
                <Lock className="w-3 h-3" />
                <span>
                  Already have an account?{' '}
                  <Link href="/auth/login" className="text-emerald-400 hover:underline">Sign in</Link>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </AuthPromptContext.Provider>
  );
}

export function useAuthPrompt() {
  return useContext(AuthPromptContext);
}
