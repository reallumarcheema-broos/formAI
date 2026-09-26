import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FoodLoader } from "@/components/food/FoodLoader";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getProStatus } from "@/lib/billing/subscription";

export const metadata: Metadata = {
  title: "Food scanner",
  description: "Snap a photo of your meal and FormAI estimates the calories, protein, carbs and fat.",
};

export default async function FoodPage() {
  const status = await getProStatus();
  if (!status.isPro) redirect("/pricing?exercise=food");
  return (
    <>
      <SiteHeader isPro={status.paywallEnabled && status.isPro} />
      <FoodLoader />
      <SiteFooter />
    </>
  );
}
