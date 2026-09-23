import { describe, expect, it } from "vitest";
import { ExerciseEngine, type EngineEvent } from "@/lib/exercises/engine";
import { lunge } from "@/lib/exercises/lunge";
import { squat } from "@/lib/exercises/squat";
import { LM, type Landmark } from "@/lib/pose/landmarks";
import type { PoseFrame } from "@/lib/pose/poseFrame";

type P = { x: number; y: number };
const DEG = Math.PI / 180;

function frame(points: [number, P][], t: number, visibility = 0.95): PoseFrame {
  const lms: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.1 }));
  for (const [i, p] of points) lms[i] = { ...p, z: 0, visibility };
  return { normalized: lms, image: lms, world: lms, timestamp: t };
}

/**
 * Front-view squat: both legs visible, shoulders spread. `bend` is the thigh
 * angle from vertical (0 = standing, 90 = parallel); `kneesIn` pulls the knees
 * toward the midline.
 */
function frontSquat(bend: number, kneesIn: number, t: number): PoseFrame {
  const b = bend * DEG;
  const leg = (side: -1 | 1): [P, P, P] => {
    const ankle = { x: 0.5 + side * 0.12, y: 0.9 };
    const knee = { x: 0.5 + side * (0.12 - kneesIn), y: 0.7 };
    const hip = { x: 0.5 + side * 0.09, y: knee.y - 0.2 * Math.cos(b) };
    return [hip, knee, ankle];
  };
  const [lh, lk, la] = leg(-1);
  const [rh, rk, ra] = leg(1);
  return frame(
    [
      [LM.LEFT_SHOULDER, { x: 0.38, y: lh.y - 0.3 }],
      [LM.RIGHT_SHOULDER, { x: 0.62, y: rh.y - 0.3 }],
      [LM.LEFT_HIP, lh], [LM.LEFT_KNEE, lk], [LM.LEFT_ANKLE, la],
      [LM.RIGHT_HIP, rh], [LM.RIGHT_KNEE, rk], [LM.RIGHT_ANKLE, ra],
    ],
    t,
  );
}

/** Side-view lunge: front thigh drops by `bend` degrees from vertical, back knee sinks. */
function sideLunge(bend: number, t: number): PoseFrame {
  const b = bend * DEG;
  const frontAnkle = { x: 0.35, y: 0.9 };
  const frontKnee = { x: 0.35, y: 0.7 };
  const hip = { x: frontKnee.x + 0.2 * Math.sin(b), y: frontKnee.y - 0.2 * Math.cos(b) };
  const backKnee = { x: hip.x + 0.1, y: Math.min(0.88, hip.y + 0.2 + bend / 900) };
  const backAnkle = { x: hip.x + 0.25, y: 0.9 };
  const shoulder = { x: hip.x, y: hip.y - 0.3 };
  return frame(
    [
      [LM.LEFT_SHOULDER, shoulder], [LM.RIGHT_SHOULDER, shoulder],
      [LM.LEFT_HIP, hip], [LM.RIGHT_HIP, hip],
      [LM.LEFT_KNEE, frontKnee], [LM.LEFT_ANKLE, frontAnkle],
      [LM.RIGHT_KNEE, backKnee], [LM.RIGHT_ANKLE, backAnkle],
    ],
    t,
  );
}

function run(engine: ExerciseEngine, build: (v: number, t: number) => PoseFrame, path: number[]) {
  const events: EngineEvent[] = [];
  let t = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const steps = Math.ceil(Math.abs(path[i + 1] - path[i]) / 5) || 1;
    for (let s = 1; s <= steps; s++) {
      t += 33;
      events.push(...engine.process(build(path[i] + ((path[i + 1] - path[i]) * s) / steps, t)).events);
    }
  }
  return events;
}

describe("front-view squat", () => {
  it("counts a parallel squat as a good rep", () => {
    const engine = new ExerciseEngine(squat);
    const events = run(engine, (bend, t) => frontSquat(bend, 0, t), [0, 95, 0]);
    const reps = events.filter((e) => e.type === "rep");
    expect(reps).toHaveLength(1);
    expect(reps[0]).toMatchObject({ issues: [] });
  });

  it("flags knees caving in", () => {
    const engine = new ExerciseEngine(squat);
    const events = run(engine, (bend, t) => frontSquat(bend, bend > 30 ? 0.05 : 0, t), [0, 95, 95, 0]);
    expect(events.some((e) => e.type === "cue" && e.rule.id === "squat-knees-in")).toBe(true);
  });
});

describe("lunge", () => {
  it("counts a lunge to parallel as a good rep", () => {
    const engine = new ExerciseEngine(lunge);
    const reps = run(engine, sideLunge, [0, 88, 0]).filter((e) => e.type === "rep");
    expect(reps).toHaveLength(1);
    expect(reps[0]).toMatchObject({ issues: [] });
  });

  it("flags a lunge that stops well short of parallel", () => {
    const engine = new ExerciseEngine(lunge);
    const rep = run(engine, sideLunge, [0, 68, 0]).find((e) => e.type === "rep");
    expect(rep?.type === "rep" && rep.issues.map((r) => r.id)).toContain("lunge-depth");
  });
});
