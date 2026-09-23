import { angleFromVertical, jointAngle, midpoint } from "@/lib/pose/angles";
import type { ExerciseDefinition } from "./types";

/**
 * Forward / reverse / split lunge, filmed from the side.
 *
 * Metrics
 *  - frontKnee:  hip–knee–ankle angle (3D) of the front leg. The front leg is
 *                the one whose knee is higher in the image (the back knee
 *                drops toward the floor).
 *  - backKnee:   same for the back leg. Informational.
 *  - torsoLean:  mid-hip → mid-shoulder angle from vertical.
 */
export const lunge: ExerciseDefinition = {
  id: "lunge",
  name: "Lunge",
  tagline: "Front knee angle and an upright torso",
  tier: "pro",
  icon: "🦵",
  setup: {
    view: "side",
    instructions: [
      "Place your phone about 2.5 m (8 ft) away, side-on to you.",
      "Leave room in the frame for your stride — both feet must stay visible.",
      "Alternate legs or stay on one side; either counts.",
    ],
  },
  requiredJoints: ["shoulder", "hip", "knee", "ankle"],

  computeMetrics(ctx) {
    const knee = (s: "left" | "right") => jointAngle(ctx.world("hip", s), ctx.world("knee", s), ctx.world("ankle", s));
    const leftIsFront = ctx.image("knee", "left").y < ctx.image("knee", "right").y;
    const front = leftIsFront ? "left" : "right";
    const back = leftIsFront ? "right" : "left";
    return {
      frontKnee: knee(front),
      backKnee: knee(back),
      torsoLean: angleFromVertical(
        midpoint(ctx.image("hip", "left"), ctx.image("hip", "right")),
        midpoint(ctx.image("shoulder", "left"), ctx.image("shoulder", "right")),
      ),
    };
  },

  rep: {
    metric: "frontKnee",
    direction: "decreasing",
    topThreshold: 155,
    startThreshold: 140,
    bottomThreshold: 115,
  },

  rules: [
    {
      id: "lunge-depth",
      type: "rep",
      message: "Go a bit lower",
      checkPartial: true,
      highlight: ["knee"],
      isViolated: ({ min }) => min.frontKnee > 105,
    },
    {
      id: "lunge-knee-forward",
      type: "rep",
      message: "Keep your front knee over your ankle",
      highlight: ["knee", "ankle"],
      // A very closed front knee means the knee has shot far past the toes.
      isViolated: ({ min }) => min.frontKnee < 65,
    },
    {
      id: "lunge-torso",
      type: "frame",
      message: "Keep your torso upright",
      phases: ["moving", "bottom"],
      minFrames: 6,
      highlight: ["shoulder", "hip"],
      isViolated: (m) => m.torsoLean > 25,
    },
  ],
};
