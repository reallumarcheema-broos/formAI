"use client";

import dynamic from "next/dynamic";

/**
 * The workout needs the camera, speech and MediaPipe — all browser-only — so
 * skip server rendering entirely and show a lightweight placeholder instead.
 */
export const WorkoutLoader = dynamic(() => import("./WorkoutFlow").then((m) => m.WorkoutFlow), {
  ssr: false,
  loading: () => (
    <div className="grid min-h-dvh place-items-center bg-black">
      <span className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-accent" />
    </div>
  ),
});
