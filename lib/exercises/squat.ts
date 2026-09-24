import { angleFromVertical, jointAngle, thighDepthAngle } from "@/lib/pose/angles";
import type { ExerciseDefinition } from "./types";

/**
 * Bodyweight / goblet squat. Works from the front or the side.
 *
 * Metrics (all from 2D image landmarks)
 *  - depth:      thigh drop as an equivalent knee angle (see thighDepthAngle):
 *                ~180° standing, 90° thighs parallel, < 90° below parallel.
 *  - knee:       hip–knee–ankle angle (side view only). Informational.
 *  - torsoLean:  hip→shoulder angle from vertical (side view only).
 *  - kneeWidth:  knee spread ÷ ankle spread (front view only). < 1 means knees drifting in.
 */
export const squat: ExerciseDefinition = {
  id: "squat",
  name: "Squat",
  tagline: "Depth, knee tracking and chest position",
  tier: "pro",
  icon: "🏋️",
  setup: {
    view: "front or side",
    instructions: [
      "Place your phone about 2 m (6 ft) away at hip height.",
      "Side view checks depth and chest position. Front view also checks knees caving in.",
      "Make sure your whole body, head to feet, is in the frame.",
    ],
  },
  requiredJoints: ["shoulder", "hip", "knee", "ankle"],

  computeMetrics(ctx) {
    const depth = (s: "left" | "right") => thighDepthAngle(ctx.image("hip", s), ctx.image("knee", s), ctx.image("ankle", s));

    if (ctx.view === "front") {
      // Both legs are visible from the front: average them for stability.
      const kneeSpread = Math.abs(ctx.image("knee", "left").x - ctx.image("knee", "right").x);
      const ankleSpread = Math.abs(ctx.image("ankle", "left").x - ctx.image("ankle", "right").x);
      return {
        depth: (depth("left") + depth("right")) / 2,
        knee: NaN, // the knee bends toward the camera — its 2D angle is meaningless from the front
        torsoLean: NaN, // lean is foreshortened from the front
        kneeWidth: ankleSpread > 0.01 ? kneeSpread / ankleSpread : NaN,
      };
    }

    return {
      depth: depth(ctx.side),
      knee: jointAngle(ctx.image("hip"), ctx.image("knee"), ctx.image("ankle")),
      torsoLean: angleFromVertical(ctx.image("hip"), ctx.image("shoulder")),
      kneeWidth: NaN, // knee tracking isn't visible from the side
    };
  },

  rep: {
    metric: "depth",
    direction: "decreasing",
    topThreshold: 160, // standing
    startThreshold: 145, // clearly started descending
    bottomThreshold: 115, // deep enough to count
  },

  // Bodyweight squats: moderate calisthenics 3.8 MET → vigorous 8.0 MET at ~24 reps/min.
  calories: { metLight: 3.8, metVigorous: 8.0, vigorousRepsPerMin: 24 },

  rules: [
    {
      id: "squat-depth",
      type: "rep",
      message: "Go a bit lower",
      checkPartial: true,
      highlight: ["hip", "knee"],
      // 100° ≈ thighs within 10° of parallel.
      isViolated: ({ min }) => min.depth > 100,
    },
    {
      id: "squat-knees-in",
      type: "frame",
      message: "Push your knees out",
      phases: ["moving", "bottom"],
      highlight: ["knee"],
      isViolated: (m) => m.kneeWidth < 0.8,
    },
    {
      id: "squat-chest",
      type: "frame",
      message: "Keep your chest up",
      phases: ["moving", "bottom"],
      minFrames: 6,
      highlight: ["shoulder", "hip"],
      isViolated: (m) => m.torsoLean > 50,
    },
  ],
};
