import type { Landmark } from "./landmarks";

/**
 * Moving-average smoother for pose landmarks.
 *
 * MediaPipe landmarks jitter by a few pixels frame-to-frame. Angle thresholds
 * are sensitive to that noise (a knee hovering at 159°/161° would flicker
 * between states), so we average each landmark over the last `windowSize`
 * frames before doing any math.
 *
 * Each sample is weighted by its visibility so a single low-confidence frame
 * (e.g. a hand briefly occluding the knee) can't yank the average around.
 * A window of 4–5 frames (~130ms at 30fps) removes jitter without adding
 * noticeable lag to rep counting.
 */
export class LandmarkSmoother {
  private history: Landmark[][] = [];

  constructor(private readonly windowSize = 5) {}

  /** Push a new frame and get back the smoothed landmarks. */
  push(frame: Landmark[]): Landmark[] {
    this.history.push(frame);
    if (this.history.length > this.windowSize) this.history.shift();

    return frame.map((_, i) => {
      let wSum = 0;
      let x = 0;
      let y = 0;
      let z = 0;
      let visibility = 0;
      for (const past of this.history) {
        const p = past[i];
        if (!p) continue;
        // Floor the weight so an all-low-visibility window still averages sensibly.
        const w = Math.max(p.visibility, 0.05);
        x += p.x * w;
        y += p.y * w;
        z += p.z * w;
        visibility += p.visibility;
        wSum += w;
      }
      return {
        x: x / wSum,
        y: y / wSum,
        z: z / wSum,
        visibility: visibility / this.history.length,
      };
    });
  }

  /** Forget history, e.g. after the person leaves the frame. */
  reset(): void {
    this.history = [];
  }
}
