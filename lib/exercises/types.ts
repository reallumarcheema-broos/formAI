import type { JointName, Landmark, Side } from "@/lib/pose/landmarks";
import type { PoseFrame } from "@/lib/pose/poseFrame";

/**
 * Named numbers computed from the pose each frame, e.g. `{ knee: 94, torsoLean: 31 }`.
 * Use NaN for "can't measure this from the current camera angle"; any rule
 * comparing against NaN is automatically treated as not violated.
 */
export type Metrics = Record<string, number>;

/**
 * Where the person is within a rep.
 *  - idle:   resting at the top (standing tall / arms locked out)
 *  - moving: started descending but hasn't reached counting depth yet
 *  - bottom: reached counting depth; the rep counts once they return to the top
 */
export type RepPhase = "idle" | "moving" | "bottom";

/** Handed to `computeMetrics` so exercises never touch raw landmark indices. */
export interface MetricContext {
  frame: PoseFrame;
  /** Side of the body facing the camera (the one with the most reliable landmarks). */
  side: Side;
  /** Rough camera angle, so exercises can skip metrics that only make sense from one view. */
  view: "front" | "side";
  /** 3D world landmark (meters) for a joint. Defaults to the near side. Best for joint angles. */
  world(joint: JointName, side?: Side): Landmark;
  /** Aspect-corrected 2D image landmark for a joint. Best for lean / alignment checks. */
  image(joint: JointName, side?: Side): Landmark;
}

/**
 * Rep counting config. A rep is: idle → (cross `startThreshold`) moving →
 * (reach `bottomThreshold`) bottom → (return past `topThreshold`) idle = +1.
 *
 * The gap between `bottomThreshold` and `topThreshold` is the hysteresis:
 * jitter around any single value can never produce a second rep, because the
 * metric has to travel the whole range again.
 *
 * Returning to the top from `moving` without ever reaching the bottom is a
 * "partial rep": not counted, but rep rules with `checkPartial` still run so
 * the user hears e.g. "Go a bit lower".
 */
export interface RepConfig {
  /** Key into Metrics that drives the state machine. */
  metric: string;
  /** "decreasing" if the metric gets smaller on the way down (joint angles do). */
  direction: "decreasing" | "increasing";
  topThreshold: number;
  startThreshold: number;
  bottomThreshold: number;
  /** Reps faster than this are treated as noise. Default 400ms. */
  minRepMs?: number;
}

interface BaseRule {
  id: string;
  /** Short text shown on screen and in the summary. */
  message: string;
  /** What the voice says. Defaults to `message`. */
  speech?: string;
  /** Joints drawn in red while this rule is being broken. */
  highlight?: JointName[];
}

/** Checked every frame while the person is mid-rep. */
export interface FrameRule extends BaseRule {
  type: "frame";
  /** Which parts of the rep the rule applies to. */
  phases: Exclude<RepPhase, "idle">[];
  /** Consecutive bad frames needed before it fires (filters out single-frame glitches). Default 5. */
  minFrames?: number;
  isViolated(metrics: Metrics): boolean;
}

/** Min/max of every metric across one rep, from the moment it started. */
export interface RepStats {
  min: Metrics;
  max: Metrics;
  /** False for partial reps. */
  completed: boolean;
}

/** Checked once, when a rep (or partial rep) ends. Good for depth checks. */
export interface RepRule extends BaseRule {
  type: "rep";
  /** Also run this rule on partial reps. */
  checkPartial?: boolean;
  isViolated(stats: RepStats): boolean;
}

export type FormRule = FrameRule | RepRule;

export interface ExerciseDefinition {
  /** URL-safe id, e.g. "squat". */
  id: string;
  name: string;
  tagline: string;
  /** "pro" exercises require a FormAI Pro subscription. */
  tier: "free" | "pro";
  /** Emoji shown on the exercise card. */
  icon: string;
  setup: {
    /** Camera angle the rules are tuned for. */
    view: "side" | "front or side";
    instructions: string[];
  };
  /** Joints that must be visible to track this exercise. Also used to pick the near side. */
  requiredJoints: JointName[];
  /** Turn a pose into named metrics. Return null if the pose can't be measured. */
  computeMetrics(ctx: MetricContext): Metrics | null;
  /**
   * Optional gate: frames where this returns false are ignored for counting
   * (e.g. push-ups only count while the body is roughly horizontal).
   */
  inPosition?(metrics: Metrics): boolean;
  /** Shown on setup/workout screens while `inPosition` is false. */
  positionHint?: string;
  rep: RepConfig;
  rules: FormRule[];
}
