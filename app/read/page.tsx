'use client';

import { useMemo } from 'react';

import { Article } from '@/components/reader/article';
import { EmptyState } from '@/components/reader/empty';
import { FullTranslation } from '@/components/reader/full-translation';
import { OnboardingTip } from '@/components/reader/onboarding-tip';
import { ReadingProgress } from '@/components/reader/progress';
import { ReaderToast } from '@/components/reader/toast';
import { ReadingTopBar } from '@/components/reader/top-bar';
import { TranslationPopoverHost } from '@/components/reader/translation-popover';
import { useHydratedStore } from '@/hooks/useHydratedStore';
import { useReaderStore } from '@/lib/reader/store';
import { useVocabularyStore } from '@/lib/storage/store';
import type { ReadingSession } from '@/types';

const MIN_CHARS = 20;

export default function ReadPage() {
  // Hydration only matters for showing saved-word underlines from prior
  // sessions; render the page either way to avoid layout shift.
  useHydratedStore();

  const session = useReaderStore((s) => s.currentSession);
  const setSession = useReaderStore((s) => s.setSession);
  const sessionSavedIds = useReaderStore((s) => s.savedWordIds);
  const resetReader = useReaderStore((s) => s.reset);

  const vocabulary = useVocabularyStore((s) => s.vocabulary);
  const settings = useVocabularyStore((s) => s.settings);
  const addSession = useVocabularyStore((s) => s.addSession);
  const updateSettings = useVocabularyStore((s) => s.updateSettings);

  const savedLemmas = useMemo(() => {
    const set = new Set<string>(sessionSavedIds);
    for (const v of vocabulary) set.add(v.lemma);
    return set;
  }, [sessionSavedIds, vocabulary]);

  const handleStart = (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed.length < MIN_CHARS) return;
    const words = trimmed.split(/\s+/);
    const title = words.slice(0, 6).join(' ');
    const newSession: ReadingSession = {
      id: crypto.randomUUID(),
      title,
      text: trimmed,
      createdAt: Date.now(),
      wordCount: words.length,
    };
    addSession(newSession);
    setSession(newSession);
    if (!settings.hasSeenOnboarding) {
      updateSettings({ hasSeenOnboarding: true });
    }
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0 });
    }
  };

  const handleExit = () => {
    if (sessionSavedIds.size > 0) {
      const ok = window.confirm(
        "You've saved words from this text. Start a new one?"
      );
      if (!ok) return;
    }
    resetReader();
  };

  if (!session) {
    return (
      <>
        <EmptyState onStart={handleStart} />
        <ReaderToast />
      </>
    );
  }

  return (
    <>
      <ReadingProgress />
      <ReadingTopBar session={session} onExit={handleExit} />
      <OnboardingTip />
      <Article text={session.text} savedLemmas={savedLemmas} />
      <FullTranslation text={session.text} />
      <TranslationPopoverHost />
      <ReaderToast />
    </>
  );
}
