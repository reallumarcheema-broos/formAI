"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { startCamera, stopCamera, CameraError, type Facing } from "@/lib/pose/camera";
import { getPoseLandmarker } from "@/lib/pose/detector";
import { drawSkeleton } from "@/lib/pose/drawing";
import type { Landmark } from "@/lib/pose/landmarks";
import type { PoseFrame } from "@/lib/pose/poseFrame";
import { LandmarkSmoother } from "@/lib/pose/smoothing";

export type TrackingStatus = "loading" | "ready" | "error";

/** Return landmark indices to draw in red, or nothing. */
export type FrameHandler = (frame: PoseFrame | null) => ReadonlySet<number> | void;

interface Options {
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  facing: Facing;
  /** Called once per processed video frame, with smoothed landmarks (or null if no person). */
  onFrame: FrameHandler;
}

const toLandmarks = (points: { x: number; y: number; z: number; visibility?: number }[]): Landmark[] =>
  points.map((p) => ({ x: p.x, y: p.y, z: p.z, visibility: p.visibility ?? 0 }));

/**
 * Owns the camera stream, the MediaPipe landmarker and the render loop.
 * Every new video frame: detect → smooth → hand to `onFrame` → draw skeleton.
 */
export function usePoseTracking({ videoRef, canvasRef, facing, onFrame }: Options) {
  const [status, setStatus] = useState<TrackingStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const onFrameRef = useRef(onFrame);

  useEffect(() => {
    onFrameRef.current = onFrame;
  }, [onFrame]);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    let cancelled = false;
    let stream: MediaStream | null = null;
    let raf = 0;
    const normalizedSmoother = new LandmarkSmoother(5);
    const worldSmoother = new LandmarkSmoother(5);

    setStatus("loading");
    setError(null);

    (async () => {
      try {
        // Start the camera and load the model in parallel. Track the stream as soon as
        // it exists so cleanup can always release the camera, even mid-load.
        const camera = startCamera(video, facing).then((s) => {
          stream = s;
          if (cancelled) stopCamera(s);
        });
        const [landmarker] = await Promise.all([getPoseLandmarker(), camera]);
        if (cancelled) return;
        setStatus("ready");

        const ctx = canvas.getContext("2d");
        let lastVideoTime = -1;
        let lastTimestamp = 0;

        const loop = () => {
          if (cancelled) return;
          raf = requestAnimationFrame(loop);
          if (video.readyState < 2 || video.currentTime === lastVideoTime) return;
          lastVideoTime = video.currentTime;

          // Match the canvas to the camera resolution so normalized landmarks map 1:1.
          if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
          }

          // VIDEO mode requires strictly increasing timestamps.
          const timestamp = Math.max(performance.now(), lastTimestamp + 1);
          lastTimestamp = timestamp;

          let frame: PoseFrame | null = null;
          try {
            const result = landmarker.detectForVideo(video, timestamp);
            const image = result.landmarks[0];
            const world = result.worldLandmarks[0];
            if (image && world) {
              const normalized = normalizedSmoother.push(toLandmarks(image));
              const aspect = video.videoWidth / video.videoHeight || 1;
              frame = {
                normalized,
                image: normalized.map((p) => ({ ...p, x: p.x * aspect })),
                world: worldSmoother.push(toLandmarks(world)),
                timestamp,
              };
            } else {
              normalizedSmoother.reset();
              worldSmoother.reset();
            }
          } catch (err) {
            console.error("[FormAI] Pose detection failed on a frame", err);
          }

          const highlight = onFrameRef.current(frame) ?? undefined;
          if (ctx) drawSkeleton(ctx, frame?.normalized ?? null, { highlight });
        };
        raf = requestAnimationFrame(loop);
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setError(
          err instanceof CameraError
            ? err.message
            : "Couldn't load the pose model. Check your connection and reload the page.",
        );
        console.error("[FormAI]", err);
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stopCamera(stream);
      if (video.srcObject) video.srcObject = null;
    };
  }, [videoRef, canvasRef, facing]);

  return { status, error };
}
