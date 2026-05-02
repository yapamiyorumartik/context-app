import type { Metadata } from 'next';
import { Inter, Lora } from 'next/font/google';

import { Header } from '@/components/shared/header';
import { MotionProvider } from '@/components/shared/motion-provider';

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

const TITLE = 'Context — A reading companion for English learners';
const DESCRIPTION =
  'Read difficult English without breaking your flow. İleri seviye İngilizce metinleri akıcı şekilde okuyun. Free, no signup.';
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.VERCEL_PROJECT_PRODUCTION_URL ??
  'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(
    SITE_URL.startsWith('http') ? SITE_URL : `https://${SITE_URL}`
  ),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: 'Context',
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${lora.variable}`}>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <MotionProvider>
          <Header />
          <main>{children}</main>
        </MotionProvider>
      </body>
    </html>
  );
}
