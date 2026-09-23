import { SKELETON_CONNECTIONS, SKELETON_POINTS, type Landmark } from "./landmarks";
import { VISIBILITY_THRESHOLD } from "./poseFrame";

export interface SkeletonStyle {
  /** Color for bones/joints that look fine. */
  color: string;
  /** Color for landmarks involved in a current form issue. */
  warnColor: string;
  /** Landmark indices to draw in `warnColor`. */
  highlight?: ReadonlySet<number>;
}

const DEFAULT_STYLE: SkeletonStyle = { color: "#34d399", warnColor: "#f87171" };

/**
 * Draw the pose skeleton onto a canvas that is the same pixel size as the
 * video frame. Landmarks are normalized, so we scale by the canvas size.
 * Low-visibility landmarks are skipped rather than drawn in the wrong place.
 */
export function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[] | null,
  style: Partial<SkeletonStyle> = {},
): void {
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);
  if (!landmarks) return;

  const s = { ...DEFAULT_STYLE, ...style };
  // Scale line widths with the frame so the overlay looks the same on any resolution.
  const unit = Math.max(width, height) / 400;
  const visible = (i: number) => (landmarks[i]?.visibility ?? 0) >= VISIBILITY_THRESHOLD * 0.8;
  const colorFor = (i: number) => (s.highlight?.has(i) ? s.warnColor : s.color);

  ctx.lineCap = "round";
  ctx.lineWidth = 2.5 * unit;
  for (const [a, b] of SKELETON_CONNECTIONS) {
    if (!visible(a) || !visible(b)) continue;
    const pa = landmarks[a];
    const pb = landmarks[b];
    ctx.strokeStyle = s.highlight?.has(a) && s.highlight?.has(b) ? s.warnColor : s.color;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(pa.x * width, pa.y * height);
    ctx.lineTo(pb.x * width, pb.y * height);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  for (const i of SKELETON_POINTS) {
    if (!visible(i)) continue;
    const p = landmarks[i];
    ctx.fillStyle = "#0a0a0a";
    ctx.beginPath();
    ctx.arc(p.x * width, p.y * height, 4 * unit, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colorFor(i);
    ctx.beginPath();
    ctx.arc(p.x * width, p.y * height, 2.8 * unit, 0, Math.PI * 2);
    ctx.fill();
  }
}
