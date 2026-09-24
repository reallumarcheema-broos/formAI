/**
 * Calorie estimates for camera-tracked workouts.
 *
 * Uses the standard ACSM formula for energy expenditure from METs
 * (metabolic equivalents):
 *
 *   kcal per minute = MET × 3.5 × bodyWeightKg / 200
 *
 * MET values come from the Compendium of Physical Activities
 * (calisthenics: light 2.8, moderate 3.8, vigorous 8.0). We slide between an
 * exercise's "light" and "vigorous" MET based on how fast the reps are coming,
 * so a brisk set burns more per minute than a slow one.
 *
 * These are estimates (typically within ±20–30% for an individual), which is
 * why the UI always labels them as "est.".
 */

export interface CalorieProfile {
  /** MET while moving slowly / resting between reps within a set. */
  metLight: number;
  /** MET at or above `vigorousRepsPerMin`. */
  metVigorous: number;
  /** Rep pace that counts as vigorous effort. */
  vigorousRepsPerMin: number;
}

/** Used when the user hasn't entered their weight. */
export const DEFAULT_WEIGHT_KG = 70;

/** Only reps within this window count toward the current pace. */
const PACE_WINDOW_MS = 30_000;
/** Ignore gaps longer than this (tab hidden, frames dropped) instead of counting them as exercise. */
const MAX_TICK_MS = 2_000;

/** kcal per minute for a given MET and body weight (ACSM formula). */
export function kcalPerMinute(met: number, weightKg: number): number {
  return (met * 3.5 * weightKg) / 200;
}

/** Interpolate MET from rep pace: light at 0 reps/min, vigorous at `vigorousRepsPerMin` and above. */
export function metForPace(profile: CalorieProfile, repsPerMin: number): number {
  const t = Math.min(1, Math.max(0, repsPerMin / profile.vigorousRepsPerMin));
  return profile.metLight + (profile.metVigorous - profile.metLight) * t;
}

/**
 * Accumulates calories over a set. Call `tick` every frame with whether the
 * person is actively exercising (set running, body tracked), and `rep` each
 * time a rep is counted.
 */
export class CalorieTracker {
  private kcal = 0;
  private activeMs = 0;
  private lastTick: number | null = null;
  private repTimes: number[] = [];

  constructor(
    private readonly profile: CalorieProfile,
    private readonly weightKg: number = DEFAULT_WEIGHT_KG,
  ) {}

  rep(now: number): void {
    this.repTimes.push(now);
  }

  tick(now: number, active: boolean): void {
    const last = this.lastTick;
    this.lastTick = now;
    if (!active || last === null) return;
    const dt = now - last;
    if (dt <= 0 || dt > MAX_TICK_MS) return;

    this.repTimes = this.repTimes.filter((t) => now - t <= PACE_WINDOW_MS);
    // Before a full window has elapsed, measure pace over the time actually exercised.
    const windowMs = Math.max(10_000, Math.min(PACE_WINDOW_MS, this.activeMs + dt));
    const repsPerMin = (this.repTimes.length * 60_000) / windowMs;

    this.activeMs += dt;
    this.kcal += kcalPerMinute(metForPace(this.profile, repsPerMin), this.weightKg) * (dt / 60_000);
  }

  /** Call when pausing so the paused time isn't counted on resume. */
  pause(): void {
    this.lastTick = null;
  }

  get calories(): number {
    return this.kcal;
  }

  get activeMinutes(): number {
    return this.activeMs / 60_000;
  }
}
