/**
 * Food log, stored only in this browser's localStorage (like workout history).
 */

export type Meal = "breakfast" | "lunch" | "dinner" | "snack";

export interface FoodEntry {
  id: string;
  /** Epoch ms. */
  eatenAt: number;
  meal: Meal;
  name: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

const KEY = "formai:food";
const MAX_ENTRIES = 1000;

export const MEAL_LABELS: Record<Meal, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

/** A sensible default meal for the time of day. */
export function mealForTime(ms: number): Meal {
  const h = new Date(ms).getHours();
  if (h >= 5 && h < 11) return "breakfast";
  if (h >= 11 && h < 16) return "lunch";
  if (h >= 18 && h < 23) return "dinner";
  return "snack";
}

export function loadFood(): FoodEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as FoodEntry[]).filter((e) => typeof e?.eatenAt === "number") : [];
  } catch {
    return [];
  }
}

function persist(entries: FoodEntry[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
  } catch {
    /* storage unavailable — the log just won't persist */
  }
}

export function addFood(entry: Omit<FoodEntry, "id">): FoodEntry[] {
  const full: FoodEntry = { ...entry, id: `${entry.eatenAt.toString(36)}-${Math.random().toString(36).slice(2, 7)}` };
  const next = [...loadFood(), full];
  persist(next);
  return next;
}

export function deleteFood(id: string): FoodEntry[] {
  const next = loadFood().filter((e) => e.id !== id);
  persist(next);
  return next;
}

function sameLocalDay(a: number, b: number): boolean {
  const x = new Date(a);
  const y = new Date(b);
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
}

export function foodForDay(entries: FoodEntry[], day: number): FoodEntry[] {
  return entries.filter((e) => sameLocalDay(e.eatenAt, day)).sort((a, b) => a.eatenAt - b.eatenAt);
}

export function sumFood(entries: FoodEntry[]) {
  return entries.reduce(
    (t, e) => ({
      kcal: t.kcal + e.kcal,
      protein_g: t.protein_g + e.protein_g,
      carbs_g: t.carbs_g + e.carbs_g,
      fat_g: t.fat_g + e.fat_g,
    }),
    { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );
}
