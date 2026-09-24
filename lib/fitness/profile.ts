import { DEFAULT_WEIGHT_KG } from "./calories";

/** Personal settings, stored only in this browser (never sent to a server). */
export interface Profile {
  /** Body weight in kilograms, or null if the user hasn't entered it. */
  weightKg: number | null;
  /** How the user prefers to see weight. */
  unit: "kg" | "lb";
  /** Daily active-calorie goal. */
  dailyGoalKcal: number;
}

const KEY = "formai:profile";
export const DEFAULT_PROFILE: Profile = { weightKg: null, unit: "kg", dailyGoalKcal: 300 };

export const LB_PER_KG = 2.20462;

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PROFILE;
    const p = JSON.parse(raw) as Partial<Profile>;
    return {
      weightKg: typeof p.weightKg === "number" && p.weightKg > 20 && p.weightKg < 350 ? p.weightKg : null,
      unit: p.unit === "lb" ? "lb" : "kg",
      dailyGoalKcal:
        typeof p.dailyGoalKcal === "number" && p.dailyGoalKcal >= 50 && p.dailyGoalKcal <= 5000
          ? p.dailyGoalKcal
          : DEFAULT_PROFILE.dailyGoalKcal,
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveProfile(profile: Profile): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    /* storage unavailable (private mode) — settings just won't persist */
  }
}

/** Weight to use for calorie math. */
export function effectiveWeightKg(profile: Profile): number {
  return profile.weightKg ?? DEFAULT_WEIGHT_KG;
}

/** "72 kg" / "159 lb". */
export function formatWeight(kg: number, unit: Profile["unit"]): string {
  return unit === "lb" ? `${Math.round(kg * LB_PER_KG)} lb` : `${Math.round(kg)} kg`;
}

/** Parse user input in the given unit to kilograms; null if not a plausible body weight. */
export function parseWeight(input: string, unit: Profile["unit"]): number | null {
  const n = Number.parseFloat(input.replace(",", "."));
  if (!Number.isFinite(n)) return null;
  const kg = unit === "lb" ? n / LB_PER_KG : n;
  return kg > 20 && kg < 350 ? kg : null;
}
