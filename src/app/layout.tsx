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
      <body className="min-h-full font-sans">
        {/*
         * Applies the stored theme before first paint, so a viewer who chose dark never sees a
         * flash of the light palette.
         *
         * It has to run synchronously before the browser paints, which is what `beforeInteractive`
         * guarantees. Using next/script rather than a raw <script> in the tree also avoids React's
         * warning that script elements are not re-executed on client navigation — true, and
         * irrelevant here, since the theme only needs applying once per document load.
         */}
        <Script id="theme-boot" strategy="beforeInteractive">
          {themeBootScript}
        </Script>
        {children}
      </body>
    </html>
  );
}
