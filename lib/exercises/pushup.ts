import { angleFromVertical, distance, jointAngle, offsetBelowLine } from "@/lib/pose/angles";
import type { ExerciseDefinition } from "./types";

/**
 * Push-up, filmed from the side.
 *
 * Metrics
 *  - elbow:      shoulder–elbow–wrist angle (2D, side view). ~170° locked out, ~80° at the bottom.
 *  - hipOffset:  how far the hip sits below (+) or above (−) the shoulder→ankle line,
 *                as a fraction of body length. ~0 for a straight plank.
 *  - torsoAngle: hip→shoulder angle from vertical. ~90° when horizontal.
 */
export const pushup: ExerciseDefinition = {
  id: "pushup",
  name: "Push-up",
  tagline: "Chest depth and a straight body line",
  tier: "pro",
  icon: "💪",
  setup: {
    view: "side",
    instructions: [
      "Place your phone on the floor about 2 m (6 ft) away, side-on to you.",
      "Your whole body from head to feet should be in the frame.",
      "Get into a high plank to start — reps count once you're horizontal.",
    ],
  },
  requiredJoints: ["shoulder", "elbow", "wrist", "hip", "ankle"],

  computeMetrics(ctx) {
    const shoulder = ctx.image("shoulder");
    const hip = ctx.image("hip");
    const ankle = ctx.image("ankle");
    const bodyLength = distance(shoulder, ankle);
    return {
      elbow: jointAngle(shoulder, ctx.image("elbow"), ctx.image("wrist")),
      hipOffset: bodyLength > 0 ? offsetBelowLine(hip, shoulder, ankle) / bodyLength : NaN,
      torsoAngle: angleFromVertical(hip, shoulder),
    };
  },

  // Only count while roughly horizontal, so arm movements while standing don't register.
  inPosition: (m) => m.torsoAngle > 55,
  positionHint: "Get into a plank position",

  rep: {
    metric: "elbow",
    direction: "decreasing",
    topThreshold: 150,
    startThreshold: 135,
    bottomThreshold: 100,
  },

  rules: [
    {
      id: "pushup-depth",
      type: "rep",
      message: "Lower your chest more",
      checkPartial: true,
      highlight: ["shoulder", "elbow"],
      isViolated: ({ min }) => min.elbow > 90,
    },
    {
      id: "pushup-hip-sag",
      type: "frame",
      message: "Keep your body straight — hips are sagging",
      speech: "Keep your body straight",
      phases: ["moving", "bottom"],
      minFrames: 6,
      highlight: ["hip"],
      isViolated: (m) => m.hipOffset > 0.06,
    },
    {
      id: "pushup-hip-pike",
      type: "frame",
      message: "Keep your body straight — hips are too high",
      speech: "Keep your body straight",
      phases: ["moving", "bottom"],
      minFrames: 6,
      highlight: ["hip"],
      isViolated: (m) => m.hipOffset < -0.08,
    },
  ],
};
