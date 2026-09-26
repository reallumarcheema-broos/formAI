import { beforeEach, describe, expect, it } from "vitest";
import { addFood, deleteFood, foodForDay, loadFood, mealForTime, sumFood } from "@/lib/fitness/food";

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

const at = (h: number, day = 24) => new Date(2026, 8, day, h, 0).getTime();
const entry = (eatenAt: number, kcal: number) => ({
  eatenAt,
  meal: mealForTime(eatenAt),
  name: "Daal",
  kcal,
  protein_g: 10,
  carbs_g: 20,
  fat_g: 5,
});

describe("food log", () => {
  it("picks a meal from the time of day", () => {
    expect(mealForTime(at(8))).toBe("breakfast");
    expect(mealForTime(at(13))).toBe("lunch");
    expect(mealForTime(at(20))).toBe("dinner");
    expect(mealForTime(at(16))).toBe("snack");
    expect(mealForTime(at(2))).toBe("snack");
  });

  it("adds, totals per day and deletes entries", () => {
    addFood(entry(at(8), 300));
    addFood(entry(at(13), 650));
    const log = addFood(entry(at(13, 23), 999)); // yesterday
    const today = foodForDay(log, at(12));
    expect(today.map((e) => e.kcal)).toEqual([300, 650]);
    expect(sumFood(today)).toEqual({ kcal: 950, protein_g: 20, carbs_g: 40, fat_g: 10 });
    const after = deleteFood(today[0].id);
    expect(sumFood(foodForDay(after, at(12))).kcal).toBe(650);
    expect(loadFood()).toHaveLength(2);
  });

  it("survives corrupted storage", () => {
    localStorage.setItem("formai:food", "nope");
    expect(loadFood()).toEqual([]);
  });
});
