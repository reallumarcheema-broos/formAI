"use client";

import { useState } from "react";
import type { DayTotals } from "@/lib/fitness/history";

/** Bar color: the brand amber, one step darker so marks clear 3:1 on the card surface. */
const BAR = "#b06d24";

function niceMax(value: number): number {
  const steps = [50, 100, 150, 200, 250, 300, 400, 500, 750, 1000, 1500, 2000, 3000, 5000];
  return steps.find((s) => s >= value) ?? Math.ceil(value / 1000) * 1000;
}

const weekday = (ms: number) => new Date(ms).toLocaleDateString("en-US", { weekday: "short" });
const longDate = (ms: number) => new Date(ms).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

/**
 * Calories burned per day (single series, so no legend: the title names it).
 * Columns grow from one baseline with 4px rounded caps, a hairline goal
 * reference line, a hover/focus tooltip per column, and a table for screen readers.
 */
export function CaloriesChart({ days, goal }: { days: DayTotals[]; goal: number }) {
  const [active, setActive] = useState<number | null>(null);
  const max = niceMax(Math.max(goal, ...days.map((d) => d.kcal), 1));
  const ticks = [0, max / 2, max];
  const goalPct = (goal / max) * 100;
  const lastIndex = days.length - 1;

  return (
    <figure className="rounded-3xl border border-line bg-card p-5 sm:p-6">
      <figcaption>
        <h2 className="text-lg font-semibold">Calories burned, last 7 days</h2>
        <p className="text-sm text-muted">Estimated from your camera-tracked workouts. Daily goal: {goal} kcal.</p>
      </figcaption>

      <div className="mt-6 flex gap-3">
        {/* Y axis */}
        <div className="relative w-10 shrink-0 text-right text-xs text-muted tabular-nums" aria-hidden>
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 translate-y-1/2" style={{ bottom: `${(t / max) * 100}%` }}>
              {Math.round(t).toLocaleString("en-US")}
            </span>
          ))}
        </div>

        <div className="relative h-52 flex-1">
          {/* Recessive hairline grid */}
          {ticks.map((t) => (
            <div key={t} className="absolute inset-x-0 border-t border-line" style={{ bottom: `${(t / max) * 100}%` }} aria-hidden />
          ))}
          {/* Goal reference line */}
          <div className="absolute inset-x-0 z-10 border-t border-ink/60" style={{ bottom: `${goalPct}%` }} aria-hidden>
            <span className="absolute -top-5 right-0 rounded bg-card px-1 text-[11px] font-medium text-ink">Goal</span>
          </div>

          <div className="absolute inset-0 flex items-end justify-around gap-[2px]">
            {days.map((d, i) => {
              const pct = (d.kcal / max) * 100;
              const isActive = active === i;
              return (
                <button
                  type="button"
                  key={d.day}
                  aria-label={`${longDate(d.start)}: ${Math.round(d.kcal)} kcal, ${d.sessions} set${d.sessions === 1 ? "" : "s"}, ${d.reps} reps`}
                  className="relative flex h-full flex-1 cursor-default items-end justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  data-testid={`bar-${i}`}
                >
                  {/* Value on the cap for today only: selective labelling. */}
                  {i === lastIndex && d.kcal > 0 && !isActive && (
                    <span
                      aria-hidden
                      className="absolute z-20 text-xs font-semibold text-ink tabular-nums"
                      style={{ bottom: `calc(${Math.min(pct, 88)}% + 6px)` }}
                    >
                      {Math.round(d.kcal)}
                    </span>
                  )}
                  <span
                    aria-hidden
                    className="block w-full max-w-6 rounded-t-[4px] transition-opacity"
                    style={{ height: `${Math.max(pct, d.kcal > 0 ? 1.5 : 0)}%`, background: BAR, opacity: active === null || isActive ? 1 : 0.55 }}
                  />
                  {isActive && (
                    <span
                      aria-hidden
                      data-testid="chart-tooltip"
                      className="absolute z-30 block w-36 -translate-x-1/2 rounded-xl bg-espresso px-3 py-2 text-left text-xs text-cream shadow-lg"
                      style={{ bottom: `calc(${Math.min(pct, 70)}% + 10px)`, left: "50%" }}
                    >
                      <span className="block font-semibold">{longDate(d.start)}</span>
                      <span className="mt-1 block tabular-nums">{Math.round(d.kcal)} kcal</span>
                      <span className="block text-muted-dark tabular-nums">
                        {d.sessions} set{d.sessions === 1 ? "" : "s"} · {d.reps} reps
                      </span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* X axis */}
      <div className="mt-2 flex gap-3" aria-hidden>
        <div className="w-10 shrink-0" />
        <div className="flex flex-1 justify-around text-xs text-muted">
          {days.map((d, i) => (
            <span key={d.day} className={`flex-1 text-center ${i === lastIndex ? "font-semibold text-ink" : ""}`}>
              {i === lastIndex ? "Today" : weekday(d.start)}
            </span>
          ))}
        </div>
      </div>

      <table className="sr-only">
        <caption>Calories burned per day, last 7 days</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Calories (kcal)</th>
            <th scope="col">Sets</th>
            <th scope="col">Reps</th>
          </tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d.day}>
              <th scope="row">{longDate(d.start)}</th>
              <td>{Math.round(d.kcal)}</td>
              <td>{d.sessions}</td>
              <td>{d.reps}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
