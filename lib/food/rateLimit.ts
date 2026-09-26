import "server-only";

/**
 * Best-effort daily cap on food scans per subscriber, to keep AI costs
 * predictable. At roughly $0.02–0.03 per scan, 10/day caps a heavy user at
 * about $7.50/month of API cost against $14.99 of revenue. It's in memory, so each server instance counts separately and
 * counts reset on redeploy. That's fine as a guard rail; use a shared store
 * (e.g. Vercel KV / Upstash) if you need an exact limit.
 */
export const DAILY_SCAN_LIMIT = Number(process.env.FORMAI_FOOD_DAILY_LIMIT || 10);

const counts = new Map<string, { day: string; n: number }>();

export function takeScan(key: string, now = new Date()): boolean {
  const day = now.toISOString().slice(0, 10);
  const entry = counts.get(key);
  if (!entry || entry.day !== day) {
    counts.set(key, { day, n: 1 });
    return true;
  }
  if (entry.n >= DAILY_SCAN_LIMIT) return false;
  entry.n += 1;
  return true;
}
