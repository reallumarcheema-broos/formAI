import Link from "next/link";
import type { ExerciseDefinition } from "@/lib/exercises";

interface Props {
  exercise: Pick<ExerciseDefinition, "id" | "name" | "tagline" | "icon" | "tier">;
  locked: boolean;
}

export function ExerciseCard({ exercise, locked }: Props) {
  const href = locked ? `/pricing?exercise=${exercise.id}` : `/workout/${exercise.id}`;
  return (
    <Link
      href={href}
      className="group relative flex items-center gap-4 rounded-2xl border border-white/10 bg-zinc-900/60 p-4 transition hover:border-accent/50 hover:bg-zinc-900 active:scale-[0.99]"
    >
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-white/5 text-3xl" aria-hidden>
        {exercise.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-lg font-semibold">
          {exercise.name}
          {exercise.tier === "pro" && (
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold tracking-wide text-accent">
              PRO
            </span>
          )}
        </span>
        <span className="block text-sm text-zinc-400">{exercise.tagline}</span>
      </span>
      <span className="text-sm font-medium text-zinc-400 group-hover:text-accent">
        {locked ? "🔒 Unlock" : "Start →"}
      </span>
    </Link>
  );
}
