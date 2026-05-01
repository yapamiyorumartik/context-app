'use client';

import { useEffect } from 'react';

import { useVocabularyStore } from '@/lib/storage/store';

/**
 * Hydrate the Zustand store from localStorage on the client.
 * Returns `true` once hydration has completed.
 *
 * Components that read localStorage-backed state should gate
 * their render on this flag to avoid SSR/CSR markup mismatches.
 */
export function useHydratedStore(): boolean {
  const hydrated = useVocabularyStore((s) => s.hydrated);

  useEffect(() => {
    useVocabularyStore.getState().hydrate();
  }, []);

  return hydrated;
}
