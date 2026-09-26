"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertIcon, ArrowIcon, ChartIcon, CheckIcon, FlameIcon, ShieldIcon } from "@/components/icons";
import { DEFAULT_WEIGHT_KG } from "@/lib/fitness/calories";
import {
  clearHistory,
  currentStreak,
  dailyTotals,
  dayKey,
  formScore,
  loadHistory,
  type WorkoutRecord,
} from "@/lib/fitness/history";
import { foodForDay, loadFood, sumFood } from "@/lib/fitness/food";
import { LB_PER_KG, formatWeight, loadProfile, parseWeight, saveProfile, type Profile } from "@/lib/fitness/profile";
import { CaloriesChart } from "./CaloriesChart";

function GoalRing({ value, goal }: { value: number; goal: number }) {
  const pct = Math.min(1, value / goal);
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 120 120" className="h-32 w-32 -rotate-90" aria-hidden>
      <circle cx="60" cy="60" r={r} stroke="rgb(255 255 255 / 0.14)" strokeWidth="10" fill="none" />
      <circle
        cx="60"
        cy="60"
        r={r}
        stroke="#e0a158"
        strokeWidth="10"
        fill="none"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct)}
      />
    </svg>
  );
}

const timeLabel = (ms: number) => {
  const today = dayKey(Date.now());
  const d = dayKey(ms);
  const time = new Date(ms).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (d === today) return `Today, ${time}`;
  return `${new Date(ms).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}, ${time}`;
};

/**
 * The calorie tracker: today's calories vs. goal, a 7-day chart, streak,
 * form score and recent sets. All data lives in this browser only.
 */
export function ProgressDashboard({ canTrain }: { canTrain: boolean }) {
  // Rendered client-only (see ProgressLoader), so storage can be read directly.
  const [history, setHistory] = useState<WorkoutRecord[]>(loadHistory);
  const [profile, setProfile] = useState<Profile>(loadProfile);
  const [editing, setEditing] = useState(false);
  const [now] = useState(() => Date.now());
  const [eatenToday] = useState(() => sumFood(foodForDay(loadFood(), Date.now())).kcal);

  const days = useMemo(() => dailyTotals(history, now, 7), [history, now]);
  const today = days[days.length - 1];
  const weekKcal = days.reduce((s, d) => s + d.kcal, 0);
  const weekReps = days.reduce((s, d) => s + d.reps, 0);
  const weekGood = days.reduce((s, d) => s + d.goodReps, 0);
  const score = formScore(weekGood, weekReps);
  const streak = currentStreak(history, now);
  const recent = [...history].sort((a, b) => b.endedAt - a.endedAt).slice(0, 8);
  const goalLeft = Math.max(0, profile.dailyGoalKcal - today.kcal);

  const updateProfile = (next: Profile) => {
    setProfile(next);
    saveProfile(next);
  };

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-10 pb-20 sm:px-6">
      <p className="eyebrow text-amber-ink">AI camera calorie tracker</p>
      <h1 className="font-display mt-2 text-5xl font-bold sm:text-6xl">Your progress</h1>
      <p className="mt-2 flex items-center gap-2 text-sm text-muted">
        <ShieldIcon className="h-4 w-4 text-amber-ink" /> Saved only on this device. Nothing is uploaded.
      </p>

      {/* ---- Headline tiles ---- */}
      <section aria-label="Summary" className="mt-8 grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr]">
        <div className="flex items-center gap-6 rounded-3xl bg-espresso p-6 text-cream">
          <div className="relative">
            <GoalRing value={today.kcal} goal={profile.dailyGoalKcal} />
            <FlameIcon className="absolute inset-0 m-auto h-7 w-7 text-amber-bright" />
          </div>
          <div>
            <p className="text-sm text-muted-dark">Calories burned today</p>
            <p className="text-5xl font-semibold tabular-nums" data-testid="today-kcal">
              {Math.round(today.kcal)}
              <span className="ml-1 text-lg font-medium text-muted-dark">kcal</span>
            </p>
            <p className="mt-1 text-sm text-muted-dark">
              {goalLeft > 0 ? `${Math.round(goalLeft)} kcal to your ${profile.dailyGoalKcal} kcal goal` : "Daily goal reached 🎉"}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:col-span-2 lg:grid-cols-3">
          <div className="rounded-3xl border border-line bg-card p-5">
            <p className="text-sm text-muted">This week</p>
            <p className="text-3xl font-semibold tabular-nums" data-testid="week-kcal">
              {Math.round(weekKcal).toLocaleString("en-US")}
              <span className="ml-1 text-base font-medium text-muted">kcal</span>
            </p>
            <p className="text-xs text-muted">{weekReps} reps</p>
          </div>
          <div className="rounded-3xl border border-line bg-card p-5">
            <p className="text-sm text-muted">Form score</p>
            <p className="text-3xl font-semibold tabular-nums" data-testid="form-score">
              {score === null ? "–" : `${score}%`}
            </p>
            <p className="text-xs text-muted">good reps, last 7 days</p>
          </div>
          <div className="col-span-2 rounded-3xl border border-line bg-card p-5 lg:col-span-1">
            <p className="text-sm text-muted">Streak</p>
            <p className="text-3xl font-semibold tabular-nums" data-testid="streak">
              {streak}
              <span className="ml-1 text-base font-medium text-muted">day{streak === 1 ? "" : "s"}</span>
            </p>
            <p className="text-xs text-muted">in a row with a workout</p>
          </div>
        </div>
      </section>

      {/* ---- Calories in vs. out ---- */}
      <section aria-label="Calories in and out today" className="mt-3 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-line bg-card p-5">
        <div className="flex flex-wrap gap-x-8 gap-y-2">
          <div>
            <p className="text-sm text-muted">Eaten today</p>
            <p className="text-2xl font-semibold tabular-nums" data-testid="progress-eaten">
              {Math.round(eatenToday)} <span className="text-sm font-medium text-muted">kcal</span>
            </p>
          </div>
          <div>
            <p className="text-sm text-muted">Burned in workouts</p>
            <p className="text-2xl font-semibold tabular-nums">
              {Math.round(today.kcal)} <span className="text-sm font-medium text-muted">kcal</span>
            </p>
          </div>
          <div>
            <p className="text-sm text-muted">Net (eaten − burned)</p>
            <p className="text-2xl font-semibold tabular-nums" data-testid="progress-net">
              {Math.round(eatenToday - today.kcal)} <span className="text-sm font-medium text-muted">kcal</span>
            </p>
          </div>
        </div>
        <Link
          href={canTrain ? "/food" : "/pricing?exercise=food"}
          className="inline-flex items-center gap-2 rounded-full bg-sand px-5 py-2.5 font-semibold hover:bg-sand-deep"
        >
          🍽️ Log food
        </Link>
      </section>

      {history.length === 0 ? (
        <section className="mt-6 rounded-3xl border border-dashed border-sand-deep bg-card p-10 text-center">
          <ChartIcon className="mx-auto h-8 w-8 text-amber-ink" />
          <h2 className="mt-3 text-xl font-semibold">No workouts yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            Finish a set and your calories, reps and form score will show up here.
          </p>
          <Link
            href={canTrain ? "/#exercises" : "/pricing"}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-espresso px-6 py-3 font-semibold text-cream hover:bg-espresso-2"
          >
            {canTrain ? "Start a workout" : "Get FormAI Pro"} <ArrowIcon className="h-4 w-4" />
          </Link>
        </section>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr] lg:items-start">
          <CaloriesChart days={days} goal={profile.dailyGoalKcal} />

          <section aria-labelledby="recent-title" className="rounded-3xl border border-line bg-card p-5 sm:p-6">
            <h2 id="recent-title" className="text-lg font-semibold">
              Recent sets
            </h2>
            <ul className="mt-3 divide-y divide-line" data-testid="recent-sets">
              {recent.map((r) => {
                const s = formScore(r.goodReps, r.reps);
                return (
                  <li key={r.id} className="py-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="font-semibold">{r.exerciseName}</p>
                      <p className="text-sm font-semibold tabular-nums">{Math.round(r.kcal * 10) / 10} kcal</p>
                    </div>
                    <div className="flex items-baseline justify-between gap-2 text-xs text-muted">
                      <p>{timeLabel(r.endedAt)}</p>
                      <p className="tabular-nums">
                        {r.reps} reps{s !== null ? ` · ${s}% good form` : ""}
                      </p>
                    </div>
                    {r.topIssue ? (
                      <p className="mt-1 flex items-center gap-1 text-xs text-amber-ink">
                        <AlertIcon className="h-3.5 w-3.5" /> {r.topIssue}
                      </p>
                    ) : r.reps > 0 ? (
                      <p className="mt-1 flex items-center gap-1 text-xs text-emerald-800">
                        <CheckIcon className="h-3.5 w-3.5" /> Clean set
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      )}

      {/* ---- Settings ---- */}
      <section aria-labelledby="settings-title" className="mt-6 rounded-3xl border border-line bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="settings-title" className="text-lg font-semibold">
              Calorie settings
            </h2>
            <p className="text-sm text-muted">
              Weight:{" "}
              <strong className="text-ink" data-testid="settings-weight">
                {profile.weightKg ? formatWeight(profile.weightKg, profile.unit) : `not set (using ${DEFAULT_WEIGHT_KG} kg)`}
              </strong>{" "}
              · Daily goal: <strong className="text-ink">{profile.dailyGoalKcal} kcal</strong>
            </p>
          </div>
          {!editing && (
            <button onClick={() => setEditing(true)} className="rounded-full bg-sand px-5 py-2.5 font-semibold hover:bg-sand-deep">
              Edit
            </button>
          )}
        </div>
        {editing && (
          <SettingsForm
            profile={profile}
            onCancel={() => setEditing(false)}
            onSave={(p) => {
              updateProfile(p);
              setEditing(false);
            }}
          />
        )}
        {history.length > 0 && (
          <button
            onClick={() => {
              if (window.confirm("Delete all workout history on this device? This can't be undone.")) {
                clearHistory();
                setHistory([]);
              }
            }}
            className="mt-4 text-sm font-medium text-red-800 underline-offset-4 hover:underline"
          >
            Clear workout history
          </button>
        )}
      </section>
    </main>
  );
}

function SettingsForm({
  profile,
  onSave,
  onCancel,
}: {
  profile: Profile;
  onSave: (p: Profile) => void;
  onCancel: () => void;
}) {
  const kg = profile.weightKg ?? DEFAULT_WEIGHT_KG;
  const [unit, setUnit] = useState(profile.unit);
  const [weight, setWeight] = useState(String(Math.round(profile.unit === "lb" ? kg * LB_PER_KG : kg)));
  const [goal, setGoal] = useState(String(profile.dailyGoalKcal));
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const weightKg = parseWeight(weight, unit);
    const goalKcal = Number.parseInt(goal, 10);
    if (weightKg === null) return setError("Enter a weight between 20 and 350 kg (45–770 lb).");
    if (!Number.isFinite(goalKcal) || goalKcal < 50 || goalKcal > 5000) return setError("Enter a goal between 50 and 5,000 kcal.");
    onSave({ weightKg, unit, dailyGoalKcal: goalKcal });
  };

  const input = "w-28 rounded-xl border border-line bg-cream px-3 py-2 tabular-nums";
  return (
    <form onSubmit={submit} className="mt-4 flex flex-wrap items-end gap-4">
      <div>
        <label htmlFor="settings-weight-input" className="block text-sm font-medium">
          Weight
        </label>
        <div className="mt-1 flex gap-2">
          <input id="settings-weight-input" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} className={input} />
          <div role="group" aria-label="Unit" className="flex overflow-hidden rounded-xl border border-line">
            {(["kg", "lb"] as const).map((u) => (
              <button
                key={u}
                type="button"
                aria-pressed={unit === u}
                onClick={() => setUnit(u)}
                className={`px-3 py-2 text-sm ${unit === u ? "bg-espresso text-cream" : "bg-cream"}`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div>
        <label htmlFor="settings-goal-input" className="block text-sm font-medium">
          Daily goal (kcal)
        </label>
        <input id="settings-goal-input" inputMode="numeric" value={goal} onChange={(e) => setGoal(e.target.value)} className={`mt-1 ${input}`} />
      </div>
      <div className="flex gap-2">
        <button type="submit" className="rounded-full bg-espresso px-5 py-2.5 font-semibold text-cream hover:bg-espresso-2">
          Save
        </button>
        <button type="button" onClick={onCancel} className="rounded-full px-4 py-2.5 font-semibold hover:bg-sand">
          Cancel
        </button>
      </div>
      {error && (
        <p role="alert" className="w-full text-sm text-red-800">
          {error}
        </p>
      )}
    </form>
  );
}
