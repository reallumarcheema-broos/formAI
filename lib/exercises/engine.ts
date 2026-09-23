import { JOINTS, type JointName } from "@/lib/pose/landmarks";
import { checkBodyVisible, detectView, pickSide, type PoseFrame } from "@/lib/pose/poseFrame";
import type {
  ExerciseDefinition,
  FormRule,
  FrameRule,
  MetricContext,
  Metrics,
  RepPhase,
  RepRule,
  RepStats,
} from "./types";

export type EngineEvent =
  /** A full rep was counted. `issues` is empty for a good rep. */
  | { type: "rep"; count: number; issues: FormRule[] }
  /** The person came back up without reaching counting depth. */
  | { type: "partial"; issues: FormRule[] }
  /** A form rule was just broken (fires at most once per rep per rule). */
  | { type: "cue"; rule: FormRule };

export interface EngineSnapshot {
  /** Required joints are visible and metrics could be computed. */
  tracking: boolean;
  /** The exercise's `inPosition` gate (true if it has none). */
  inPosition: boolean;
  phase: RepPhase;
  repCount: number;
  metrics: Metrics | null;
  /** Rules currently being broken — drives the red skeleton highlight. */
  activeRules: FormRule[];
  /** Landmark indices to highlight in red. */
  highlight: Set<number>;
}

export interface IssueCount {
  ruleId: string;
  message: string;
  count: number;
}

export interface EngineStats {
  totalReps: number;
  goodReps: number;
  flaggedReps: number;
  partialReps: number;
  /** Most frequent first. */
  issues: IssueCount[];
}

/** Drop an in-progress rep if tracking is lost for longer than this. */
const LOST_TRACKING_RESET_MS = 1000;
const DEFAULT_MIN_FRAMES = 5;
const DEFAULT_MIN_REP_MS = 400;

/**
 * Generic, exercise-agnostic engine: feed it one smoothed PoseFrame per video
 * frame and it runs the exercise's rep state machine and form rules.
 *
 * Everything exercise-specific lives in an ExerciseDefinition, so adding a new
 * exercise never requires touching this file.
 */
export class ExerciseEngine {
  private phase: RepPhase = "idle";
  /** We only start counting after seeing the person at the top once. */
  private armed = false;
  private repCount = 0;
  private repStartedAt = 0;
  private lastTrackedAt = 0;
  private stats: RepStats | null = null;
  /** Rules broken during the current rep. */
  private repIssues = new Map<string, FormRule>();
  /** Consecutive-violation counters for frame rules. */
  private streaks = new Map<string, number>();

  private goodReps = 0;
  private flaggedReps = 0;
  private partialReps = 0;
  private issueCounts = new Map<string, IssueCount>();

  constructor(readonly exercise: ExerciseDefinition) {}

  /**
   * Process one frame. Pass `null` when no person was detected.
   * Returns the current state plus any events (rep counted, cue) this frame produced.
   */
  process(frame: PoseFrame | null): { snapshot: EngineSnapshot; events: EngineEvent[] } {
    const events: EngineEvent[] = [];
    const ex = this.exercise;

    const body = checkBodyVisible(frame?.normalized ?? null, ex.requiredJoints);
    const metrics = frame && body.ok ? ex.computeMetrics(this.createContext(frame)) : null;
    const now = frame?.timestamp ?? performance.now();

    if (!metrics) {
      // Tolerate brief dropouts; abandon the rep if the person is gone for a while.
      if (this.phase !== "idle" && now - this.lastTrackedAt > LOST_TRACKING_RESET_MS) this.resetMotion();
      return { snapshot: this.snapshot(false, false, null, []), events };
    }
    this.lastTrackedAt = now;

    const inPosition = ex.inPosition ? ex.inPosition(metrics) : true;
    if (!inPosition) {
      this.resetMotion();
      return { snapshot: this.snapshot(true, false, metrics, []), events };
    }

    this.updateRepState(metrics, now, events);
    const activeRules = this.phase === "idle" ? [] : this.checkFrameRules(metrics, events);

    return { snapshot: this.snapshot(true, true, metrics, activeRules), events };
  }

  /** Forget any half-finished rep (e.g. after pausing). Counts and stats are kept. */
  resetMotion(): void {
    this.phase = "idle";
    this.armed = false;
    this.stats = null;
    this.repIssues.clear();
    this.streaks.clear();
  }

  getStats(): EngineStats {
    return {
      totalReps: this.repCount,
      goodReps: this.goodReps,
      flaggedReps: this.flaggedReps,
      partialReps: this.partialReps,
      issues: [...this.issueCounts.values()].sort((a, b) => b.count - a.count),
    };
  }

  // ---------------------------------------------------------------------------

  private createContext(frame: PoseFrame): MetricContext {
    const side = pickSide(frame.normalized, this.exercise.requiredJoints);
    return {
      frame,
      side,
      view: detectView(frame.image),
      world: (joint, s = side) => frame.world[JOINTS[joint][s]],
      image: (joint, s = side) => frame.image[JOINTS[joint][s]],
    };
  }

  /**
   * Rep state machine. Values are normalized so "lower" always means "deeper
   * into the rep", whichever direction the metric actually moves.
   */
  private updateRepState(metrics: Metrics, now: number, events: EngineEvent[]): void {
    const cfg = this.exercise.rep;
    const raw = metrics[cfg.metric];
    if (!Number.isFinite(raw)) return;

    const sign = cfg.direction === "decreasing" ? 1 : -1;
    const v = raw * sign;
    const top = cfg.topThreshold * sign;
    const start = cfg.startThreshold * sign;
    const bottom = cfg.bottomThreshold * sign;

    if (this.stats) this.accumulate(metrics);

    switch (this.phase) {
      case "idle":
        if (v >= top) this.armed = true;
        if (this.armed && v < start) {
          this.phase = v <= bottom ? "bottom" : "moving";
          this.repStartedAt = now;
          this.stats = { min: { ...metrics }, max: { ...metrics }, completed: false };
          this.repIssues.clear();
        }
        break;

      case "moving":
        if (v <= bottom) this.phase = "bottom";
        else if (v >= top) this.finishRep(false, events);
        break;

      case "bottom":
        if (v >= top) {
          const tooFast = now - this.repStartedAt < (cfg.minRepMs ?? DEFAULT_MIN_REP_MS);
          if (tooFast) this.resetMotion();
          else this.finishRep(true, events);
          this.armed = true;
        }
        break;
    }
  }

  private accumulate(metrics: Metrics): void {
    const { min, max } = this.stats!;
    for (const [k, value] of Object.entries(metrics)) {
      if (!Number.isFinite(value)) continue;
      if (!(value >= min[k])) min[k] = value; // also replaces NaN
      if (!(value <= max[k])) max[k] = value;
    }
  }

  private finishRep(completed: boolean, events: EngineEvent[]): void {
    const stats = { ...this.stats!, completed };
    for (const rule of this.exercise.rules) {
      if (rule.type !== "rep") continue;
      if (!completed && !rule.checkPartial) continue;
      if ((rule as RepRule).isViolated(stats)) this.flag(rule, events);
    }

    const issues = [...this.repIssues.values()];
    if (completed) {
      this.repCount += 1;
      if (issues.length) this.flaggedReps += 1;
      else this.goodReps += 1;
      events.push({ type: "rep", count: this.repCount, issues });
    } else {
      this.partialReps += 1;
      events.push({ type: "partial", issues });
    }
    for (const rule of issues) {
      const entry = this.issueCounts.get(rule.id) ?? { ruleId: rule.id, message: rule.message, count: 0 };
      entry.count += 1;
      this.issueCounts.set(rule.id, entry);
    }

    this.phase = "idle";
    this.stats = null;
    this.repIssues.clear();
    this.streaks.clear();
  }

  /** Evaluate frame rules; returns the ones currently (sustainedly) violated. */
  private checkFrameRules(metrics: Metrics, events: EngineEvent[]): FormRule[] {
    const active: FormRule[] = [];
    for (const rule of this.exercise.rules) {
      if (rule.type !== "frame") continue;
      const r = rule as FrameRule;
      const applies = (r.phases as RepPhase[]).includes(this.phase);
      const streak = applies && r.isViolated(metrics) ? (this.streaks.get(r.id) ?? 0) + 1 : 0;
      this.streaks.set(r.id, streak);
      if (streak >= (r.minFrames ?? DEFAULT_MIN_FRAMES)) {
        active.push(r);
        this.flag(r, events);
      }
    }
    return active;
  }

  /** Record a rule as broken for this rep; emits a cue the first time. */
  private flag(rule: FormRule, events: EngineEvent[]): void {
    if (this.repIssues.has(rule.id)) return;
    this.repIssues.set(rule.id, rule);
    events.push({ type: "cue", rule });
  }

  private snapshot(
    tracking: boolean,
    inPosition: boolean,
    metrics: Metrics | null,
    activeRules: FormRule[],
  ): EngineSnapshot {
    const highlight = new Set<number>();
    for (const rule of activeRules) {
      for (const joint of rule.highlight ?? ([] as JointName[])) {
        highlight.add(JOINTS[joint].left);
        highlight.add(JOINTS[joint].right);
      }
    }
    return { tracking, inPosition, phase: this.phase, repCount: this.repCount, metrics, activeRules, highlight };
  }
}
