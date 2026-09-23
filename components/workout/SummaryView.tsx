import Link from "next/link";
import type { EngineStats } from "@/lib/exercises/engine";

export interface WorkoutSummary extends EngineStats {
  exerciseName: string;
  durationMs: number;
}

function formatDuration(ms: number): string {
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m ? `${m}m ${s.toString().padStart(2, "0")}s` : `${s}s`;
}

export function SummaryView({ summary, onRestart }: { summary: WorkoutSummary; onRestart: () => void }) {
  const { totalReps, goodReps, flaggedReps, partialReps, issues } = summary;
  const goodPct = totalReps ? Math.round((goodReps / totalReps) * 100) : 0;
  const topIssue = issues[0];

  return (
    <main className="safe-top safe-bottom mx-auto flex min-h-dvh w-full max-w-md flex-col px-4">
      <p className="pt-6 text-sm font-semibold uppercase tracking-wider text-zinc-400">Set complete</p>
      <h1 className="text-3xl font-bold">{summary.exerciseName}</h1>

      <div className="mt-6 rounded-3xl border border-white/10 bg-zinc-900/60 p-6 text-center">
        <p className="text-sm text-zinc-400">Total reps</p>
        <p className="text-7xl font-black tabular-nums text-accent">{totalReps}</p>
        <p className="mt-1 text-sm text-zinc-400">in {formatDuration(summary.durationMs)}</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <p className="text-xs text-emerald-300">Good form</p>
          <p className="text-3xl font-bold tabular-nums">{goodReps}</p>
        </div>
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-xs text-amber-300">Flagged</p>
          <p className="text-3xl font-bold tabular-nums">{flaggedReps}</p>
        </div>
      </div>

      {totalReps > 0 && (
        <div className="mt-4" aria-label={`${goodPct}% of reps with good form`}>
          <div className="flex h-2 overflow-hidden rounded-full bg-amber-500/60">
            <div className="bg-emerald-400" style={{ width: `${goodPct}%` }} />
          </div>
          <p className="mt-1 text-xs text-zinc-400">{goodPct}% clean reps</p>
        </div>
      )}

      <div className="mt-4 rounded-2xl border border-white/10 bg-zinc-900/60 p-4">
        <p className="text-xs text-zinc-400">Most common form issue</p>
        <p className="mt-1 text-lg font-semibold">
          {topIssue ? `“${topIssue.message}”` : totalReps ? "None — great set! 🎯" : "—"}
        </p>
        {topIssue && (
          <p className="text-sm text-zinc-400">
            {topIssue.count} time{topIssue.count === 1 ? "" : "s"}
          </p>
        )}
        {issues.length > 1 && (
          <ul className="mt-3 space-y-1 border-t border-white/5 pt-3 text-sm text-zinc-300">
            {issues.slice(1).map((i) => (
              <li key={i.ruleId} className="flex justify-between gap-2">
                <span>{i.message}</span>
                <span className="tabular-nums text-zinc-400">×{i.count}</span>
              </li>
            ))}
          </ul>
        )}
        {partialReps > 0 && (
          <p className="mt-3 text-xs text-zinc-400">
            {partialReps} partial rep{partialReps === 1 ? "" : "s"} didn&apos;t reach full depth and weren&apos;t counted.
          </p>
        )}
      </div>

      <div className="mt-auto flex flex-col gap-2 pt-8">
        <button
          onClick={onRestart}
          className="rounded-xl bg-accent px-5 py-4 text-lg font-semibold text-black hover:bg-accent-strong"
        >
          Do another set
        </button>
        <Link href="/" className="rounded-xl border border-white/15 px-5 py-4 text-center font-semibold hover:bg-white/5">
          Choose exercise
        </Link>
      </div>
    </main>
  );
}
