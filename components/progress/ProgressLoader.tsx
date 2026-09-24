"use client";

import dynamic from "next/dynamic";

/** The dashboard reads localStorage, so it renders in the browser only. */
export const ProgressLoader = dynamic(() => import("./ProgressDashboard").then((m) => m.ProgressDashboard), {
  ssr: false,
  loading: () => <main className="min-h-[60vh] flex-1" />,
});
