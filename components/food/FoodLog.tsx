"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowIcon, CheckIcon, FlameIcon, ShieldIcon } from "@/components/icons";
import {
  addFood,
  deleteFood,
  foodForDay,
  loadFood,
  MEAL_LABELS,
  mealForTime,
  sumFood,
  type FoodEntry,
  type Meal,
} from "@/lib/fitness/food";

/** Quick picks for common foods; users can edit the calories before adding. */
const QUICK_ADD: { name: string; kcal: number }[] = [
  { name: "1 roti / chapati", kcal: 120 },
  { name: "1 plate biryani", kcal: 650 },
  { name: "1 bowl daal", kcal: 230 },
  { name: "1 cup chai with sugar", kcal: 90 },
  { name: "2 boiled eggs", kcal: 155 },
  { name: "1 banana", kcal: 105 },
];

/**
 * Manual food log: type what you ate and its calories. Everything is stored
 * in this browser only, and it feeds "calories in vs. out" on the Progress page.
 */
export function FoodLog() {
  const [log, setLog] = useState<FoodEntry[]>(loadFood);
  const [now] = useState(() => Date.now());
  const [name, setName] = useState("");
  const [kcal, setKcal] = useState("");
  const [meal, setMeal] = useState<Meal>(() => mealForTime(Date.now()));
  const [error, setError] = useState(false);
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const today = foodForDay(log, now);
  const total = sumFood(today).kcal;

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const n = Number.parseInt(kcal, 10);
    if (!name.trim() || !Number.isFinite(n) || n <= 0 || n > 5000) return setError(true);
    setLog(addFood({ eatenAt: Date.now(), meal, name: name.trim().slice(0, 80), kcal: n, protein_g: 0, carbs_g: 0, fat_g: 0 }));
    setJustAdded(`${n} kcal added to ${MEAL_LABELS[meal].toLowerCase()}.`);
    setName("");
    setKcal("");
    setError(false);
  };

  const input = "rounded-xl border border-line bg-cream px-3 py-2.5";
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-10 pb-20 sm:px-6">
      <p className="eyebrow text-amber-ink">Food log</p>
      <h1 className="font-display mt-2 text-5xl font-bold sm:text-6xl">What did you eat?</h1>
      <p className="mt-3 max-w-lg text-muted">
        Log your meals to see calories eaten vs. calories burned in your workouts.
      </p>

      {justAdded && (
        <p role="status" className="mt-6 flex items-center gap-2 rounded-2xl border border-emerald-700/30 bg-card p-4 text-sm font-medium">
          <CheckIcon className="h-5 w-5 text-emerald-800" /> {justAdded}
        </p>
      )}

      <section aria-labelledby="add-title" className="mt-8 rounded-[2rem] border border-line bg-card p-5 sm:p-6">
        <h2 id="add-title" className="text-lg font-semibold">
          Add food
        </h2>
        <form onSubmit={submit} className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-1 flex-col text-sm font-medium">
            Food
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 2 rotis with daal" className={`mt-1 min-w-48 ${input}`} />
          </label>
          <label className="flex flex-col text-sm font-medium">
            Calories
            <input value={kcal} onChange={(e) => setKcal(e.target.value)} inputMode="numeric" className={`mt-1 w-28 ${input}`} />
          </label>
          <label className="flex flex-col text-sm font-medium">
            Meal
            <select value={meal} onChange={(e) => setMeal(e.target.value as Meal)} className={`mt-1 ${input}`}>
              {(Object.keys(MEAL_LABELS) as Meal[]).map((m) => (
                <option key={m} value={m}>
                  {MEAL_LABELS[m]}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="rounded-full bg-espresso px-6 py-3 font-semibold text-cream hover:bg-espresso-2">
            Add
          </button>
          {error && <p className="w-full text-sm text-red-800">Enter a food name and calories between 1 and 5,000.</p>}
        </form>

        <p className="mt-5 text-sm font-medium">Quick add</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {QUICK_ADD.map((q) => (
            <button
              key={q.name}
              type="button"
              onClick={() => {
                setName(q.name);
                setKcal(String(q.kcal));
                setError(false);
              }}
              className="rounded-full border border-line px-3 py-1.5 text-sm hover:bg-sand"
            >
              {q.name} · {q.kcal}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">Quick-add calories are typical values. Adjust them to your portion before adding.</p>
      </section>

      <section aria-labelledby="today-title" className="mt-6 rounded-3xl border border-line bg-card p-5 sm:p-6">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="today-title" className="text-lg font-semibold">
            Eaten today
          </h2>
          <p className="flex items-center gap-1 font-semibold tabular-nums" data-testid="eaten-today">
            <FlameIcon className="h-4 w-4 text-amber-ink" /> {Math.round(total)} kcal
          </p>
        </div>
        {today.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Nothing logged yet today.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line" data-testid="food-log">
            {today.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{e.name}</p>
                  <p className="text-xs text-muted">
                    {MEAL_LABELS[e.meal]} · {new Date(e.eatenAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold tabular-nums">{Math.round(e.kcal)} kcal</p>
                  <button
                    onClick={() => setLog(deleteFood(e.id))}
                    aria-label={`Delete ${e.name}`}
                    className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-sand"
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <Link href="/progress" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline">
          Calories in vs. out on your Progress page <ArrowIcon className="h-4 w-4" />
        </Link>
      </section>

      <p className="mt-4 flex items-center gap-2 text-xs text-muted">
        <ShieldIcon className="h-4 w-4 text-amber-ink" /> Your food log is saved only on this device.
      </p>
    </main>
  );
}
