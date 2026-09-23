/**
 * Loads MediaPipe Pose Landmarker in the browser.
 *
 * The WASM runtime is served from this app's own origin (copied from
 * node_modules into /public/mediapipe by scripts/copy-mediapipe.mjs) and the
 * model from Google's model bucket. Both are cached by the browser after
 * first load. No camera frames ever leave the device: inference
 * runs locally in WebAssembly / WebGL.
 */
import type { PoseLandmarker } from "@mediapipe/tasks-vision";

const WASM_BASE_URL = process.env.NEXT_PUBLIC_MEDIAPIPE_WASM_URL ?? "/mediapipe/wasm";

/** "lite" is fast enough for mid-range phones; swap to "full" for more accuracy. */
const MODEL_URL =
  process.env.NEXT_PUBLIC_POSE_MODEL_URL ??
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

let landmarkerPromise: Promise<PoseLandmarker> | null = null;

/** Create (once) and return the shared PoseLandmarker instance. */
export function getPoseLandmarker(): Promise<PoseLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = createLandmarker().catch((err) => {
      landmarkerPromise = null; // allow a retry
      throw err;
    });
  }
  return landmarkerPromise;
}

async function createLandmarker(): Promise<PoseLandmarker> {
  // Dynamic import keeps the ~1MB MediaPipe bundle out of every page except the workout.
  const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");
  const fileset = await FilesetResolver.forVisionTasks(WASM_BASE_URL);

  const options = (delegate: "GPU" | "CPU") => ({
    baseOptions: { modelAssetPath: MODEL_URL, delegate },
    runningMode: "VIDEO" as const,
    numPoses: 1,
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  try {
    return await PoseLandmarker.createFromOptions(fileset, options("GPU"));
  } catch (gpuError) {
    // Some browsers (older iOS Safari, locked-down Android WebViews) lack the
    // WebGL features the GPU delegate needs. CPU is slower but works everywhere.
    console.warn("[FormAI] GPU delegate unavailable, falling back to CPU", gpuError);
    return PoseLandmarker.createFromOptions(fileset, options("CPU"));
  }
}
