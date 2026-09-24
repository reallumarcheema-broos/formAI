import { beforeEach, describe, expect, it } from "vitest";
import { clearHistory, currentStreak, dailyTotals, formScore, loadHistory, saveWorkout, type WorkoutRecord } from "@/lib/fitness/history";
import { formatWeight, loadProfile, parseWeight, saveProfile } from "@/lib/fitness/profile";

// Minimal localStorage for the node test environment.
class MemoryStorage {
  private data = new Map<string, string>();
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
}

beforeEach(() => {
  (globalThis as unknown as { localStorage: MemoryStorage }).localStorage = new MemoryStorage();
});

const DAY = 24 * 60 * 60 * 1000;
const noon = new Date(2026, 8, 24, 12, 0, 0).getTime();

function record(endedAt: number, kcal: number, reps = 10, goodReps = 8): Omit<WorkoutRecord, "id"> {
  return { endedAt, exerciseId: "squat", exerciseName: "Squat", reps, goodReps, flaggedReps: reps - goodReps, kcal, durationMs: 60_000, topIssue: null };
}

describe("history", () => {
  it("saves and loads workouts", () => {
    saveWorkout(record(noon, 12.5));
    const [r] = loadHistory();
    expect(r).toMatchObject({ kcal: 12.5, reps: 10 });
    expect(r.id).toBeTruthy();
    clearHistory();
    expect(loadHistory()).toEqual([]);
  });

  it("survives corrupted storage", () => {
    localStorage.setItem("formai:history", "{not json");
    expect(loadHistory()).toEqual([]);
  });

  it("totals the last 7 days, including empty days, oldest first", () => {
    const records = [record(noon, 10), record(noon - 1000, 5), record(noon - 2 * DAY, 20), record(noon - 10 * DAY, 99)] as WorkoutRecord[];
    const days = dailyTotals(records, noon);
    expect(days).toHaveLength(7);
    expect(days[6]).toMatchObject({ kcal: 15, sessions: 2, reps: 20 });
    expect(days[4]).toMatchObject({ kcal: 20, sessions: 1 });
    expect(days[5]).toMatchObject({ kcal: 0, sessions: 0 });
    expect(days.reduce((s, d) => s + d.kcal, 0)).toBe(35); // the 10-day-old one is excluded
  });

  it("counts a streak of consecutive days, even if today hasn't started", () => {
    const r = (daysAgo: number) => record(noon - daysAgo * DAY, 1) as WorkoutRecord;
    expect(currentStreak([r(0), r(1), r(2), r(4)], noon)).toBe(3);
    expect(currentStreak([r(1), r(2)], noon)).toBe(2);
    expect(currentStreak([r(3)], noon)).toBe(0);
    expect(currentStreak([], noon)).toBe(0);
  });

  it("computes a form score", () => {
    expect(formScore(8, 10)).toBe(80);
    expect(formScore(0, 0)).toBeNull();
  });
});

describe("profile", () => {
  it("round-trips and validates settings", () => {
    expect(loadProfile()).toMatchObject({ weightKg: null, unit: "kg", dailyGoalKcal: 300 });
    saveProfile({ weightKg: 80, unit: "lb", dailyGoalKcal: 450 });
    expect(loadProfile()).toEqual({ weightKg: 80, unit: "lb", dailyGoalKcal: 450 });
    localStorage.setItem("formai:profile", JSON.stringify({ weightKg: 5000, dailyGoalKcal: -1 }));
    expect(loadProfile()).toMatchObject({ weightKg: null, dailyGoalKcal: 300 });
  });

  it("parses and formats weight in kg and lb", () => {
    expect(parseWeight("72", "kg")).toBe(72);
    expect(parseWeight("160", "lb")).toBeCloseTo(72.57, 1);
    expect(parseWeight("72,5", "kg")).toBe(72.5);
    expect(parseWeight("abc", "kg")).toBeNull();
    expect(parseWeight("5", "kg")).toBeNull();
    expect(formatWeight(72.57, "lb")).toBe("160 lb");
    expect(formatWeight(72.4, "kg")).toBe("72 kg");
  });
});
