import { describe, expect, it } from "vitest";
import { ExerciseEngine, type EngineEvent } from "@/lib/exercises/engine";
import { pushup } from "@/lib/exercises/pushup";
import { LM, type Landmark } from "@/lib/pose/landmarks";
import type { PoseFrame } from "@/lib/pose/poseFrame";

const DEG = Math.PI / 180;
type P = { x: number; y: number };

/** Side-view plank, facing left, with a vertical forearm. `sag` > 0 drops the hips. */
function plank(elbowAngle: number, sag: number, t: number): PoseFrame {
  const wrist = { x: 0.3, y: 0.8 };
  const elbow = { x: 0.3, y: 0.67 };
  const theta = (180 - elbowAngle) * DEG;
  const shoulder = { x: elbow.x + 0.13 * Math.sin(theta), y: elbow.y - 0.13 * Math.cos(theta) };
  const ankle = { x: 0.95, y: 0.8 };
  const hip = { x: (shoulder.x + ankle.x) / 2, y: (shoulder.y + ankle.y) / 2 + sag };

  const lms: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.2 }));
  const pairs: [number, number, P][] = [
    [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, shoulder],
    [LM.LEFT_ELBOW, LM.RIGHT_ELBOW, elbow],
    [LM.LEFT_WRIST, LM.RIGHT_WRIST, wrist],
    [LM.LEFT_HIP, LM.RIGHT_HIP, hip],
    [LM.LEFT_KNEE, LM.RIGHT_KNEE, { x: (hip.x + ankle.x) / 2, y: (hip.y + ankle.y) / 2 }],
    [LM.LEFT_ANKLE, LM.RIGHT_ANKLE, ankle],
  ];
  for (const [l, r, p] of pairs) {
    lms[l] = { ...p, z: 0, visibility: 0.95 };
    lms[r] = { ...p, z: 0, visibility: 0.3 };
  }
  return { normalized: lms, image: lms, world: lms, timestamp: t };
}

function run(engine: ExerciseEngine, path: number[], sag = 0) {
  const events: EngineEvent[] = [];
  let t = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const steps = Math.ceil(Math.abs(path[i + 1] - path[i]) / 5) || 1;
    for (let s = 1; s <= steps; s++) {
      t += 33;
      const angle = path[i] + ((path[i + 1] - path[i]) * s) / steps;
      events.push(...engine.process(plank(angle, sag, t)).events);
    }
  }
  return events;
}

describe("push-up engine", () => {
  it("counts a full push-up with a straight body as a good rep", () => {
    const engine = new ExerciseEngine(pushup);
    const events = run(engine, [170, 80, 170]);
    const reps = events.filter((e) => e.type === "rep");
    expect(reps).toHaveLength(1);
    expect(reps[0]).toMatchObject({ issues: [] });
  });

  it("flags sagging hips", () => {
    const engine = new ExerciseEngine(pushup);
    const events = run(engine, [170, 80, 80, 170], 0.08);
    expect(events.some((e) => e.type === "cue" && e.rule.id === "pushup-hip-sag")).toBe(true);
    expect(events.some((e) => e.type === "cue" && e.rule.id === "pushup-hip-pike")).toBe(false);
  });

  it("flags piked hips", () => {
    const engine = new ExerciseEngine(pushup);
    const events = run(engine, [170, 80, 80, 170], -0.1);
    expect(events.some((e) => e.type === "cue" && e.rule.id === "pushup-hip-pike")).toBe(true);
  });

  it("flags shallow reps", () => {
    const engine = new ExerciseEngine(pushup);
    const events = run(engine, [170, 97, 170]);
    const rep = events.find((e) => e.type === "rep");
    expect(rep?.type === "rep" && rep.issues.map((r) => r.id)).toEqual(["pushup-depth"]);
  });
});
