/**
 * Workout history, stored only in this browser's localStorage. Nothing is
 * uploaded, which keeps FormAI's "nothing leaves your device" promise.
 */

export interface WorkoutRecord {
  id: string;
  /** Epoch ms when the set ended. */
  endedAt: number;
  exerciseId: string;
  exerciseName: string;
  reps: number;
  goodReps: number;
  flaggedReps: number;
  kcal: number;
  durationMs: number;
  topIssue: string | null;
}

const KEY = "formai:history";
const MAX_RECORDS = 500;

export function loadHistory(): WorkoutRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as WorkoutRecord[]).filter((r) => typeof r?.endedAt === "number") : [];
  } catch {
    return [];
  }
}

export function saveWorkout(record: Omit<WorkoutRecord, "id">): WorkoutRecord {
  const full: WorkoutRecord = { ...record, id: `${record.endedAt.toString(36)}-${Math.random().toString(36).slice(2, 7)}` };
  try {
    const next = [...loadHistory(), full].slice(-MAX_RECORDS);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable — the summary still shows, it just isn't kept */
  }
  return full;
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** Local-time day key, e.g. "2026-09-24". */
export function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export interface DayTotals {
  day: string;
  /** Start of that local day, epoch ms. */
  start: number;
  kcal: number;
  reps: number;
  goodReps: number;
  sessions: number;
}

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Totals for each of the last `days` days (oldest first), including days with no workouts. */
export function dailyTotals(records: WorkoutRecord[], now: number, days = 7): DayTotals[] {
  const result: DayTotals[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(startOfDay(now));
    d.setDate(d.getDate() - i);
    result.push({ day: dayKey(d.getTime()), start: d.getTime(), kcal: 0, reps: 0, goodReps: 0, sessions: 0 });
  }
  const byDay = new Map(result.map((r) => [r.day, r]));
  for (const r of records) {
    const bucket = byDay.get(dayKey(r.endedAt));
    if (!bucket) continue;
    bucket.kcal += r.kcal;
    bucket.reps += r.reps;
    bucket.goodReps += r.goodReps;
    bucket.sessions += 1;
  }
  return result;
}

/** Consecutive days with at least one workout, counting back from today (or yesterday if not yet today). */
export function currentStreak(records: WorkoutRecord[], now: number): number {
  const days = new Set(records.map((r) => dayKey(r.endedAt)));
  const cursor = new Date(startOfDay(now));
  if (!days.has(dayKey(cursor.getTime()))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(dayKey(cursor.getTime()))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Share of reps with good form, 0–100, or null if there were no reps. */
export function formScore(goodReps: number, reps: number): number | null {
  return reps > 0 ? Math.round((goodReps / reps) * 100) : null;
}
