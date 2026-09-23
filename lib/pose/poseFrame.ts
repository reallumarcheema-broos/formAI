import { JOINTS, type JointName, type Landmark, type Side } from "./landmarks";

/**
 * Everything the exercise engine needs about the body for one video frame,
 * after smoothing.
 */
export interface PoseFrame {
  /** Normalized image landmarks ([0,1] in both axes). Used for drawing and frame checks. */
  normalized: Landmark[];
  /**
   * Image landmarks with x rescaled by the video aspect ratio so that one
   * unit is the same physical size on both axes. Use these for 2D geometry.
   */
  image: Landmark[];
  /** MediaPipe world landmarks: meters, origin between the hips. Best for 3D joint angles. */
  world: Landmark[];
  timestamp: number;
}

/** Minimum visibility for a landmark to be trusted. */
export const VISIBILITY_THRESHOLD = 0.55;

/** Allowed slack outside the image edge before a landmark counts as "out of frame". */
const FRAME_MARGIN = 0.02;

export function isLandmarkUsable(p: Landmark | undefined, threshold = VISIBILITY_THRESHOLD): boolean {
  if (!p) return false;
  return (
    p.visibility >= threshold &&
    p.x >= -FRAME_MARGIN &&
    p.x <= 1 + FRAME_MARGIN &&
    p.y >= -FRAME_MARGIN &&
    p.y <= 1 + FRAME_MARGIN
  );
}

/** Average visibility of a set of joints on one side of the body. */
export function sideScore(normalized: Landmark[], side: Side, joints: readonly JointName[]): number {
  let total = 0;
  for (const j of joints) {
    const p = normalized[JOINTS[j][side]];
    total += isLandmarkUsable(p, 0) ? p.visibility : 0;
  }
  return total / joints.length;
}

/**
 * Pick the side of the body facing the camera. In a side view the far side is
 * occluded, so its landmarks are guesses — always measure the near side.
 */
export function pickSide(normalized: Landmark[], joints: readonly JointName[]): Side {
  return sideScore(normalized, "left", joints) >= sideScore(normalized, "right", joints)
    ? "left"
    : "right";
}

export interface BodyCheck {
  ok: boolean;
  /** Joints (on the best side) that are missing or out of frame. */
  missing: JointName[];
}

/**
 * Is the whole body the exercise needs in frame and clearly visible?
 * Requires every listed joint to be usable on at least the best-visible side.
 */
export function checkBodyVisible(normalized: Landmark[] | null, joints: readonly JointName[]): BodyCheck {
  if (!normalized || normalized.length === 0) return { ok: false, missing: [...joints] };
  const side = pickSide(normalized, joints);
  const missing = joints.filter((j) => !isLandmarkUsable(normalized[JOINTS[j][side]]));
  return { ok: missing.length === 0, missing };
}

/**
 * Rough guess at camera angle: in a front view the shoulders are spread wide
 * relative to torso height; in a side view they overlap.
 */
export function detectView(image: Landmark[]): "front" | "side" {
  const ls = image[JOINTS.shoulder.left];
  const rs = image[JOINTS.shoulder.right];
  const lh = image[JOINTS.hip.left];
  const rh = image[JOINTS.hip.right];
  // Horizontal shoulder spread vs. torso length (both in the image plane).
  const shoulderWidth = Math.abs(ls.x - rs.x);
  const torso =
    Math.hypot((ls.x + rs.x) / 2 - (lh.x + rh.x) / 2, (ls.y + rs.y) / 2 - (lh.y + rh.y) / 2) || 1e-6;
  return shoulderWidth / torso > 0.45 ? "front" : "side";
}
