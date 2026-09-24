import Link from "next/link";
import { AlertIcon, ArrowIcon, CheckIcon, FlameIcon } from "@/components/icons";
import type { EngineStats } from "@/lib/exercises/engine";
import { formScore } from "@/lib/fitness/history";

export interface WorkoutSummary extends EngineStats {
  exerciseName: string;
  durationMs: number;
  /** Estimated calories burned. */
  kcal: number;
  /** True when the default weight was used because the user hasn't set theirs. */
  weightIsDefault: boolean;
  /** Whether the set was saved to the local history. */
  saved: boolean;
}

function formatDuration(ms: number): string {
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m ? `${m}m ${s.toString().padStart(2, "0")}s` : `${s}s`;
}

export function SummaryView({ summary, onRestart }: { summary: WorkoutSummary; onRestart: () => void }) {
  const { totalReps, goodReps, flaggedReps, partialReps, issues } = summary;
  const score = formScore(goodReps, totalReps);
  const topIssue = issues[0];
  const kcal = summary.kcal < 10 ? summary.kcal.toFixed(1) : Math.round(summary.kcal).toString();

  return (
    <main className="safe-top safe-bottom mx-auto flex min-h-dvh w-full max-w-md flex-col bg-cream px-4">
      <p className="eyebrow pt-6 text-amber-ink">Set complete</p>
      <h1 className="font-display text-5xl font-bold">{summary.exerciseName}</h1>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-3xl bg-espresso p-5 text-cream">
          <p className="text-xs font-semibold tracking-wider text-muted-dark uppercase">Total reps</p>
          <p className="font-display text-7xl leading-none font-bold tabular-nums" data-testid="summary-reps">
            {totalReps}
          </p>
          <p className="mt-1 text-sm text-muted-dark">in {formatDuration(summary.durationMs)}</p>
        </div>
        <div className="rounded-3xl border border-line bg-card p-5">
          <p className="flex items-center gap-1 text-xs font-semibold tracking-wider text-muted uppercase">
            <FlameIcon className="h-4 w-4 text-amber-ink" /> Calories
          </p>
          <p className="font-display text-7xl leading-none font-bold tabular-nums" data-testid="summary-kcal">
            {kcal}
          </p>
          <p className="mt-1 text-sm text-muted">kcal (estimate)</p>
        </div>
      </div>

      <div className="mt-3 rounded-3xl border border-line bg-card p-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold tracking-wider text-muted uppercase">Form score</p>
            <p className="font-display text-5xl font-bold tabular-nums">{score === null ? "–" : `${score}%`}</p>
          </div>
          <div className="text-right text-sm">
            <p className="flex items-center justify-end gap-1 text-emerald-800">
              <CheckIcon className="h-4 w-4" /> {goodReps} good
            </p>
            <p className="flex items-center justify-end gap-1 text-amber-ink">
              <AlertIcon className="h-4 w-4" /> {flaggedReps} flagged
            </p>
          </div>
        </div>
        {totalReps > 0 && (
          <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-amber/50" aria-hidden>
            <div className="bg-emerald-600" style={{ width: `${score}%` }} />
          </div>
        )}
      </div>

      <div className="mt-3 rounded-3xl border border-line bg-card p-5">
        <p className="text-xs font-semibold tracking-wider text-muted uppercase">Most common form issue</p>
        <p className="mt-1 text-lg font-semibold">
          {topIssue ? `“${topIssue.message}”` : totalReps ? "None. Great set! 🎯" : "–"}
        </p>
        {topIssue && (
          <p className="text-sm text-muted">
            {topIssue.count} time{topIssue.count === 1 ? "" : "s"}
          </p>
        )}
        {issues.length > 1 && (
          <ul className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
            {issues.slice(1).map((i) => (
              <li key={i.ruleId} className="flex justify-between gap-2">
                <span>{i.message}</span>
                <span className="text-muted tabular-nums">×{i.count}</span>
              </li>
            ))}
          </ul>
        )}
        {partialReps > 0 && (
          <p className="mt-3 text-xs text-muted">
            {partialReps} partial rep{partialReps === 1 ? "" : "s"} didn&apos;t reach full depth and weren&apos;t counted.
          </p>
        )}
      </div>

      <p className="mt-3 text-xs text-muted">
        {summary.saved ? "Saved to your progress on this device. " : ""}
        {summary.weightIsDefault
          ? "Calories assume 70 kg. Set your weight on the setup screen for a better estimate."
          : "Calories are estimated from your weight, the exercise and your pace."}
      </p>

      <div className="mt-auto flex flex-col gap-2 pt-8">
        <button
          onClick={onRestart}
          className="rounded-full bg-espresso px-5 py-4 text-lg font-semibold text-cream hover:bg-espresso-2"
        >
          Do another set
        </button>
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/progress"
            className="flex items-center justify-center gap-1 rounded-full border border-line px-4 py-3.5 font-semibold hover:bg-sand"
          >
            Progress <ArrowIcon className="h-4 w-4" />
          </Link>
          <Link href="/" className="rounded-full border border-line px-4 py-3.5 text-center font-semibold hover:bg-sand">
            Exercises
          </Link>
        </div>
      </div>
    </main>
  );
}
