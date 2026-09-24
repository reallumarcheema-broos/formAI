import type { Metadata } from "next";
import { ProgressLoader } from "@/components/progress/ProgressLoader";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getProStatus } from "@/lib/billing/subscription";

export const metadata: Metadata = {
  title: "Progress",
  description: "Calories burned, streaks and form score from your FormAI workouts.",
};

export default async function ProgressPage() {
  const status = await getProStatus();
  return (
    <>
      <SiteHeader isPro={status.paywallEnabled && status.isPro} />
      <ProgressLoader canTrain={status.isPro} />
      <SiteFooter />
    </>
  );
}
