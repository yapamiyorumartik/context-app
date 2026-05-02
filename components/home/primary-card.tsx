'use client';

import { ArrowRight, Check } from 'lucide-react';
import Link from 'next/link';

interface PrimaryCardProps {
  dueCount: number;
  /** ms until next review, or null if no scheduled reviews. */
  nextReviewIn: number | null;
}

export function PrimaryCard({ dueCount, nextReviewIn }: PrimaryCardProps) {
  if (dueCount > 0) {
    const seconds = dueCount * 20;
    const eta =
      seconds < 60 ? `~${seconds}s` : `~${Math.round(seconds / 60)} min`;

    return (
      <CardLink href="/review" cta="Start review">
        <CardTitle>Words to review</CardTitle>
        <CardSub>
          {dueCount} word{dueCount === 1 ? '' : 's'} ready · {eta}
        </CardSub>
      </CardLink>
    );
  }

  return (
    <CardLink href="/read" cta="Read something">
      <CardTitle>
        <span className="inline-flex items-center gap-2">
          All caught up
          <Check className="h-5 w-5 text-emerald-600" />
        </span>
      </CardTitle>
      <CardSub>{nextReviewLabel(nextReviewIn)}</CardSub>
    </CardLink>
  );
}

function nextReviewLabel(ms: number | null): string {
  if (ms == null) return 'No reviews scheduled.';
  if (ms < 60 * 60 * 1000) return 'Next review in under an hour.';
  if (ms < 24 * 60 * 60 * 1000) {
    return `Next review in ${Math.round(ms / (60 * 60 * 1000))}h.`;
  }
  return `Next review in ${Math.round(ms / (24 * 60 * 60 * 1000))}d.`;
}

function CardLink({
  href,
  cta,
  children,
}: {
  href: string;
  cta: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-xl border border-border bg-card p-6 transition-colors hover:border-foreground/30"
    >
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">{children}</div>
        <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-foreground transition-transform group-hover:translate-x-0.5">
          {cta}
          <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-serif text-xl tracking-tight">{children}</h2>
  );
}

function CardSub({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-sm text-muted-foreground">{children}</p>;
}
