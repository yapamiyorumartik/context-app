'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { cn } from '@/lib/utils';
import type { ReadingSession } from '@/types';

interface SecondaryCardsProps {
  lastSession: ReadingSession | undefined;
  totalWords: number;
  streak: number;
  weekReviewed: number;
  accuracy: number | null;
}

export function SecondaryCards({
  lastSession,
  totalWords,
  streak,
  weekReviewed,
  accuracy,
}: SecondaryCardsProps) {
  const hasStats = weekReviewed > 0 || accuracy !== null;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <ContinueReadingCard session={lastSession} />
      <CollectionCard totalWords={totalWords} streak={streak} />
      {hasStats ? (
        <QuickStatsCard
          weekReviewed={weekReviewed}
          accuracy={accuracy}
          full={false}
        />
      ) : null}
    </div>
  );
}

function Card({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'group flex flex-col rounded-lg border border-border/60 bg-card p-5 transition-colors hover:border-foreground/30',
        className
      )}
    >
      {children}
    </Link>
  );
}

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
      {children}
    </div>
  );
}

function CardArrow({ label }: { label: string }) {
  return (
    <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground">
      {label}
      <ArrowRight className="h-3 w-3" />
    </span>
  );
}

function ContinueReadingCard({
  session,
}: {
  session: ReadingSession | undefined;
}) {
  if (!session) {
    return (
      <Card href="/read">
        <CardLabel>Reader</CardLabel>
        <p className="mt-2 font-serif text-base text-foreground">
          Paste new text to start reading.
        </p>
        <CardArrow label="Open reader" />
      </Card>
    );
  }
  return (
    <Card href="/read">
      <CardLabel>Continue reading</CardLabel>
      <p className="mt-2 line-clamp-2 font-serif text-base italic text-foreground">
        {session.title}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {session.wordCount} words
      </p>
      <CardArrow label="Continue" />
    </Card>
  );
}

function CollectionCard({
  totalWords,
  streak,
}: {
  totalWords: number;
  streak: number;
}) {
  return (
    <Card href="/words">
      <CardLabel>Your collection</CardLabel>
      <p className="mt-2 font-serif text-2xl tracking-tight text-foreground">
        {totalWords} word{totalWords === 1 ? '' : 's'}
      </p>
      {streak > 0 ? (
        <p className="mt-1 text-xs text-muted-foreground">
          🔥 {streak}-day streak
        </p>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">
          Start a streak with a quick review.
        </p>
      )}
      <CardArrow label="View all" />
    </Card>
  );
}

function QuickStatsCard({
  weekReviewed,
  accuracy,
  full,
}: {
  weekReviewed: number;
  accuracy: number | null;
  full: boolean;
}) {
  return (
    <Link
      href="/review"
      className={cn(
        'group flex flex-col rounded-lg border border-border/60 bg-card p-5 transition-colors hover:border-foreground/30',
        full && 'sm:col-span-2'
      )}
    >
      <CardLabel>Quick stats</CardLabel>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <Stat label="Reviewed this week" value={String(weekReviewed)} />
        <Stat
          label="Average accuracy"
          value={accuracy !== null ? `${accuracy}%` : '—'}
        />
      </div>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-serif text-xl tracking-tight text-foreground">
        {value}
      </div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}
