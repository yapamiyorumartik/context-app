'use client';

import { BookOpen } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

export function WordsEmpty() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-16 text-center sm:py-24">
      <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full border border-border/60 bg-card text-muted-foreground">
        <BookOpen className="h-6 w-6" aria-hidden="true" />
      </div>
      <h2 className="font-serif text-2xl tracking-tight">No words yet.</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Tap any word while reading to capture it here.
      </p>
      <div className="mt-6">
        <Button asChild size="lg">
          <Link href="/read">Go to Reader</Link>
        </Button>
      </div>
    </div>
  );
}
