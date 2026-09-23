import { describe, expect, it } from "vitest";
import { angleFromVertical, jointAngle, offsetBelowLine, thighDepthAngle } from "@/lib/pose/angles";

describe("jointAngle", () => {
  it("is 180° for a straight limb", () => {
    expect(jointAngle({ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 })).toBeCloseTo(180);
  });
  it("is 90° for a right angle", () => {
    expect(jointAngle({ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 })).toBeCloseTo(90);
  });
  it("uses z when present", () => {
    expect(jointAngle({ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 0, y: 1, z: 1 })).toBeCloseTo(90);
  });
  it("returns NaN for degenerate input", () => {
    expect(jointAngle({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 1 })).toBeNaN();
  });
});

describe("angleFromVertical", () => {
  it("is 0° pointing up (y grows downward)", () => {
    expect(angleFromVertical({ x: 0, y: 1 }, { x: 0, y: 0 })).toBeCloseTo(0);
  });
  it("is 90° when horizontal, either direction", () => {
    expect(angleFromVertical({ x: 0, y: 0 }, { x: 1, y: 0 })).toBeCloseTo(90);
    expect(angleFromVertical({ x: 0, y: 0 }, { x: -1, y: 0 })).toBeCloseTo(90);
  });
});

describe("offsetBelowLine", () => {
  it("is positive below the line and negative above, facing either way", () => {
    const below = { x: 0.5, y: 0.2 };
    const above = { x: 0.5, y: -0.2 };
    const left = { x: 0, y: 0 };
    const right = { x: 1, y: 0 };
    expect(offsetBelowLine(below, left, right)).toBeCloseTo(0.2);
    expect(offsetBelowLine(below, right, left)).toBeCloseTo(0.2);
    expect(offsetBelowLine(above, left, right)).toBeCloseTo(-0.2);
    expect(offsetBelowLine(above, right, left)).toBeCloseTo(-0.2);
  });
});

describe("thighDepthAngle", () => {
  const knee = { x: 0, y: 1 };
  const ankle = { x: 0, y: 2 };
  it("reads 180° when standing (hip straight above knee)", () => {
    expect(thighDepthAngle({ x: 0, y: 0 }, knee, ankle)).toBeCloseTo(180);
  });
  it("reads 90° when the thigh is parallel to the floor", () => {
    expect(thighDepthAngle({ x: 1, y: 1 }, knee, ankle)).toBeCloseTo(90);
  });
  it("reads below 90° when the hip drops below the knee", () => {
    expect(thighDepthAngle({ x: 0.9, y: 1.3 }, knee, ankle)).toBeLessThan(90);
  });
  it("ignores shin tilt: a forward-leaning shin doesn't change depth", () => {
    const tiltedAnkle = { x: -0.5, y: 1 + Math.sqrt(0.75) }; // same shin length, tilted 30°
    expect(thighDepthAngle({ x: 1, y: 1 }, knee, tiltedAnkle)).toBeCloseTo(90);
  });
});
