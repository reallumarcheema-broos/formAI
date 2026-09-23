"use client";

import Link from "next/link";
import { useRef } from "react";
import type { Facing } from "@/lib/pose/camera";
import { usePoseTracking, type FrameHandler } from "./usePoseTracking";

interface Props {
  facing: Facing;
  onFrame: FrameHandler;
  /** Always shown (e.g. back button), even while loading or on error. */
  topBar?: React.ReactNode;
  /** Shown once the camera and model are ready. */
  children?: React.ReactNode;
}

/**
 * Full-screen camera feed with the skeleton canvas layered on top.
 * Mounting starts the camera; unmounting releases it.
 */
export function CameraStage({ facing, onFrame, topBar, children }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { status, error } = usePoseTracking({ videoRef, canvasRef, facing, onFrame });

  // Mirror the selfie camera so moving left moves left on screen. Video and
  // canvas are flipped together, so the overlay stays aligned.
  const mirror = facing === "user" ? "-scale-x-100" : "";

  return (
    <div className="fixed inset-0 overflow-hidden bg-black">
      <video
        ref={videoRef}
        className={`absolute inset-0 h-full w-full object-contain ${mirror}`}
        playsInline
        muted
        autoPlay
      />
      <canvas
        ref={canvasRef}
        className={`pointer-events-none absolute inset-0 h-full w-full object-contain ${mirror}`}
      />

      {status === "loading" && (
        <div className="absolute inset-0 grid place-items-center">
          <div className="flex flex-col items-center gap-3 text-zinc-300">
            <span className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-accent" />
            <p className="text-sm">Starting camera &amp; loading pose model…</p>
          </div>
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-black/80 p-6">
          <div role="alert" className="max-w-sm rounded-2xl border border-red-500/40 bg-zinc-900 p-5 text-center">
            <p className="text-lg font-semibold">Camera unavailable</p>
            <p className="mt-2 text-sm text-zinc-300">{error}</p>
            <div className="mt-4 flex justify-center gap-2">
              <button
                onClick={() => window.location.reload()}
                className="rounded-xl bg-white/10 px-4 py-2 font-semibold hover:bg-white/15"
              >
                Try again
              </button>
              <Link href="/" className="rounded-xl border border-white/15 px-4 py-2 font-semibold hover:bg-white/5">
                Back
              </Link>
            </div>
          </div>
        </div>
      )}

      {topBar}
      {status === "ready" && children}
    </div>
  );
}
