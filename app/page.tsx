import Link from "next/link";
import { ExerciseCard } from "@/components/ExerciseCard";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { PRO_PLAN } from "@/lib/billing/plans";
import { canAccess, getProStatus } from "@/lib/billing/subscription";
import { EXERCISES } from "@/lib/exercises";

const STEPS = [
  { title: "Prop up your phone", body: "About 2 m away, whole body in frame. A side view works best." },
  { title: "Pick an exercise", body: "FormAI tracks 33 body points in real time, right in your browser." },
  { title: "Train with a coach", body: "Reps are counted out loud and you hear form cues mid-set." },
];

export default async function Home() {
  const status = await getProStatus();
  const showUpsell = status.paywallEnabled && !status.isPro;

  return (
    <>
      <SiteHeader isPro={status.paywallEnabled && status.isPro} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-12">
        <section className="pt-10 pb-8 sm:pt-16">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" /> 100% on-device · no video uploaded
          </p>
          <h1 className="max-w-2xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Your AI form coach, <span className="text-accent">live in your browser.</span>
          </h1>
          <p className="mt-4 max-w-xl text-lg text-zinc-400">
            FormAI watches your reps through your camera, counts them out loud and tells you when to fix your
            form — no app install, no wearables.
          </p>
        </section>

        <section id="exercises" aria-labelledby="exercises-title">
          <h2 id="exercises-title" className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
            Pick an exercise
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {EXERCISES.map((ex) => (
              <ExerciseCard
                key={ex.id}
                exercise={{ id: ex.id, name: ex.name, tagline: ex.tagline, icon: ex.icon, tier: ex.tier }}
                locked={!canAccess(ex.tier, status)}
              />
            ))}
          </div>
          {!status.paywallEnabled && (
            <p className="mt-3 text-xs text-zinc-500">
              Payments aren&apos;t configured, so every exercise is unlocked (development mode).
            </p>
          )}
        </section>

        {showUpsell && (
          <section className="mt-8 flex flex-col gap-4 rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/15 to-transparent p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Unlock every exercise with {PRO_PLAN.name}</h2>
              <p className="text-sm text-zinc-300">
                {PRO_PLAN.priceLabel}/month. Push-ups, lunges and every new exercise we add. Cancel anytime.
              </p>
            </div>
            <Link
              href="/pricing"
              className="rounded-xl bg-accent px-5 py-3 text-center font-semibold text-black hover:bg-accent-strong"
            >
              See Pro
            </Link>
          </section>
        )}

        <section className="mt-12" aria-labelledby="how-title">
          <h2 id="how-title" className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">
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
