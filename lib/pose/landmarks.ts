/**
 * MediaPipe Pose Landmarker outputs 33 landmarks per detected person.
 * This file names the ones FormAI cares about and groups them into
 * left/right "joints" so exercise code can say `joint("knee")` instead of
 * juggling raw indices.
 *
 * Reference: https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker
 */

/** A single landmark. `x`/`y` are normalized [0,1] for image landmarks, meters for world landmarks. */
export interface Landmark {
  x: number;
  y: number;
  z: number;
  /** Model confidence (0..1) that the point is visible and not occluded. */
  visibility: number;
}

export const LM = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const;

export type Side = "left" | "right";

/** Joints that exist on both sides of the body. */
export type JointName = "shoulder" | "elbow" | "wrist" | "hip" | "knee" | "ankle" | "foot";

export const JOINTS: Record<JointName, Record<Side, number>> = {
  shoulder: { left: LM.LEFT_SHOULDER, right: LM.RIGHT_SHOULDER },
  elbow: { left: LM.LEFT_ELBOW, right: LM.RIGHT_ELBOW },
  wrist: { left: LM.LEFT_WRIST, right: LM.RIGHT_WRIST },
  hip: { left: LM.LEFT_HIP, right: LM.RIGHT_HIP },
  knee: { left: LM.LEFT_KNEE, right: LM.RIGHT_KNEE },
  ankle: { left: LM.LEFT_ANKLE, right: LM.RIGHT_ANKLE },
  foot: { left: LM.LEFT_FOOT_INDEX, right: LM.RIGHT_FOOT_INDEX },
};

/** Bones drawn in the skeleton overlay (face and fingers omitted to keep it clean). */
export const SKELETON_CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER],
  [LM.LEFT_SHOULDER, LM.LEFT_ELBOW],
  [LM.LEFT_ELBOW, LM.LEFT_WRIST],
  [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW],
  [LM.RIGHT_ELBOW, LM.RIGHT_WRIST],
  [LM.LEFT_SHOULDER, LM.LEFT_HIP],
  [LM.RIGHT_SHOULDER, LM.RIGHT_HIP],
  [LM.LEFT_HIP, LM.RIGHT_HIP],
  [LM.LEFT_HIP, LM.LEFT_KNEE],
  [LM.LEFT_KNEE, LM.LEFT_ANKLE],
  [LM.RIGHT_HIP, LM.RIGHT_KNEE],
  [LM.RIGHT_KNEE, LM.RIGHT_ANKLE],
  [LM.LEFT_ANKLE, LM.LEFT_HEEL],
  [LM.LEFT_HEEL, LM.LEFT_FOOT_INDEX],
  [LM.LEFT_ANKLE, LM.LEFT_FOOT_INDEX],
  [LM.RIGHT_ANKLE, LM.RIGHT_HEEL],
  [LM.RIGHT_HEEL, LM.RIGHT_FOOT_INDEX],
  [LM.RIGHT_ANKLE, LM.RIGHT_FOOT_INDEX],
];

/** Landmarks drawn as dots in the overlay. */
export const SKELETON_POINTS: ReadonlyArray<number> = Array.from(
  new Set(SKELETON_CONNECTIONS.flat()),
);
