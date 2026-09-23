"use client";

import { useEffect } from "react";

/** Keep the screen on while `active` (phones otherwise dim mid-set). Silently no-ops where unsupported. */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let released = false;

    const request = async () => {
      try {
        sentinel = await navigator.wakeLock.request("screen");
        if (released) sentinel.release();
      } catch {
        /* denied or not visible — fine */
      }
    };
    // The lock is dropped whenever the tab is hidden; re-acquire on return.
    const onVisible = () => document.visibilityState === "visible" && request();

    request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      released = true;
      document.removeEventListener("visibilitychange", onVisible);
      sentinel?.release().catch(() => {});
    };
  }, [active]);
}
