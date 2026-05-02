'use client';

import { useEffect, useState } from 'react';

import { pickIdiom } from '@/lib/data/idioms';

function greetingFor(now: Date): string {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function Greeting() {
  // Compute on the client only to avoid SSR/CSR hydration mismatch
  // (greeting depends on the user's clock, not the server's).
  const [content, setContent] = useState<{
    greeting: string;
    idiom: string;
  } | null>(null);

  useEffect(() => {
    const now = new Date();
    setContent({ greeting: greetingFor(now), idiom: pickIdiom(now) });
  }, []);

  return (
    <header>
      <h1 className="font-serif text-3xl tracking-tight sm:text-4xl">
        {content ? `${content.greeting}.` : ' '}
      </h1>
      <p className="mt-1 min-h-[1.25rem] text-sm italic text-muted-foreground">
        {content ? `“${content.idiom}”` : ' '}
      </p>
    </header>
  );
}
