/**
 * Tiny relative-time formatter ("3 days ago", "yesterday", "just now").
 * English microcopy on purpose — Turkish lives in translated definitions.
 */
export function relativeTime(ts: number, now: number = Date.now()): string {
  const diff = now - ts;
  if (diff < 60_000) return 'just now';
  const min = Math.floor(diff / 60_000);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day === 1) return 'yesterday';
  if (day < 30) return `${day} days ago`;
  const mon = Math.floor(day / 30);
  if (mon < 12) return `${mon}mo ago`;
  return `${Math.floor(mon / 12)}y ago`;
}
