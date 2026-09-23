import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { FREE_PLAN, PRO_PLAN } from "@/lib/billing/plans";
import { getProStatus } from "@/lib/billing/subscription";
import { getExercise } from "@/lib/exercises";

export const metadata: Metadata = { title: "Pricing" };

const ERRORS: Record<string, string> = {
  "not-configured": "Payments aren't set up on this deployment yet. Add your Stripe keys to enable checkout.",
  checkout: "We couldn't start checkout. Please try again in a moment.",
  incomplete: "Your checkout wasn't completed, so you haven't been charged.",
};

export default async function PricingPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const status = await getProStatus();
  const lockedExercise = params.exercise ? getExercise(params.exercise) : undefined;
  const error = params.error ? ERRORS[params.error] : undefined;
  const isPro = status.paywallEnabled && status.isPro;

  return (
    <>
      <SiteHeader isPro={isPro} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-12">
        <section className="pt-10 pb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight">Simple pricing</h1>
          <p className="mx-auto mt-3 max-w-lg text-zinc-400">
            Start free with squats. Go Pro for the full exercise library and every new movement we ship.
          </p>
        </section>

        {lockedExercise && !isPro && (
          <p className="mb-6 rounded-xl border border-accent/30 bg-accent/10 p-3 text-center text-sm">
            {lockedExercise.icon} <strong>{lockedExercise.name}</strong> is part of {PRO_PLAN.name}.
          </p>
        )}
        {params.canceled && (
          <p className="mb-6 rounded-xl border border-white/10 bg-zinc-900 p-3 text-center text-sm text-zinc-300">
            Checkout canceled — you haven&apos;t been charged.
          </p>
        )}
        {error && (
          <p role="alert" className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-center text-sm text-red-200">
            {error}
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col rounded-3xl border border-white/10 bg-zinc-900/50 p-6">
            <h2 className="text-lg font-semibold">{FREE_PLAN.name}</h2>
            <p className="mt-2">
              <span className="text-4xl font-bold">$0</span>
              <span className="text-zinc-400"> forever</span>
            </p>
            <ul className="mt-6 flex-1 space-y-3 text-sm text-zinc-300">
              {FREE_PLAN.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-zinc-500">✓</span> {f}
                </li>
              ))}
            </ul>
            <Link
              href="/workout/squat"
              className="mt-8 rounded-xl border border-white/15 px-5 py-3 text-center font-semibold hover:bg-white/5"
            >
              Start squatting
            </Link>
          </div>

          <div className="relative flex flex-col rounded-3xl border-2 border-accent bg-gradient-to-b from-accent/10 to-zinc-900/50 p-6">
            <span className="absolute -top-3 right-6 rounded-full bg-accent px-3 py-1 text-xs font-bold text-black">
              MOST POPULAR
            </span>
            <h2 className="text-lg font-semibold">{PRO_PLAN.name}</h2>
            <p className="mt-2">
              <span className="text-4xl font-bold">{PRO_PLAN.priceLabel}</span>
              <span className="text-zinc-400"> / month</span>
            </p>
            <ul className="mt-6 flex-1 space-y-3 text-sm text-zinc-200">
              {PRO_PLAN.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-accent">✓</span> {f}
                </li>
              ))}
            </ul>
            {isPro ? (
              <Link
                href="/account"
                className="mt-8 rounded-xl bg-white/10 px-5 py-3 text-center font-semibold hover:bg-white/15"
              >
                You&apos;re on Pro — manage plan
              </Link>
            ) : (
              <form action="/api/checkout" method="POST" className="mt-8">
                <button
                  type="submit"
                  className="w-full rounded-xl bg-accent px-5 py-3 font-semibold text-black hover:bg-accent-strong"
                >
                  Get Pro for {PRO_PLAN.priceLabel}/mo
                </button>
                <p className="mt-2 text-center text-xs text-zinc-500">Secure checkout by Stripe · Cancel anytime</p>
              </form>
            )}
          </div>
        </div>

        <section className="mx-auto mt-12 max-w-2xl space-y-4 text-sm">
          <h2 className="text-lg font-semibold">FAQ</h2>
          <div>
            <h3 className="font-medium">Is my video uploaded anywhere?</h3>
            <p className="text-zinc-400">
              No. Pose tracking runs entirely in your browser using on-device machine learning. Frames never leave
              your phone or laptop.
            </p>
          </div>
          <div>
            <h3 className="font-medium">How do I cancel?</h3>
            <p className="text-zinc-400">
              Open your Account page and choose “Manage billing”. You keep Pro until the end of the period you paid
              for.
            </p>
          </div>
          <div>
            <h3 className="font-medium">Which devices work?</h3>
            <p className="text-zinc-400">
              Safari on iPhone, Chrome on Android, and any modern desktop browser with a webcam.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
