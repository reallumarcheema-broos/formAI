import Link from "next/link";
import type { ExerciseDefinition } from "@/lib/exercises";
import { ArrowIcon } from "./icons";

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
      className="group flex items-center gap-4 rounded-3xl border border-line bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-24px_rgba(28,22,19,0.5)] active:scale-[0.99] sm:p-5"
    >
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-sand text-3xl" aria-hidden>
        {exercise.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="font-display block text-2xl font-semibold leading-tight">{exercise.name}</span>
        <span className="block text-sm text-muted">{exercise.tagline}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-ink">
        {locked ? (
          <>
            <span aria-hidden>🔒</span> Unlock
          </>
        ) : (
          <>
            Start <ArrowIcon className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </>
        )}
      </span>
    </Link>
  );
}
