"use client";

import dynamic from "next/dynamic";

/** The scanner reads localStorage and the camera, so it renders in the browser only. */
export const FoodLoader = dynamic(() => import("./FoodScanner").then((m) => m.FoodScanner), {
  ssr: false,
  loading: () => <main className="min-h-[60vh] flex-1" />,
});
