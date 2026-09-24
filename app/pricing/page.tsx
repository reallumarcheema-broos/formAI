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
      <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-20">
        <section className="pt-12 pb-8 text-center">
          <p className="eyebrow text-amber-ink">Pricing</p>
          <h1 className="font-display mt-3 text-5xl leading-none font-bold">One plan. Every exercise.</h1>
          <p className="mx-auto mt-4 max-w-md text-muted">
            A personal form coach in your pocket for less than a single PT session a month.
          </p>
        </section>

        {exercise && !isPro && (
          <p className="mb-4 rounded-2xl border border-amber/40 bg-card p-3 text-center text-sm">
            <span aria-hidden>{exercise.icon}</span> Subscribe to start your <strong>{exercise.name}</strong> workout.
            You&apos;ll go straight to it after checkout.
          </p>
        )}
        {params.canceled && (
          <p className="mb-4 rounded-2xl border border-line bg-card p-3 text-center text-sm text-muted">
            Checkout canceled. You haven&apos;t been charged.
          </p>
        )}
        {error && (
          <p role="alert" className="mb-4 rounded-2xl border border-red-300 bg-red-50 p-3 text-center text-sm text-red-800">
            {error}
          </p>
        )}

        <div className="relative overflow-hidden rounded-[2rem] bg-espresso p-7 text-cream shadow-[0_30px_80px_-30px_rgba(28,22,19,0.6)]">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-amber/30 blur-3xl" aria-hidden />
          <h2 className="eyebrow relative text-amber-bright">{PRO_PLAN.name}</h2>
          <p className="relative mt-3" data-testid="price">
            <span className="font-display text-7xl font-bold">{PRO_PLAN.priceLabel}</span>
            <span className="text-muted-dark"> / month (USD)</span>
          </p>
          <ul className="relative mt-6 space-y-3 text-sm text-cream/90">
            {PRO_PLAN.features.map((f) => (
              <li key={f} className="flex gap-2">
                <span className="text-amber-bright" aria-hidden>
                  ✓
                </span>
                {f}
              </li>
            ))}
          </ul>
          <div className="relative mt-8">
            {isPro ? (
              <div className="flex flex-col gap-2">
                <Link
                  href={exercise ? `/workout/${exercise.id}` : "/"}
                  className="rounded-full bg-cream px-5 py-4 text-center text-lg font-semibold text-ink hover:bg-white"
                >
                  You&apos;re subscribed: start a workout
                </Link>
                <Link href="/account" className="text-center text-sm text-muted-dark underline-offset-4 hover:underline">
                  Manage your plan
                </Link>
              </div>
            ) : (
              <>
                <CheckoutButton exerciseId={exercise?.id} />
                <p className="mt-4 text-center text-xs leading-relaxed text-muted-dark" data-testid="renewal-terms">
                  Renews automatically at {PRO_PLAN.priceLabel}/month until you cancel. Cancel anytime in Account →
                  Manage billing. By subscribing you agree to our{" "}
                  <Link href="/terms" className="underline underline-offset-2 hover:text-cream">
                    Terms
                  </Link>
                  ,{" "}
                  <Link href="/privacy" className="underline underline-offset-2 hover:text-cream">
                    Privacy Policy
                  </Link>{" "}
                  and{" "}
                  <Link href="/refunds" className="underline underline-offset-2 hover:text-cream">
                    Refund Policy
                  </Link>
                  . Secure checkout by Stripe.
                </p>
              </>
            )}
          </div>
        </div>

        <section className="mt-14 space-y-5 text-sm">
          <h2 className="font-display text-3xl font-bold">FAQ</h2>
          <div>
            <h3 className="font-semibold">What happens after I subscribe?</h3>
            <p className="text-muted">
              You&apos;re taken straight to your workout. Prop up your phone, follow the setup check, and press Start.
            </p>
          </div>
          <div>
            <h3 className="font-semibold">Is my video uploaded anywhere?</h3>
            <p className="text-muted">
              No. Pose tracking runs entirely in your browser using on-device machine learning. Frames never leave
              your phone or laptop.
            </p>
          </div>
          <div>
            <h3 className="font-semibold">I paid on my laptop. How do I use my phone?</h3>
            <p className="text-muted">
              On the laptop, open <strong>Account → Use on another device</strong> and scan the QR code with your
              phone. It&apos;s unlocked instantly.
            </p>
          </div>
          <div>
            <h3 className="font-semibold">How do I cancel?</h3>
            <p className="text-muted">
              Open your Account page and choose “Manage billing”. You keep access until the end of the period you
              paid for. New subscribers can get a full refund within 7 days. See the{" "}
              <Link href="/refunds" className="font-medium text-amber-ink underline underline-offset-2">
                Refund Policy
              </Link>
              .
            </p>
          </div>
          <div>
            <h3 className="font-semibold">Which devices work?</h3>
            <p className="text-muted">
              Safari on iPhone, Chrome on Android, and any modern desktop browser with a webcam.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
