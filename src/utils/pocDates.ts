const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const toUtcMs = (isoDate: string): number | null => {
  const m = ISO_DATE.exec(isoDate);
  if (!m) return null;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
};

/** Returns today's local date as YYYY-MM-DD. */
export function todayIsoDate(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Adds whole days to a YYYY-MM-DD date. Returns "" for invalid input. */
export function addDays(isoDate: string, days: number): string {
  const ms = toUtcMs(isoDate);
  if (ms === null || !Number.isFinite(days)) return "";
  return new Date(ms + Math.trunc(days) * 86_400_000).toISOString().slice(0, 10);
}

/** Days from `from` (default today) until `isoDate`. Negative = overdue. */
export function daysUntil(isoDate: string, from: string = todayIsoDate()): number | null {
  const target = toUtcMs(isoDate);
  const start = toUtcMs(from);
  if (target === null || start === null) return null;
  return Math.round((target - start) / 86_400_000);
}
