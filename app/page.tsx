import Link from "next/link";
import { ExerciseCard } from "@/components/ExerciseCard";
import { HeroVisual } from "@/components/home/HeroVisual";
import {
  AlertIcon,
  ArrowIcon,
  CameraIcon,
  ChartIcon,
  CheckIcon,
  FlameIcon,
  PlayIcon,
  ShieldIcon,
  SparkIcon,
  WaveIcon,
} from "@/components/icons";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { PRO_PLAN } from "@/lib/billing/plans";
import { canAccess, getProStatus } from "@/lib/billing/subscription";
import { EXERCISES } from "@/lib/exercises";

const FEATURES = [
  { icon: WaveIcon, title: "Real-time form check", body: "Hear it the moment form slips" },
  { icon: FlameIcon, title: "Calories burned", body: "Estimated live from every rep" },
  { icon: ChartIcon, title: "Track progress", body: "Daily goals, streaks, form score" },
  { icon: ShieldIcon, title: "Private by design", body: "Video never leaves your phone" },
];

const CUES = [
  { exercise: "Squat", cue: "Go a bit lower", why: "Thighs didn't reach parallel" },
  { exercise: "Squat", cue: "Push your knees out", why: "Knees caving inward" },
  { exercise: "Squat", cue: "Keep your chest up", why: "Torso leaning too far forward" },
  { exercise: "Push-up", cue: "Keep your body straight", why: "Hips sagging or piking" },
  { exercise: "Push-up", cue: "Lower your chest more", why: "Elbows didn't bend enough" },
  { exercise: "Lunge", cue: "Keep your torso upright", why: "Leaning over the front leg" },
];

const STEPS = [
  { icon: CameraIcon, title: "Prop up your phone", body: "About 2 m away with your whole body in frame. A side view works best." },
  { icon: SparkIcon, title: "Train with your AI coach", body: "Reps are counted out loud, calories add up live, and you hear a cue the moment your form slips." },
  { icon: ChartIcon, title: "Watch your progress", body: "Every set is saved on your device: calories per day, streaks and your form score over time." },
];

const WELCOME: Record<string, string> = {
  "1": "🎉 You're subscribed! Pick an exercise below to start your first workout.",
  device: "✅ This device is now linked to your FormAI Pro subscription. Pick an exercise to start.",
};

// Illustrative week for the dashboard preview (the real Progress page uses your own data).
const PREVIEW_WEEK = [120, 210, 0, 185, 260, 140, 184];
const PREVIEW_DAYS = ["M", "T", "W", "T", "F", "S", "S"];

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const status = await getProStatus();
  const isPro = status.paywallEnabled && status.isPro;
  const needsSubscription = status.paywallEnabled && !status.isPro;
  const welcome = params.welcome && isPro ? WELCOME[params.welcome] : undefined;
  const maxWeek = Math.max(...PREVIEW_WEEK);

  return (
    <>
      <SiteHeader isPro={isPro} />
      <main className="flex-1">
        {welcome && (
          <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
            <p role="status" className="rounded-2xl border border-amber/40 bg-card p-4 text-sm font-medium">
              {welcome}
            </p>
          </div>
        )}

        {/* ---- Hero ---------------------------------------------------------- */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-10 pb-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-16">
          <div>
            <p className="eyebrow text-amber-ink">AI form coach · Calorie tracker</p>
            <h1 className="font-display mt-4 text-5xl leading-[0.95] font-bold sm:text-6xl lg:text-7xl">
              Train smarter.
              <br />
              Burn more.
              <br />
              <span className="text-amber-ink">Never train wrong.</span>
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-muted">
              Prop up your phone and start moving. FormAI&apos;s camera counts your reps, tracks the calories you burn
              and tells you, out loud, the moment your form slips.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href={needsSubscription ? "/pricing" : "#exercises"}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-espresso px-7 py-4 font-semibold text-cream shadow-lg transition hover:bg-espresso-2"
              >
                {needsSubscription ? `Get FormAI Pro: ${PRO_PLAN.priceLabel}/month` : "Start a workout"}
                <ArrowIcon className="h-4 w-4" />
              </Link>
              <Link
                href="#how"
                className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-4 font-semibold text-ink hover:bg-sand"
              >
                <PlayIcon className="h-6 w-6" /> See how it works
              </Link>
            </div>
            <p className="mt-5 flex items-center gap-2 text-sm text-muted">
              <ShieldIcon className="h-4 w-4 text-amber-ink" /> 100% on-device. Your video is never uploaded.
            </p>
          </div>
          <div className="px-4 sm:px-8">
            <HeroVisual />
          </div>
        </section>

        {/* ---- Feature bar ---------------------------------------------------- */}
        <section id="features" aria-label="Features" className="mx-auto max-w-6xl scroll-mt-24 px-4 sm:px-6">
          <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-3xl bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex items-center gap-4 bg-espresso p-5 text-cream">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-white/15">
                  <Icon className="h-5 w-5 text-amber-bright" />
                </span>
                <span>
                  <span className="block text-sm font-semibold tracking-wide uppercase">{title}</span>
                  <span className="block text-sm text-muted-dark">{body}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* ---- Exercises ------------------------------------------------------ */}
        <section id="exercises" aria-labelledby="exercises-title" className="mx-auto max-w-6xl scroll-mt-24 px-4 pt-20 sm:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow text-amber-ink">{needsSubscription ? "Included with Pro" : "Start training"}</p>
              <h2 id="exercises-title" className="font-display mt-2 text-4xl font-bold sm:text-5xl">
                Pick an exercise
              </h2>
            </div>
            {needsSubscription && (
              <p className="max-w-sm text-sm text-muted">
                Already subscribed on another device? Open <strong className="text-ink">Account → Use on another device</strong>{" "}
                there and scan the QR code.
              </p>
            )}
          </div>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {EXERCISES.map((ex) => (
              <ExerciseCard
                key={ex.id}
                exercise={{ id: ex.id, name: ex.name, tagline: ex.tagline, icon: ex.icon }}
                locked={!canAccess(ex.tier, status)}
              />
            ))}
          </div>
          {!status.paywallEnabled && (
            <p className="mt-3 text-xs text-muted">
              Development mode: Stripe isn&apos;t configured, so the paywall is off. Production always requires a
              subscription.
            </p>
          )}
        </section>

        {/* ---- Form feedback -------------------------------------------------- */}
        <section aria-labelledby="form-title" className="mx-auto grid max-w-6xl gap-10 px-4 pt-24 sm:px-6 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="eyebrow text-amber-ink">Real-time form feedback</p>
            <h2 id="form-title" className="font-display mt-2 text-4xl leading-[1.02] font-bold sm:text-5xl">
              Doing it wrong?
              <br />
              You&apos;ll know instantly.
            </h2>
            <p className="mt-5 max-w-md text-muted">
              FormAI measures your joint angles 30 times a second. When your depth, knees, back or hips drift out of
              position, you hear a short cue mid-set and the joint lights up on screen, so you fix it on the very
              next rep.
            </p>
            <ul className="mt-6 space-y-2 text-sm">
              {["Spoken cues, so you never have to look at the screen", "Joints turn red when they're out of line", "Every rep marked as good or flagged in your summary"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <CheckIcon className="h-4 w-4 shrink-0 text-amber-ink" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {CUES.map((c) => (
              <li key={c.cue} className="rounded-2xl border border-line bg-card p-4">
                <p className="text-xs font-semibold tracking-wide text-muted uppercase">{c.exercise}</p>
                <p className="mt-1 flex items-center gap-2 font-semibold">
                  <AlertIcon className="h-4 w-4 shrink-0 text-amber-ink" /> &ldquo;{c.cue}&rdquo;
                </p>
                <p className="mt-1 text-sm text-muted">{c.why}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ---- Calorie tracker ------------------------------------------------- */}
        <section aria-labelledby="calories-title" className="mx-auto grid max-w-6xl gap-10 px-4 pt-24 sm:px-6 lg:grid-cols-2 lg:items-center">
          <div className="order-2 grid gap-3 sm:grid-cols-[1.3fr_1fr] lg:order-1">
            <div className="rounded-3xl bg-espresso p-6 text-cream">
              <p className="text-xs font-semibold tracking-wider text-muted-dark uppercase">This week</p>
              <p className="font-display mt-1 text-5xl font-semibold">
                1,099<span className="ml-1 text-base font-medium text-muted-dark normal-case">kcal</span>
              </p>
              <div className="mt-6 flex h-32 items-end gap-2" aria-hidden>
                {PREVIEW_WEEK.map((v, i) => (
                  <div key={i} className="flex h-full flex-1 flex-col items-center gap-2">
                    <div className="flex w-full flex-1 items-end">
                      <div
                        className={`w-full rounded-t-md ${i === 6 ? "bg-amber-bright" : "bg-white/25"}`}
                        style={{ height: `${Math.max(4, (v / maxWeek) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-muted-dark">{PREVIEW_DAYS[i]}</span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-muted-dark">Example data</p>
            </div>
            <div className="grid gap-3">
              <div className="rounded-3xl border border-line bg-card p-5">
                <p className="text-xs font-semibold tracking-wider text-muted uppercase">Form score</p>
                <p className="font-display text-5xl font-semibold">92<span className="text-2xl">%</span></p>
                <p className="text-xs text-muted">of reps with good form</p>
              </div>
              <div className="rounded-3xl border border-line bg-card p-5">
                <p className="text-xs font-semibold tracking-wider text-muted uppercase">Streak</p>
                <p className="font-display text-5xl font-semibold">5</p>
                <p className="text-xs text-muted">days in a row</p>
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <p className="eyebrow text-amber-ink">AI camera calorie tracker</p>
            <h2 id="calories-title" className="font-display mt-2 text-4xl leading-[1.02] font-bold sm:text-5xl">
              Every rep counts.
              <br />
              So does every calorie.
            </h2>
            <p className="mt-5 max-w-md text-muted">
              FormAI estimates the calories you burn from your body weight, the exercise and how fast you&apos;re
              moving, using the same MET method sports scientists use. Set a daily goal and watch it fill up, set
              after set.
            </p>
            <Link href="/progress" className="mt-6 inline-flex items-center gap-2 font-semibold text-ink underline-offset-4 hover:underline">
              See your progress <ArrowIcon className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* ---- How it works ------------------------------------------------------ */}
        <section id="how" aria-labelledby="how-title" className="mx-auto max-w-6xl scroll-mt-24 px-4 pt-24 sm:px-6">
          <p className="eyebrow text-amber-ink">How it works</p>
          <h2 id="how-title" className="font-display mt-2 text-4xl font-bold sm:text-5xl">
            Three steps. No equipment.
          </h2>
          <ol className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, body }, i) => (
              <li key={title} className="rounded-3xl border border-line bg-card p-6">
                <div className="flex items-center justify-between">
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-sand">
                    <Icon className="h-5 w-5 text-amber-ink" />
                  </span>
                  <span className="font-display text-4xl font-bold text-[#98826f]" aria-hidden>
                    0{i + 1}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ---- CTA ------------------------------------------------------------------ */}
        <section className="mx-auto max-w-6xl px-4 pt-24 pb-20 sm:px-6">
          <div className="relative overflow-hidden rounded-[2rem] bg-espresso px-6 py-12 text-cream sm:px-12">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-amber/30 blur-3xl" />
            <p className="eyebrow text-amber-bright">Move better. Burn smarter.</p>
            <h2 className="font-display mt-3 max-w-xl text-4xl leading-[1.02] font-bold sm:text-5xl">
              Your AI coach for {PRO_PLAN.priceLabel} a month
            </h2>
            <p className="mt-4 max-w-md text-muted-dark">
              Every exercise, live form feedback, calorie tracking and progress. Cancel anytime.
            </p>
            <Link
              href={isPro ? "#exercises" : "/pricing"}
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-cream px-7 py-4 font-semibold text-ink hover:bg-white"
            >
              {isPro ? "Start a workout" : "Get started"} <ArrowIcon className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
