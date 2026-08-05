import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/contexts/auth-context';
import { AuthPromptProvider } from '@/components/auth-prompt-modal';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'ConnectMuslim — Manchester Muslim Community',
  description: 'Discover Muslim events, groups, mosques, businesses and jobs near you in Manchester — all in one trusted place. Free to browse, no account needed.',
  openGraph: {
    title: 'ConnectMuslim — Manchester Muslim Community',
    description: 'Discover Muslim events, groups, mosques, businesses and jobs near you in Manchester — all in one trusted place.',
    images: [{ url: 'https://bolt.new/static/og_default.png' }],
  },
  twitter: {
    card: 'summary_large_image',
    images: [{ url: 'https://bolt.new/static/og_default.png' }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans bg-[#050505] text-white antialiased`}>
        <AuthProvider>
          <AuthPromptProvider>
            {children}
            <Toaster theme="dark" position="top-right" richColors />
          </AuthPromptProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
