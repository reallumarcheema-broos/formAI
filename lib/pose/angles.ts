/**
 * Geometry helpers for turning landmarks into the angles exercises care about.
 *
 * Conventions
 * -----------
 * - All angles are returned in DEGREES.
 * - Points may be 2D or 3D. When `z` is present on both points it is used,
 *   otherwise the math is done in the x/y plane.
 * - Image and MediaPipe "world" coordinates both have +y pointing DOWN
 *   (toward the floor), which matters for anything measured against vertical.
 */

export interface Vec {
  x: number;
  y: number;
  z?: number;
}

const RAD_TO_DEG = 180 / Math.PI;

/** Vector pointing from `from` to `to`. */
export function sub(to: Vec, from: Vec): Vec {
  return { x: to.x - from.x, y: to.y - from.y, z: (to.z ?? 0) - (from.z ?? 0) };
}

export function dot(a: Vec, b: Vec): number {
  return a.x * b.x + a.y * b.y + (a.z ?? 0) * (b.z ?? 0);
}

export function length(v: Vec): number {
  return Math.sqrt(dot(v, v));
}

export function distance(a: Vec, b: Vec): number {
  return length(sub(a, b));
}

export function midpoint(a: Vec, b: Vec): Vec {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: ((a.z ?? 0) + (b.z ?? 0)) / 2 };
}

/** Clamp to [-1, 1] so floating point noise never makes acos return NaN. */
function clampUnit(value: number): number {
  return Math.min(1, Math.max(-1, value));
}

/**
 * Angle between two vectors, 0..180 degrees.
 *
 *   cos(θ) = (u · v) / (|u| |v|)
 *
 * Returns NaN if either vector has zero length (the angle is undefined).
 */
export function angleBetweenVectors(u: Vec, v: Vec): number {
  const denom = length(u) * length(v);
  if (denom === 0) return NaN;
  return Math.acos(clampUnit(dot(u, v) / denom)) * RAD_TO_DEG;
}

/**
 * Interior angle at joint `b` formed by the segments b→a and b→c, 0..180 degrees.
 *
 *        a (e.g. hip)
 *         \
 *          \  θ
 *           b ------ c
 *        (knee)   (ankle)
 *
 * A straight limb reads ~180°, a fully bent one approaches 0°.
 * Example: jointAngle(hip, knee, ankle) = knee flexion angle.
 */
export function jointAngle(a: Vec, b: Vec, c: Vec): number {
  return angleBetweenVectors(sub(a, b), sub(c, b));
}

/** Straight up in image/world coordinates (remember: +y points down). */
const UP: Vec = { x: 0, y: -1, z: 0 };

/**
 * How far the segment `from → to` leans away from vertical, 0..180 degrees.
 * 0° = pointing straight up, 90° = horizontal, 180° = straight down.
 *
 * Example: angleFromVertical(hip, shoulder) is the torso lean — ~0° when
 * standing tall, ~90° in a push-up plank.
 *
 * `z` is ignored so depth noise can't masquerade as lean; lean is measured in
 * the camera's image plane, which is exactly what a side view captures.
 */
export function angleFromVertical(from: Vec, to: Vec): number {
  const v = sub(to, from);
  return angleBetweenVectors({ x: v.x, y: v.y, z: 0 }, UP);
}

/**
 * Signed perpendicular distance from point `p` to the infinite line through
 * `a` and `b`, in the x/y plane. The sign tells you which side of the line the
 * point is on; callers usually compare it with the y direction (see
 * `offsetBelowLine`).
 */
export function signedDistanceToLine(p: Vec, a: Vec, b: Vec): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return 0;
  // 2D cross product of (b - a) and (p - a), divided by |b - a|.
  return (dx * (p.y - a.y) - dy * (p.x - a.x)) / len;
}

/**
 * How far point `p` sits BELOW the line a→b (positive = below, toward the
 * floor; negative = above), in the x/y plane. Direction-independent: it does
 * not matter whether the person faces left or right.
 *
 * Used for push-ups: with a = shoulder and b = ankle, a positive value means
 * the hips are sagging, a negative value means they are piked up.
 */
export function offsetBelowLine(p: Vec, a: Vec, b: Vec): number {
  const d = signedDistanceToLine(p, a, b);
  // The line's normal (-dy, dx) points "down" only when dx > 0 (y grows downward),
  // so flip the sign when the line runs right-to-left.
  return b.x >= a.x ? d : -d;
}

/**
 * Squat/lunge depth expressed as an "equivalent knee angle", measured from how
 * far the thigh has dropped toward horizontal:
 *
 *   rise = knee.y − hip.y         vertical drop from hip to knee (y grows down)
 *   α    = acos(rise / |knee→ankle|)   thigh angle from vertical, using shin
 *                                      length as the thigh-length reference
 *   depth = 180° − α
 *
 * Standing tall reads ~180°, thighs parallel to the floor reads 90°, and hips
 * below the knees read < 90°. Unlike a raw knee angle this is correct from the
 * FRONT as well as the side (vertical distances aren't foreshortened when the
 * camera is level) and ignores how far the shins tilt forward — which is
 * exactly what "depth" means in coaching terms.
 *
 * Why not MediaPipe's 3D world landmarks? Their depth (z) estimate is noisy
 * enough that a person standing perfectly straight can read ~140° at the knee.
 */
export function thighDepthAngle(hip: Vec, knee: Vec, ankle: Vec): number {
  const shin = Math.hypot(ankle.x - knee.x, ankle.y - knee.y);
  if (shin === 0) return NaN;
  const rise = knee.y - hip.y;
  return 180 - Math.acos(clampUnit(rise / shin)) * RAD_TO_DEG;
}
