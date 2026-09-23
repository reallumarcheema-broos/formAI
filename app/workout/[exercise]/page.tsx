import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { WorkoutLoader } from "@/components/workout/WorkoutLoader";
import { canAccess, getProStatus } from "@/lib/billing/subscription";
import { getExercise } from "@/lib/exercises";

type Props = { params: Promise<{ exercise: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const exercise = getExercise((await params).exercise);
  return { title: exercise ? `${exercise.name} workout` : "Workout" };
}

export default async function WorkoutPage({ params }: Props) {
  const exercise = getExercise((await params).exercise);
  if (!exercise) notFound();

  // Pro exercises require an active subscription.
  if (!canAccess(exercise.tier, await getProStatus())) redirect(`/pricing?exercise=${exercise.id}`);

  return <WorkoutLoader exerciseId={exercise.id} />;
}
