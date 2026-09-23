import Link from "next/link";
import type { ExerciseDefinition } from "@/lib/exercises";

interface Props {
  exercise: Pick<ExerciseDefinition, "id" | "name" | "tagline" | "icon">;
  locked: boolean;
}

export function ExerciseCard({ exercise, locked }: Props) {
  const href = locked ? `/pricing?exercise=${exercise.id}` : `/workout/${exercise.id}`;
  return (
    <Link
      href={href}
      data-testid={`exercise-${exercise.id}`}
      className="group relative flex items-center gap-4 rounded-2xl border border-white/10 bg-zinc-900/60 p-4 transition hover:border-accent/50 hover:bg-zinc-900 active:scale-[0.99]"
    >
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-white/5 text-3xl" aria-hidden>
        {exercise.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-semibold">{exercise.name}</span>
        <span className="block text-sm text-zinc-400">{exercise.tagline}</span>
      </span>
      <span className="shrink-0 text-sm font-medium text-zinc-300 group-hover:text-accent">
        {locked ? (
          <>
            <span aria-hidden>🔒 </span>Unlock
          </>
        ) : (
          "Start →"
        )}
      </span>
    </Link>
  );
}
