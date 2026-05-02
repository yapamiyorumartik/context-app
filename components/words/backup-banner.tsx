'use client';

import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

const SESSION_KEY = 'context.backupBanner.dismissed';

interface BackupBannerProps {
  count: number;
  lastExportedAt?: number;
}

const FOURTEEN_DAYS = 14 * 24 * 60 * 60 * 1000;

export function BackupBanner({ count, lastExportedAt }: BackupBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof sessionStorage === 'undefined') return;
    setDismissed(sessionStorage.getItem(SESSION_KEY) === '1');
  }, []);

  const overdue =
    !lastExportedAt || Date.now() - lastExportedAt > FOURTEEN_DAYS;

  if (count <= 20 || !overdue || dismissed) return null;

  return (
    <div className="flex items-center gap-3 rounded-md border border-amber-200/70 bg-amber-50/60 px-4 py-2 text-sm text-amber-900">
      <span className="flex-1">
        💾 You have {count} words saved. Back them up to be safe.
      </span>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => {
          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem(SESSION_KEY, '1');
          }
          setDismissed(true);
        }}
        className="-mr-1 inline-flex h-7 w-7 items-center justify-center rounded-md text-amber-800/70 transition-colors hover:bg-amber-100 hover:text-amber-900"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
