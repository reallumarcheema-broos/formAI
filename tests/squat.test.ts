import { describe, expect, it } from "vitest";
import { ExerciseEngine, type EngineEvent } from "@/lib/exercises/engine";
import { squat } from "@/lib/exercises/squat";
import { LM, type Landmark } from "@/lib/pose/landmarks";
import type { PoseFrame } from "@/lib/pose/poseFrame";

const DEG = Math.PI / 180;

/**
 * Build a side-view pose (left side facing the camera) with the given knee
 * angle and torso lean. Coordinates are valid as both normalized image
 * coordinates and "world" coordinates, which is fine for geometry tests.
 */
function pose(kneeAngle: number, torsoLean = 20, t = 0): PoseFrame {
  const ankle = { x: 0.5, y: 0.9 };
  const knee = { x: 0.5, y: 0.65 };
  const bend = (180 - kneeAngle) * DEG;
  const hip = { x: knee.x - 0.25 * Math.sin(bend), y: knee.y - 0.25 * Math.cos(bend) };
  const shoulder = { x: hip.x + 0.3 * Math.sin(torsoLean * DEG), y: hip.y - 0.3 * Math.cos(torsoLean * DEG) };

  const lms: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.2 }));
  const set = (i: number, p: { x: number; y: number }, visibility: number) => (lms[i] = { ...p, z: 0, visibility });
  // Near (left) side clearly visible, far (right) side at the same spot but low confidence.
  for (const [l, r, p] of [
    [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, shoulder],
    [LM.LEFT_HIP, LM.RIGHT_HIP, hip],
    [LM.LEFT_KNEE, LM.RIGHT_KNEE, knee],
    [LM.LEFT_ANKLE, LM.RIGHT_ANKLE, ankle],
  ] as const) {
    set(l, p, 0.95);
    set(r, p, 0.3);
  }
  return { normalized: lms, image: lms, world: lms, timestamp: t };
}

/** Feed a smooth knee-angle path to the engine, 5° per frame at ~30fps. */
function run(engine: ExerciseEngine, path: number[], opts: { lean?: number; start?: number } = {}) {
  const events: EngineEvent[] = [];
  let t = opts.start ?? 0;
  for (let i = 0; i < path.length - 1; i++) {
    const from = path[i];
    const to = path[i + 1];
    const steps = Math.max(1, Math.ceil(Math.abs(to - from) / 5));
    for (let s = 1; s <= steps; s++) {
      t += 33;
      events.push(...engine.process(pose(from + ((to - from) * s) / steps, opts.lean, t)).events);
    }
  }
  return { events, t };
}

describe("squat engine", () => {
  it("counts a deep squat as one good rep", () => {
    const engine = new ExerciseEngine(squat);
    const { events } = run(engine, [175, 90, 175]);
    const reps = events.filter((e) => e.type === "rep");
    expect(reps).toHaveLength(1);
    expect(reps[0]).toMatchObject({ count: 1, issues: [] });
    expect(engine.getStats()).toMatchObject({ totalReps: 1, goodReps: 1, flaggedReps: 0 });
  });

  it("counts but flags a rep that is not quite deep enough", () => {
    const engine = new ExerciseEngine(squat);
    const { events } = run(engine, [175, 108, 175]);
    const rep = events.find((e) => e.type === "rep");
    expect(rep?.type === "rep" && rep.issues.map((r) => r.id)).toEqual(["squat-depth"]);
    expect(engine.getStats().issues[0]).toMatchObject({ message: "Go a bit lower", count: 1 });
  });

  it("does not count a shallow partial rep, but cues depth", () => {
    const engine = new ExerciseEngine(squat);
    const { events } = run(engine, [175, 130, 175]);
    expect(events.some((e) => e.type === "rep")).toBe(false);
    expect(events.some((e) => e.type === "cue" && e.rule.id === "squat-depth")).toBe(true);
    expect(engine.getStats().partialReps).toBe(1);
  });

  it("uses hysteresis so jitter around the thresholds never double counts", () => {
    const engine = new ExerciseEngine(squat);
    // Wobble around the bottom and top thresholds within one rep.
    const { events } = run(engine, [175, 95, 120, 95, 118, 100, 158, 150, 159, 175]);
    expect(events.filter((e) => e.type === "rep")).toHaveLength(1);
  });

  it("counts consecutive reps", () => {
    const engine = new ExerciseEngine(squat);
    const { events } = run(engine, [175, 90, 170, 92, 172, 88, 175]);
    expect(events.filter((e) => e.type === "rep").map((e) => (e.type === "rep" ? e.count : 0))).toEqual([1, 2, 3]);
  });

  it("flags excessive forward lean", () => {
    const engine = new ExerciseEngine(squat);
    const { events } = run(engine, [175, 90, 90, 90, 175], { lean: 65 });
    expect(events.some((e) => e.type === "cue" && e.rule.id === "squat-chest")).toBe(true);
    expect(engine.getStats().flaggedReps).toBe(1);
  });

  it("waits to see the person standing before counting", () => {
    const engine = new ExerciseEngine(squat);
    // Starts already at the bottom: coming up must not count as a rep.
    const { events } = run(engine, [90, 175]);
    expect(events.some((e) => e.type === "rep")).toBe(false);
  });

  it("ignores frames without a person", () => {
    const engine = new ExerciseEngine(squat);
    expect(engine.process(null).snapshot.tracking).toBe(false);
  });
});
