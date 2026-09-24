"use client";

import { useState } from "react";
import { DEFAULT_WEIGHT_KG } from "@/lib/fitness/calories";
import { LB_PER_KG, formatWeight, parseWeight, type Profile } from "@/lib/fitness/profile";

/**
 * Compact body-weight setting on the setup sheet. Weight drives the calorie
 * estimate; it's stored only in this browser.
 */
export function WeightSetting({ profile, onChange }: { profile: Profile; onChange: (p: Profile) => void }) {
  const [editing, setEditing] = useState(false);
  const [unit, setUnit] = useState(profile.unit);
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  const openEditor = () => {
    const kg = profile.weightKg ?? DEFAULT_WEIGHT_KG;
    setUnit(profile.unit);
    setValue(String(Math.round(profile.unit === "lb" ? kg * LB_PER_KG : kg)));
    setError(false);
    setEditing(true);
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const kg = parseWeight(value, unit);
    if (kg === null) return setError(true);
    onChange({ ...profile, weightKg: kg, unit });
    setEditing(false);
  };

  if (!editing) {
    return (
      <div className="mt-2 flex items-center justify-between gap-2 text-sm text-zinc-300">
        <span>
          <span aria-hidden>🔥 </span>
          Calories use your weight:{" "}
          <strong className="text-white" data-testid="weight-value">
            {profile.weightKg ? formatWeight(profile.weightKg, profile.unit) : "not set"}
          </strong>
        </span>
        <button onClick={openEditor} className="rounded-lg px-2 py-1 font-medium text-accent hover:bg-white/10">
          {profile.weightKg ? "Edit" : "Set weight"}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={save} className="mt-2 flex flex-wrap items-center gap-2 text-sm">
      <label htmlFor="weight-input" className="text-zinc-300">
        Your weight
      </label>
      <input
        id="weight-input"
        inputMode="decimal"
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-invalid={error}
        className="w-20 rounded-lg border border-white/20 bg-black/40 px-2 py-1.5 text-white tabular-nums"
      />
      <div role="group" aria-label="Unit" className="flex overflow-hidden rounded-lg border border-white/20">
        {(["kg", "lb"] as const).map((u) => (
          <button
            key={u}
            type="button"
            aria-pressed={unit === u}
            onClick={() => setUnit(u)}
            className={`px-2.5 py-1.5 ${unit === u ? "bg-white/20 text-white" : "text-zinc-300"}`}
          >
            {u}
          </button>
        ))}
      </div>
      <button type="submit" className="rounded-lg bg-accent px-3 py-1.5 font-semibold text-black">
        Save
      </button>
      {error && <p className="w-full text-xs text-red-300">Enter a weight between 20 and 350 kg (45–770 lb).</p>}
    </form>
  );
}
