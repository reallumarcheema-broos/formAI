import Link from "next/link";
import { ExerciseCard } from "@/components/ExerciseCard";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { PRO_PLAN } from "@/lib/billing/plans";
import { canAccess, getProStatus } from "@/lib/billing/subscription";
import { EXERCISES } from "@/lib/exercises";

const STEPS = [
  { title: "Subscribe", body: `${PRO_PLAN.priceLabel}/month unlocks every exercise. Cancel anytime.` },
  { title: "Prop up your phone", body: "About 2 m away, with your whole body in frame. A side view works best." },
  { title: "Train with a coach", body: "Reps are counted out loud and you hear form cues during the set." },
];

const WELCOME: Record<string, string> = {
  "1": "🎉 You're subscribed! Pick an exercise below to start your first workout.",
  device: "✅ This device is now linked to your FormAI Pro subscription. Pick an exercise to start.",
};

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const status = await getProStatus();
  const isPro = status.paywallEnabled && status.isPro;
  const needsSubscription = status.paywallEnabled && !status.isPro;
  const welcome = params.welcome && isPro ? WELCOME[params.welcome] : undefined;

  return (
    <>
      <SiteHeader isPro={isPro} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-12">
        {welcome && (
          <p role="status" className="mt-6 rounded-2xl border border-accent/40 bg-accent/10 p-4 text-sm font-medium">
            {welcome}
          </p>
        )}

        <section className="pt-10 pb-8 sm:pt-16">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" /> 100% on-device · no video uploaded
          </p>
          <h1 className="max-w-2xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Your AI form coach, <span className="text-accent">live in your browser.</span>
          </h1>
          <p className="mt-4 max-w-xl text-lg text-zinc-400">
            FormAI watches your reps through your camera, counts them out loud and tells you when to fix your form.
            No app to install, no wearables.
          </p>
          {needsSubscription && (
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/pricing"
                className="rounded-xl bg-accent px-6 py-4 text-center text-lg font-bold text-black hover:bg-accent-strong"
              >
                Get FormAI Pro: {PRO_PLAN.priceLabel}/month
              </Link>
              <p className="text-sm text-zinc-400">Cancel anytime · Secure checkout by Stripe</p>
            </div>
          )}
        </section>

        <section id="exercises" aria-labelledby="exercises-title">
          <h2 id="exercises-title" className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">
            {needsSubscription ? "Exercises included with Pro" : "Pick an exercise"}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {EXERCISES.map((ex) => (
              <ExerciseCard
                key={ex.id}
                exercise={{ id: ex.id, name: ex.name, tagline: ex.tagline, icon: ex.icon }}
                locked={!canAccess(ex.tier, status)}
              />
            ))}
          </div>
          {!status.paywallEnabled && (
            <p className="mt-3 text-xs text-zinc-400">
              Development mode: Stripe isn&apos;t configured, so the paywall is off. Production always requires a
              subscription.
            </p>
          )}
          {needsSubscription && (
            <p className="mt-3 text-sm text-zinc-400">
              Already subscribed on another device? On that device, open{" "}
              <strong className="text-zinc-200">Account → Use on another device</strong> and scan the QR code.
            </p>
          )}
        </section>

        <section className="mt-12" aria-labelledby="how-title">
          <h2 id="how-title" className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">
            How it works
          </h2>
          <ol className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4">
                <span className="text-sm font-bold text-accent">0{i + 1}</span>
                <h3 className="mt-1 font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm text-zinc-400">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
