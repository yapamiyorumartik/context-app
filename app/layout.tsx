import type { Metadata } from 'next';
import { Inter, Lora } from 'next/font/google';

import { Header } from '@/components/shared/header';

import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const lora = Lora({
  subsets: ['latin'],
  variable: '--font-lora',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Context — Read English without breaking flow',
  description:
    'A context-aware English reading companion for Turkish B2+ learners. Free, no signup.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${lora.variable}`}>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <Header />
        <main>{children}</main>
      </body>
    </html>
  );
}
