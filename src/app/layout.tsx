import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Project Tracker',
  description:
    'Internal project and task tracking — the portfolio at a glance, and a straight answer to what is overdue.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
