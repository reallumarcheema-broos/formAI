import { describe, expect, it } from "vitest";
import { CalorieTracker, kcalPerMinute, metForPace } from "@/lib/fitness/calories";

const profile = { metLight: 3.8, metVigorous: 8.0, vigorousRepsPerMin: 20 };

/** Simulate `seconds` of exercise at 30fps, with a rep every `repEvery` seconds (0 = no reps). */
function simulate(tracker: CalorieTracker, seconds: number, repEvery: number, start = 0) {
  let t = start;
  let nextRep = start + repEvery * 1000;
  const end = start + seconds * 1000;
  while (t < end) {
    t += 33;
    if (repEvery && t >= nextRep) {
      tracker.rep(t);
      nextRep += repEvery * 1000;
    }
    tracker.tick(t, true);
  }
  return t;
}

describe("kcalPerMinute (ACSM)", () => {
  it("matches the textbook value: 8 MET at 70 kg ≈ 9.8 kcal/min", () => {
    expect(kcalPerMinute(8, 70)).toBeCloseTo(9.8, 1);
  });
  it("scales with body weight", () => {
    expect(kcalPerMinute(5, 100)).toBeCloseTo(2 * kcalPerMinute(5, 50));
  });
});

describe("metForPace", () => {
  it("is light at zero pace and vigorous at or above the vigorous pace", () => {
    expect(metForPace(profile, 0)).toBe(3.8);
    expect(metForPace(profile, 20)).toBe(8.0);
    expect(metForPace(profile, 40)).toBe(8.0);
    expect(metForPace(profile, 10)).toBeCloseTo(5.9);
  });
});

describe("CalorieTracker", () => {
  it("one minute of brisk push-ups at 70 kg burns roughly 9–10 kcal", () => {
    const tracker = new CalorieTracker(profile, 70);
    simulate(tracker, 60, 3); // a rep every 3s = 20 reps/min
    expect(tracker.calories).toBeGreaterThan(8.5);
    expect(tracker.calories).toBeLessThan(10.5);
    expect(tracker.activeMinutes).toBeCloseTo(1, 1);
  });

  it("a slow set burns less than a fast one", () => {
    const slow = new CalorieTracker(profile, 70);
    const fast = new CalorieTracker(profile, 70);
    simulate(slow, 60, 10);
    simulate(fast, 60, 3);
    expect(slow.calories).toBeLessThan(fast.calories);
    expect(slow.calories).toBeGreaterThan(kcalPerMinute(3.8, 70) * 0.9);
  });

  it("heavier people burn more for the same work", () => {
    const light = new CalorieTracker(profile, 55);
    const heavy = new CalorieTracker(profile, 95);
    simulate(light, 30, 3);
    simulate(heavy, 30, 3);
    expect(heavy.calories / light.calories).toBeCloseTo(95 / 55, 1);
  });

  it("doesn't count inactive time, pauses or long frame gaps", () => {
    const tracker = new CalorieTracker(profile, 70);
    let t = simulate(tracker, 10, 3);
    const after10s = tracker.calories;
    for (let i = 0; i < 300; i++) tracker.tick((t += 33), false); // not tracked
    expect(tracker.calories).toBe(after10s);
    tracker.pause();
    t += 60_000; // paused for a minute
    tracker.tick(t, true);
    expect(tracker.calories).toBe(after10s);
    tracker.tick(t + 5_000, true); // 5s gap: tab was hidden
    expect(tracker.calories).toBe(after10s);
  });
});
