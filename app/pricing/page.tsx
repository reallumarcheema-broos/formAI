import type { Metadata } from "next";
import Link from "next/link";
import { CheckoutButton } from "@/components/CheckoutButton";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { PRO_PLAN } from "@/lib/billing/plans";
import { getProStatus } from "@/lib/billing/subscription";
import { getExercise } from "@/lib/exercises";

export const metadata: Metadata = {
  title: "Pricing",
  description: `FormAI Pro: real-time AI form coaching for ${PRO_PLAN.priceLabel}/month. Cancel anytime.`,
};

const ERRORS: Record<string, string> = {
  "not-configured": "Payments aren't set up on this deployment yet. The site owner needs to add Stripe keys.",
  checkout: "We couldn't start checkout. Please try again in a moment.",
  incomplete: "Your checkout wasn't completed, so you haven't been charged.",
  "link-invalid": "That device link is invalid or has expired. Links last 10 minutes, so generate a new one.",
  "link-inactive": "The subscription behind that device link is no longer active.",
};

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const status = await getProStatus();
  const exercise = params.exercise ? getExercise(params.exercise) : undefined;
  const error = params.error ? ERRORS[params.error] : undefined;
  const isPro = status.isPro;

  return (
    <>
      <SiteHeader isPro={status.paywallEnabled && isPro} />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-12">
        <section className="pt-10 pb-6 text-center">
          <h1 className="text-4xl font-bold tracking-tight">One plan. Every exercise.</h1>
          <p className="mx-auto mt-3 max-w-md text-zinc-400">
            A personal form coach in your pocket for less than a single PT session a month.
          </p>
        </section>

        {exercise && !isPro && (
          <p className="mb-4 rounded-xl border border-accent/30 bg-accent/10 p-3 text-center text-sm">
            <span aria-hidden>{exercise.icon}</span> Subscribe to start your <strong>{exercise.name}</strong> workout.
            You&apos;ll go straight to it after checkout.
          </p>
        )}
        {params.canceled && (
          <p className="mb-4 rounded-xl border border-white/10 bg-zinc-900 p-3 text-center text-sm text-zinc-300">
            Checkout canceled. You haven&apos;t been charged.
          </p>
        )}
        {error && (
          <p role="alert" className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-center text-sm text-red-200">
            {error}
          </p>
        )}

        <div className="relative rounded-3xl border-2 border-accent bg-gradient-to-b from-accent/10 to-zinc-900/50 p-6">
          <h2 className="text-lg font-semibold">{PRO_PLAN.name}</h2>
          <p className="mt-2" data-testid="price">
            <span className="text-5xl font-bold">{PRO_PLAN.priceLabel}</span>
            <span className="text-zinc-400"> / month (USD)</span>
          </p>
          <ul className="mt-6 space-y-3 text-sm text-zinc-200">
            {PRO_PLAN.features.map((f) => (
              <li key={f} className="flex gap-2">
                <span className="text-accent" aria-hidden>
                  ✓
                </span>
                {f}
              </li>
            ))}
          </ul>
          <div className="mt-8">
            {isPro ? (
              <div className="flex flex-col gap-2">
                <Link
                  href={exercise ? `/workout/${exercise.id}` : "/"}
                  className="rounded-xl bg-accent px-5 py-4 text-center text-lg font-bold text-black hover:bg-accent-strong"
                >
                  You&apos;re subscribed: start a workout
                </Link>
                <Link href="/account" className="text-center text-sm text-zinc-400 underline-offset-4 hover:underline">
                  Manage your plan
                </Link>
              </div>
            ) : (
              <>
                <CheckoutButton exerciseId={exercise?.id} />
                <p className="mt-2 text-center text-xs text-zinc-400">
                  Secure checkout by Stripe · Billed monthly · Cancel anytime
                </p>
              </>
            )}
          </div>
        </div>

        <section className="mt-12 space-y-5 text-sm">
          <h2 className="text-lg font-semibold">FAQ</h2>
          <div>
            <h3 className="font-medium">What happens after I subscribe?</h3>
            <p className="text-zinc-400">
              You&apos;re taken straight to your workout. Prop up your phone, follow the setup check, and press Start.
            </p>
          </div>
          <div>
            <h3 className="font-medium">Is my video uploaded anywhere?</h3>
            <p className="text-zinc-400">
              No. Pose tracking runs entirely in your browser using on-device machine learning. Frames never leave
              your phone or laptop.
            </p>
          </div>
          <div>
            <h3 className="font-medium">I paid on my laptop. How do I use my phone?</h3>
            <p className="text-zinc-400">
              On the laptop, open <strong>Account → Use on another device</strong> and scan the QR code with your
              phone. It&apos;s unlocked instantly.
            </p>
          </div>
          <div>
            <h3 className="font-medium">How do I cancel?</h3>
            <p className="text-zinc-400">
              Open your Account page and choose “Manage billing”. You keep access until the end of the period you
              paid for.
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
