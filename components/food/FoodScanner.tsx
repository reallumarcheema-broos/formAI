"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { AlertIcon, ArrowIcon, CameraIcon, CheckIcon, FlameIcon, ShieldIcon } from "@/components/icons";
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
import type { FoodAnalysis, FoodApiError, FoodItem } from "@/lib/food/types";

/** Shrink the photo before upload: faster on mobile data, cheaper to analyse, same accuracy. */
const MAX_SIDE = 1024;

async function prepareImage(file: File): Promise<{ dataUrl: string; base64: string }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Couldn't read that image"));
      el.src = url;
    });
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
    return { dataUrl, base64: dataUrl.slice(dataUrl.indexOf(",") + 1) };
  } finally {
    URL.revokeObjectURL(url);
  }
}

const ERROR_TEXT: Record<FoodApiError, string> = {
  "not-configured": "Food scanning isn't set up on this site yet.",
  "not-subscribed": "Food scanning is part of FormAI Pro.",
  "rate-limited": "You've reached today's scan limit. Try again tomorrow, or add the food manually below.",
  "bad-image": "That photo couldn't be read. Try a JPG or PNG photo.",
  declined: "We couldn't analyse that photo. Try another one.",
  failed: "Something went wrong analysing the photo. Please try again.",
};

const PORTIONS = [0.5, 1, 1.5, 2] as const;
const portionLabel = (p: number) => (p === 0.5 ? "½" : p === 1.5 ? "1½" : String(p));

interface EditableItem extends FoodItem {
  key: number;
  factor: number;
}

type Status = "idle" | "analyzing" | "result" | "not-food" | "error";

export function FoodScanner() {
  const [status, setStatus] = useState<Status>("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [items, setItems] = useState<EditableItem[]>([]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [meal, setMeal] = useState<Meal>(() => mealForTime(Date.now()));
  const [log, setLog] = useState<FoodEntry[]>(loadFood);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  const [now] = useState(() => Date.now());
  const today = foodForDay(log, now);
  const todayTotals = sumFood(today);

  const scale = (it: EditableItem) => ({
    kcal: Math.round(it.kcal * it.factor),
    protein_g: Math.round(it.protein_g * it.factor),
    carbs_g: Math.round(it.carbs_g * it.factor),
    fat_g: Math.round(it.fat_g * it.factor),
  });
  const mealTotals = items.map(scale).reduce(
    (t, s) => ({ kcal: t.kcal + s.kcal, protein_g: t.protein_g + s.protein_g, carbs_g: t.carbs_g + s.carbs_g, fat_g: t.fat_g + s.fat_g }),
    { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setJustAdded(null);
    setStatus("analyzing");
    try {
      const { dataUrl, base64 } = await prepareImage(file);
      setPreview(dataUrl);
      const res = await fetch("/api/food/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mediaType: "image/jpeg" }),
      });
      const data = (await res.json().catch(() => ({ error: "failed" }))) as FoodAnalysis & { error?: FoodApiError };
      if (!res.ok || data.error) {
        setError(ERROR_TEXT[data.error ?? "failed"] ?? ERROR_TEXT.failed);
        setStatus("error");
        return;
      }
      if (!data.isFood) {
        setStatus("not-food");
        return;
      }
      setItems(data.items.map((it, i) => ({ ...it, key: i, factor: 1 })));
      setNotes(data.notes);
      setMeal(mealForTime(Date.now()));
      setStatus("result");
    } catch {
      setError(ERROR_TEXT["bad-image"]);
      setStatus("error");
    } finally {
      if (cameraRef.current) cameraRef.current.value = "";
      if (uploadRef.current) uploadRef.current.value = "";
    }
  };

  const reset = () => {
    setStatus("idle");
    setPreview(null);
    setItems([]);
    setNotes("");
    setError(null);
  };

  const addToLog = () => {
    const name = items.map((i) => i.name).join(", ");
    setLog(addFood({ eatenAt: Date.now(), meal, name, ...mealTotals, scanned: true }));
    setJustAdded(`${mealTotals.kcal} kcal added to ${MEAL_LABELS[meal].toLowerCase()}.`);
    reset();
  };

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-10 pb-20 sm:px-6">
      <p className="eyebrow text-amber-ink">AI food photo scanner</p>
      <h1 className="font-display mt-2 text-5xl font-bold sm:text-6xl">Snap your meal</h1>
      <p className="mt-3 max-w-lg text-muted">
        Take a photo of your plate and FormAI estimates the calories, protein, carbs and fat. It knows everyday dishes
        from biryani and daal to burgers and salads.
      </p>

      {justAdded && (
        <p role="status" className="mt-6 flex items-center gap-2 rounded-2xl border border-emerald-700/30 bg-card p-4 text-sm font-medium">
          <CheckIcon className="h-5 w-5 text-emerald-800" /> {justAdded}
        </p>
      )}

      {/* Hidden inputs: one opens the camera on phones, the other the photo library. */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        aria-label="Take a photo of your meal"
        data-testid="camera-input"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      <input
        ref={uploadRef}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label="Upload a photo of your meal"
        data-testid="upload-input"
        onChange={(e) => onFile(e.target.files?.[0])}
      />

      {status === "idle" || status === "error" || status === "not-food" ? (
        <section className="mt-8 rounded-[2rem] border-2 border-dashed border-sand-deep bg-card p-8 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-sand">
            <CameraIcon className="h-7 w-7 text-amber-ink" />
          </span>
          {status === "not-food" && (
            <p role="alert" className="mx-auto mt-4 max-w-sm text-sm font-medium text-amber-ink">
              We couldn&apos;t find food in that photo. Try a closer, well-lit shot of your plate.
            </p>
          )}
          {status === "error" && error && (
            <p role="alert" className="mx-auto mt-4 max-w-sm text-sm font-medium text-red-800">
              {error}
            </p>
          )}
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              onClick={() => cameraRef.current?.click()}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-espresso px-6 py-3.5 font-semibold text-cream hover:bg-espresso-2"
            >
              <CameraIcon className="h-5 w-5" /> Take a photo
            </button>
            <button
              onClick={() => uploadRef.current?.click()}
              className="rounded-full border border-line px-6 py-3.5 font-semibold hover:bg-sand"
            >
              Upload from gallery
            </button>
          </div>
          <p className="mx-auto mt-5 flex max-w-md items-start justify-center gap-2 text-left text-xs text-muted">
            <ShieldIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-ink" />
            Your photo is sent securely to our AI provider (Anthropic) only to estimate nutrition. FormAI doesn&apos;t
            store it.
          </p>
        </section>
      ) : status === "analyzing" ? (
        <section className="mt-8 overflow-hidden rounded-[2rem] border border-line bg-card" aria-busy>
          {/* eslint-disable-next-line @next/next/no-img-element -- local data-URL preview, nothing to optimise */}
          {preview && <img src={preview} alt="Your meal" className="max-h-80 w-full object-cover" />}
          <div className="flex items-center gap-3 p-6">
            <span className="h-6 w-6 animate-spin rounded-full border-[3px] border-sand-deep border-t-amber-ink" />
            <p className="font-medium">Analysing your meal…</p>
          </div>
        </section>
      ) : (
        <section className="mt-8 overflow-hidden rounded-[2rem] border border-line bg-card" data-testid="food-result">
          {/* eslint-disable-next-line @next/next/no-img-element -- local data-URL preview, nothing to optimise */}
          {preview && <img src={preview} alt="Your meal" className="max-h-72 w-full object-cover" />}
          <div className="p-5 sm:p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm text-muted">Estimated total</p>
                <p className="text-5xl font-semibold tabular-nums" data-testid="meal-kcal">
                  {mealTotals.kcal}
                  <span className="ml-1 text-lg font-medium text-muted">kcal</span>
                </p>
              </div>
              <p className="text-right text-sm whitespace-nowrap text-muted tabular-nums">
                P {mealTotals.protein_g}g · C {mealTotals.carbs_g}g · F {mealTotals.fat_g}g
              </p>
            </div>

            <ul className="mt-5 divide-y divide-line">
              {items.map((it) => {
                const s = scale(it);
                return (
                  <li key={it.key} className="py-4" data-testid="food-item">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{it.name}</p>
                        <p className="text-xs text-muted">
                          {it.portion} · ~{Math.round(it.grams * it.factor)} g
                          {it.confidence === "low" && (
                            <span className="ml-2 inline-flex items-center gap-1 text-amber-ink">
                              <AlertIcon className="h-3.5 w-3.5" /> rough estimate
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold tabular-nums">{s.kcal} kcal</p>
                        <p className="text-xs whitespace-nowrap text-muted tabular-nums">
                          P {s.protein_g} · C {s.carbs_g} · F {s.fat_g}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div role="group" aria-label={`Portion of ${it.name}`} className="flex overflow-hidden rounded-full border border-line text-sm">
                        {PORTIONS.map((p) => (
                          <button
                            key={p}
                            aria-pressed={it.factor === p}
                            onClick={() => setItems((all) => all.map((x) => (x.key === it.key ? { ...x, factor: p } : x)))}
                            className={`px-3 py-1.5 ${it.factor === p ? "bg-espresso text-cream" : "hover:bg-sand"}`}
                          >
                            ×{portionLabel(p)}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setItems((all) => all.filter((x) => x.key !== it.key))}
                        className="rounded-full px-3 py-1.5 text-sm font-medium text-muted hover:bg-sand"
                        aria-label={`Remove ${it.name}`}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            {notes && <p className="mt-2 text-xs text-muted">Note: {notes}</p>}

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="flex items-center gap-2 text-sm font-medium">
                Meal
                <select
                  value={meal}
                  onChange={(e) => setMeal(e.target.value as Meal)}
                  className="rounded-xl border border-line bg-cream px-3 py-2"
                >
                  {(Object.keys(MEAL_LABELS) as Meal[]).map((m) => (
                    <option key={m} value={m}>
                      {MEAL_LABELS[m]}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-1 gap-2 sm:justify-end">
                <button onClick={reset} className="rounded-full px-5 py-3 font-semibold hover:bg-sand">
                  Retake
                </button>
                <button
                  onClick={addToLog}
                  disabled={items.length === 0}
                  className="flex-1 rounded-full bg-espresso px-6 py-3 font-semibold text-cream hover:bg-espresso-2 disabled:opacity-40 sm:flex-none"
                >
                  Add to food log
                </button>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted">
              Estimates from a photo can be off by 20–30%, mostly because of hidden oil, ghee and sugar. Adjust the
              portion if it looks wrong.
            </p>
          </div>
        </section>
      )}

      <ManualAdd
        onAdd={(entry) => {
          setLog(addFood(entry));
          setJustAdded(`${entry.kcal} kcal added to ${MEAL_LABELS[entry.meal].toLowerCase()}.`);
        }}
      />

      {/* ---- Today's log ---- */}
      <section aria-labelledby="today-title" className="mt-8 rounded-3xl border border-line bg-card p-5 sm:p-6">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="today-title" className="text-lg font-semibold">
            Eaten today
          </h2>
          <p className="flex items-center gap-1 font-semibold tabular-nums" data-testid="eaten-today">
            <FlameIcon className="h-4 w-4 text-amber-ink" /> {Math.round(todayTotals.kcal)} kcal
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
                    {e.scanned ? " · 📸 scanned" : ""}
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
    </main>
  );
}

function ManualAdd({ onAdd }: { onAdd: (e: Omit<FoodEntry, "id">) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [kcal, setKcal] = useState("");
  const [meal, setMeal] = useState<Meal>(() => mealForTime(Date.now()));
  const [error, setError] = useState(false);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="mt-4 text-sm font-semibold text-ink underline-offset-4 hover:underline">
        + Add food manually
      </button>
    );
  }

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const n = Number.parseInt(kcal, 10);
    if (!name.trim() || !Number.isFinite(n) || n <= 0 || n > 5000) return setError(true);
    onAdd({ eatenAt: Date.now(), meal, name: name.trim().slice(0, 80), kcal: n, protein_g: 0, carbs_g: 0, fat_g: 0, scanned: false });
    setName("");
    setKcal("");
    setError(false);
    setOpen(false);
  };

  const input = "rounded-xl border border-line bg-cream px-3 py-2";
  return (
    <form onSubmit={submit} className="mt-4 flex flex-wrap items-end gap-3 rounded-3xl border border-line bg-card p-5">
      <label className="flex flex-col text-sm font-medium">
        Food
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 2 rotis" className={`mt-1 w-48 ${input}`} />
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
      <button type="submit" className="rounded-full bg-espresso px-5 py-2.5 font-semibold text-cream hover:bg-espresso-2">
        Add
      </button>
      {error && <p className="w-full text-sm text-red-800">Enter a food name and calories between 1 and 5,000.</p>}
    </form>
  );
}
