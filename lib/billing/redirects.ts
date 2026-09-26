import "server-only";
import { getExercise } from "@/lib/exercises";

/**
 * Where to send someone after they unlock Pro. Only known exercise ids (and
 * "food" for the food log) are accepted, so this can never become an open redirect.
 */
export function postPurchasePath(exerciseId: string | null | undefined): string {
  if (exerciseId === "food") return "/food";
  const exercise = exerciseId ? getExercise(exerciseId) : undefined;
  return exercise ? `/workout/${exercise.id}` : "/?welcome=1";
}
