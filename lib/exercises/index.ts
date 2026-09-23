import { lunge } from "./lunge";
import { pushup } from "./pushup";
import { squat } from "./squat";
import type { ExerciseDefinition } from "./types";

/**
 * Every exercise the app offers, in display order.
 * To add one: create a file next to squat.ts and add it here.
 */
export const EXERCISES: ExerciseDefinition[] = [squat, pushup, lunge];

export function getExercise(id: string): ExerciseDefinition | undefined {
  return EXERCISES.find((e) => e.id === id);
}

export type { ExerciseDefinition } from "./types";
