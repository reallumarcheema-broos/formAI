import { angleFromVertical, jointAngle, midpoint, thighDepthAngle } from "@/lib/pose/angles";
import type { ExerciseDefinition } from "./types";

/**
 * Forward / reverse / split lunge, filmed from the side.
 *
 * Metrics (all from 2D image landmarks)
 *  - frontDepth: front thigh drop as an equivalent knee angle (see thighDepthAngle):
 *                ~180° standing, 90° front thigh parallel to the floor. The front
 *                leg is the one whose knee is higher (the back knee drops toward the floor).
 *  - frontKnee:  real hip–knee–ankle angle of the front leg (side view only), used
 *                to catch the knee shooting far past the toes.
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
    const leftIsFront = ctx.image("knee", "left").y < ctx.image("knee", "right").y;
    const front = leftIsFront ? "left" : "right";
    const hip = ctx.image("hip", front);
    const knee = ctx.image("knee", front);
    const ankle = ctx.image("ankle", front);
    return {
      frontDepth: thighDepthAngle(hip, knee, ankle),
      frontKnee: ctx.view === "side" ? jointAngle(hip, knee, ankle) : NaN,
      torsoLean: angleFromVertical(
        midpoint(ctx.image("hip", "left"), ctx.image("hip", "right")),
        midpoint(ctx.image("shoulder", "left"), ctx.image("shoulder", "right")),
      ),
    };
  },

  rep: {
    metric: "frontDepth",
    direction: "decreasing",
    topThreshold: 155,
    startThreshold: 140,
    bottomThreshold: 115,
  },

  // Lunges: moderate calisthenics 3.8 MET → ~7 MET at a brisk ~16 reps/min.
  calories: { metLight: 3.8, metVigorous: 7.0, vigorousRepsPerMin: 16 },

  rules: [
    {
      id: "lunge-depth",
      type: "rep",
      message: "Go a bit lower",
      checkPartial: true,
      highlight: ["knee"],
      isViolated: ({ min }) => min.frontDepth > 105,
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
