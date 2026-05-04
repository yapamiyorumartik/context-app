'use client';

import { BookOpen } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

export function ReviewEmpty({ minWords }: { minWords?: boolean }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full border border-border/60 bg-card text-muted-foreground">
        <BookOpen className="h-6 w-6" aria-hidden="true" />
      </div>
      <h2 className="font-serif text-2xl tracking-tight">
        {minWords
          ? 'Save at least 4 words before reviewing.'
          : 'Nothing to review yet.'}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {minWords
          ? 'Tap any word while reading to capture it.'
          : 'Save some words first.'}
      </p>
      <div className="mt-6">
        <Button asChild size="lg">
          <Link href="/read">Go to Reader</Link>
        </Button>
      </div>
    </div>
  );
}
