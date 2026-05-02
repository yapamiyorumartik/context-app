'use client';

import { motion } from 'framer-motion';
import { BookmarkPlus, MousePointerClick, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { useHydratedStore } from '@/hooks/useHydratedStore';
import { useVocabularyStore } from '@/lib/storage/store';

const FEATURES = [
  {
    icon: MousePointerClick,
    title: 'Tap any word',
    body: 'Instant contextual meaning — never break the flow.',
  },
  {
    icon: BookmarkPlus,
    title: 'Save effortlessly',
    body: 'Build your personal vocabulary as you read.',
  },
  {
    icon: Sparkles,
    title: 'Quick reviews',
    body: '60-second daily warm-ups to make words stick.',
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
};

export default function LandingPage() {
  const router = useRouter();
  const hydrated = useHydratedStore();
  const hasSeen = useVocabularyStore((s) => s.settings.hasSeenOnboarding);

  // Returning users skip the landing — straight to the dashboard.
  useEffect(() => {
    if (hydrated && hasSeen) router.replace('/home');
  }, [hydrated, hasSeen, router]);

  // While we're checking — or while the redirect is in flight — show
  // nothing rather than flashing the marketing page.
  if (!hydrated || hasSeen) {
    return <div className="min-h-[60vh]" />;
  }

  return (
    <div className="mx-auto max-w-3xl px-6">
      <section className="pb-16 pt-24 sm:pt-32">
        <motion.h1
          {...fadeUp}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="font-serif text-4xl leading-tight tracking-tight sm:text-5xl"
        >
          Read English.
          <br />
          Without breaking flow.
        </motion.h1>

        <motion.p
          {...fadeUp}
          transition={{ duration: 0.5, delay: 0.08, ease: 'easeOut' }}
          className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground"
        >
          İleri seviye İngilizce metinleri akışı bozmadan okuyun. Bilmediğiniz
          kelimeleri anında, bağlama uygun şekilde anlayın.
        </motion.p>

        <motion.div
          {...fadeUp}
          transition={{ duration: 0.5, delay: 0.16, ease: 'easeOut' }}
          className="mt-10"
        >
          <Button asChild size="lg">
            <Link href="/read">Start Reading</Link>
          </Button>
        </motion.div>
      </section>

      <section className="grid gap-4 pb-20 sm:grid-cols-3">
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.title}
            {...fadeUp}
            transition={{
              duration: 0.5,
              delay: 0.24 + i * 0.05,
              ease: 'easeOut',
            }}
            className="rounded-lg border border-border/60 bg-card p-5"
          >
            <f.icon
              className="h-5 w-5 text-muted-foreground"
              aria-hidden="true"
            />
            <h3 className="mt-3 font-sans text-sm font-medium">{f.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {f.body}
            </p>
          </motion.div>
        ))}
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        Made for B2+ English learners. Free, no signup.
      </footer>
    </div>
  );
}
