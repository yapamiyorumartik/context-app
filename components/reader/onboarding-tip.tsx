'use client';

import { Lightbulb, X } from 'lucide-react';
import { useState } from 'react';

import { useVocabularyStore } from '@/lib/storage/store';

export function OnboardingTip() {
  const seen = useVocabularyStore((s) => s.settings.hasSeenReaderTip);
  const updateSettings = useVocabularyStore((s) => s.updateSettings);
  // Local copy so the dismiss animation feels instant even if the
  // settings round-trip lags.
  const [hidden, setHidden] = useState(false);

  if (seen || hidden) return null;

  const dismiss = () => {
    setHidden(true);
    updateSettings({ hasSeenReaderTip: true });
  };

  return (
    <div className="mx-auto mt-2 flex max-w-[680px] items-center gap-3 rounded-md border border-amber-200/70 bg-amber-50/70 px-4 py-2 text-sm text-amber-900">
      <Lightbulb className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="flex-1">💡 Tap any word to see its meaning.</span>
      <button
        type="button"
        aria-label="Dismiss tip"
        onClick={dismiss}
        className="-mr-1 inline-flex h-7 w-7 items-center justify-center rounded-md text-amber-800/70 transition-colors hover:bg-amber-100 hover:text-amber-900"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
