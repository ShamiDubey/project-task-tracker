import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Script from 'next/script';

import { themeBootScript } from '@/components/theme';

import './globals.css';

const sans = Geist({ variable: '--font-geist-sans', subsets: ['latin'], display: 'swap' });
const mono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Cadence', template: '%s · Cadence' },
  description:
    'Delivery, in view. Project and task tracking for a services company — the portfolio at a glance, and a straight answer to what is overdue and who is overloaded.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} h-full`} suppressHydrationWarning>
      <head>
        {/* Applies the stored theme before first paint, so there is no flash of the wrong one. */}
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
