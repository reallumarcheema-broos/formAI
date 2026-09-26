"use client";

import dynamic from "next/dynamic";

/** The food log reads localStorage, so it renders in the browser only. */
export const FoodLoader = dynamic(() => import("./FoodLog").then((m) => m.FoodLog), {
  ssr: false,
  loading: () => <main className="min-h-[60vh] flex-1" />,
});
