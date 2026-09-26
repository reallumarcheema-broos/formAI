import { existsSync } from "node:fs";
import { join } from "node:path";

export const CACHE_DIR = join(__dirname, "..", ".cache");

export const FIXTURES = {
  model:
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
  /** A man standing upright, full body, facing the camera. */
  standing: "https://storage.googleapis.com/mediapipe-assets/male_full_height_hands.jpg",
  /** A man in a warrior-II pose: front knee deeply bent, like the bottom of a lunge. */
  warrior: "https://storage.googleapis.com/mediapipe-assets/pose.jpg",
  /** A burger on a plate, for the food scanner. */
  burger: "https://storage.googleapis.com/mediapipe-assets/burger.jpg",
} as const;

export function fixturePath(name: keyof typeof FIXTURES): string {
  return join(CACHE_DIR, name === "model" ? "pose_landmarker_lite.task" : `${name}.jpg`);
}

export function hasFixtures(): boolean {
  return (Object.keys(FIXTURES) as (keyof typeof FIXTURES)[]).every((k) => existsSync(fixturePath(k)));
}
