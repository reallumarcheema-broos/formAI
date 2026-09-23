import { angleFromVertical, jointAngle } from "@/lib/pose/angles";
import type { ExerciseDefinition } from "./types";

/**
 * Bodyweight / goblet squat.
 *
 * Metrics
 *  - knee:       hip–knee–ankle angle (3D). ~175° standing, ~90° at parallel.
 *  - hip:        shoulder–hip–knee angle (3D). Informational.
 *  - torsoLean:  hip→shoulder angle from vertical (side view only).
 *  - kneeWidth:  knee spread ÷ ankle spread (front view only). < 1 means knees drifting in.
 */
export const squat: ExerciseDefinition = {
  id: "squat",
  name: "Squat",
  tagline: "Depth, knee tracking and chest position",
  tier: "free",
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
    const knee = (s: "left" | "right") => jointAngle(ctx.world("hip", s), ctx.world("knee", s), ctx.world("ankle", s));
    const hip = (s: "left" | "right") => jointAngle(ctx.world("shoulder", s), ctx.world("hip", s), ctx.world("knee", s));

    if (ctx.view === "front") {
      // Both legs are visible from the front: average them for stability.
      const kneeSpread = Math.abs(ctx.image("knee", "left").x - ctx.image("knee", "right").x);
      const ankleSpread = Math.abs(ctx.image("ankle", "left").x - ctx.image("ankle", "right").x);
      return {
        knee: (knee("left") + knee("right")) / 2,
        hip: (hip("left") + hip("right")) / 2,
        torsoLean: NaN, // lean is foreshortened from the front — can't judge it
        kneeWidth: ankleSpread > 0.01 ? kneeSpread / ankleSpread : NaN,
      };
    }

    return {
      knee: knee(ctx.side),
      hip: hip(ctx.side),
      torsoLean: angleFromVertical(ctx.image("hip"), ctx.image("shoulder")),
      kneeWidth: NaN, // knee tracking isn't visible from the side
    };
  },

  rep: {
    metric: "knee",
    direction: "decreasing",
    topThreshold: 160, // standing
    startThreshold: 145, // clearly started descending
    bottomThreshold: 115, // deep enough to count
  },

  rules: [
    {
      id: "squat-depth",
      type: "rep",
      message: "Go a bit lower",
      checkPartial: true,
      highlight: ["hip", "knee"],
      // Thighs roughly parallel ≈ knee angle ≤ 100°.
      isViolated: ({ min }) => min.knee > 100,
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
