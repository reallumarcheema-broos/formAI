"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getExercise } from "@/lib/exercises";
import { ExerciseEngine, type EngineEvent } from "@/lib/exercises/engine";
import type { Facing } from "@/lib/pose/camera";
import type { JointName } from "@/lib/pose/landmarks";
import { checkBodyVisible, type PoseFrame } from "@/lib/pose/poseFrame";
import { VoiceCoach } from "@/lib/voice/voiceCoach";
import { CameraStage } from "./CameraStage";
import { SummaryView, type WorkoutSummary } from "./SummaryView";
import { useWakeLock } from "./useWakeLock";

type Stage = "setup" | "countdown" | "active" | "paused" | "summary";

interface Hud {
  reps: number;
  /** Required joints visible right now. */
  tracking: boolean;
  /** Body has been fully visible for a moment (setup check is green). */
  bodyReady: boolean;
  inPosition: boolean;
  missing: JointName[];
}

interface Feedback {
  text: string;
  tone: "good" | "warn";
  id: number;
}

/** Frames the body must stay visible before the setup check turns green (~0.5s). */
const BODY_READY_FRAMES = 15;
const FEEDBACK_MS = 2500;
const MUTE_KEY = "formai:muted";

const JOINT_LABELS: Record<JointName, string> = {
  shoulder: "shoulders",
  elbow: "elbows",
  wrist: "hands",
  hip: "hips",
  knee: "knees",
  ankle: "feet",
  foot: "feet",
};

function missingText(missing: JointName[]): string {
  const labels = [...new Set(missing.map((j) => JOINT_LABELS[j]))];
  if (!labels.length) return "Step into the frame";
  return `Can't see your ${labels.join(", ")}`;
}

export function WorkoutFlow({ exerciseId }: { exerciseId: string }) {
  const exercise = useMemo(() => getExercise(exerciseId)!, [exerciseId]);

  const [stage, setStage] = useState<Stage>("setup");
  const [facing, setFacing] = useState<Facing>("user");
  // This component only renders client-side (see WorkoutLoader), so reading storage here is safe.
  const [muted, setMuted] = useState(() => {
    try {
      return localStorage.getItem(MUTE_KEY) === "1";
    } catch {
      return false; // storage unavailable (private mode)
    }
  });
  const [countdown, setCountdown] = useState(3);
  const [hud, setHud] = useState<Hud>({ reps: 0, tracking: false, bodyReady: false, inPosition: true, missing: [] });
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [summary, setSummary] = useState<WorkoutSummary | null>(null);

  const stageRef = useRef<Stage>(stage);
  const engineRef = useRef<ExerciseEngine | null>(null);
  const voiceRef = useRef<VoiceCoach | null>(null);
  const hudRef = useRef(hud);
  const mutedRef = useRef(muted);
  const stableFramesRef = useRef(0);
  const lastFeedbackRef = useRef({ text: "", at: 0 });
  const activeMsRef = useRef(0);
  const activeSinceRef = useRef<number | null>(null);

  useWakeLock(stage !== "summary");

  // ---- setup: voice + engine ---------------------------------------------------
  useEffect(() => {
    const voice = new VoiceCoach();
    voice.setMuted(mutedRef.current);
    voiceRef.current = voice;
    engineRef.current = new ExerciseEngine(exercise);
    return () => voice.cancel();
  }, [exercise]);

  useEffect(() => {
    mutedRef.current = muted;
    voiceRef.current?.setMuted(muted);
    try {
      localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [muted]);

  // Track time spent actively exercising (excludes pauses).
  useEffect(() => {
    stageRef.current = stage;
    if (stage === "active") {
      activeSinceRef.current = performance.now();
    } else if (activeSinceRef.current !== null) {
      activeMsRef.current += performance.now() - activeSinceRef.current;
      activeSinceRef.current = null;
    }
  }, [stage]);

  // Auto-hide feedback.
  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback((f) => (f?.id === feedback.id ? null : f)), FEEDBACK_MS);
    return () => clearTimeout(t);
  }, [feedback]);

  // 3-2-1 countdown before the set.
  useEffect(() => {
    if (stage !== "countdown") return;
    voiceRef.current?.say(String(countdown), true);
    const t = setTimeout(() => {
      if (countdown > 1) return setCountdown(countdown - 1);
      voiceRef.current?.say("Go!", true);
      engineRef.current?.resetMotion();
      setStage("active");
    }, 900);
    return () => clearTimeout(t);
  }, [stage, countdown]);

  // ---- per-frame work --------------------------------------------------------
  const updateHud = useCallback((patch: Partial<Hud>) => {
    const prev = hudRef.current;
    const next = { ...prev, ...patch };
    const changed =
      next.reps !== prev.reps ||
      next.tracking !== prev.tracking ||
      next.bodyReady !== prev.bodyReady ||
      next.inPosition !== prev.inPosition ||
      next.missing.join() !== prev.missing.join();
    if (!changed) return;
    hudRef.current = next;
    setHud(next);
  }, []);

  const showFeedback = useCallback((text: string, tone: Feedback["tone"]) => {
    const now = performance.now();
    // Re-showing the same message every frame would thrash React; refresh at most once a second.
    if (lastFeedbackRef.current.text === text && now - lastFeedbackRef.current.at < 1000) return;
    lastFeedbackRef.current = { text, at: now };
    setFeedback({ text, tone, id: now });
  }, []);

  const handleEvents = useCallback(
    (events: EngineEvent[]) => {
      const voice = voiceRef.current;
      const rep = events.find((e) => e.type === "rep");
      if (rep) {
        voice?.sayRep(rep.count);
        if (!rep.issues.length) showFeedback("Good rep!", "good");
      }
      for (const e of events) {
        if (e.type !== "cue") continue;
        voice?.sayCue(e.rule.id, e.rule.speech ?? e.rule.message, { afterRep: Boolean(rep) });
        showFeedback(e.rule.message, "warn");
      }
    },
    [showFeedback],
  );

  const onFrame = useCallback(
    (frame: PoseFrame | null) => {
      const current = stageRef.current;
      const engine = engineRef.current;

      if (current === "active" && engine) {
        const { snapshot, events } = engine.process(frame);
        handleEvents(events);
        const body = checkBodyVisible(frame?.normalized ?? null, exercise.requiredJoints);
        updateHud({
          reps: snapshot.repCount,
          tracking: snapshot.tracking,
          inPosition: snapshot.inPosition,
          missing: body.missing,
        });
        // Keep a sustained issue on screen for as long as it lasts.
        if (snapshot.activeRules[0]) showFeedback(snapshot.activeRules[0].message, "warn");
        return snapshot.highlight;
      }

      // Setup / countdown / paused: just run the full-body check.
      const body = checkBodyVisible(frame?.normalized ?? null, exercise.requiredJoints);
      stableFramesRef.current = body.ok ? stableFramesRef.current + 1 : 0;
      updateHud({
        tracking: body.ok,
        bodyReady: stableFramesRef.current >= BODY_READY_FRAMES,
        missing: body.missing,
      });
    },
    [exercise, handleEvents, showFeedback, updateHud],
  );

  // ---- controls ---------------------------------------------------------------
  const start = () => {
    voiceRef.current?.unlock(); // iOS: speech must be primed inside a tap
    setCountdown(3);
    setStage("countdown");
  };
  const pause = () => {
    engineRef.current?.resetMotion();
    voiceRef.current?.cancel();
    setStage("paused");
  };
  const resume = () => {
    voiceRef.current?.unlock();
    engineRef.current?.resetMotion();
    setStage("active");
  };
  const end = () => {
    const engine = engineRef.current;
    if (!engine) return;
    voiceRef.current?.cancel();
    const elapsed = activeSinceRef.current !== null ? performance.now() - activeSinceRef.current : 0;
    setSummary({ ...engine.getStats(), exerciseName: exercise.name, durationMs: activeMsRef.current + elapsed });
    setStage("summary");
    const reps = engine.getStats().totalReps;
    voiceRef.current?.say(reps ? `Nice work. ${reps} rep${reps === 1 ? "" : "s"}.` : "Set ended.");
  };
  const restart = () => {
    engineRef.current = new ExerciseEngine(exercise);
    activeMsRef.current = 0;
    activeSinceRef.current = null;
    stableFramesRef.current = 0;
    hudRef.current = { reps: 0, tracking: false, bodyReady: false, inPosition: true, missing: [] };
    setHud(hudRef.current);
    setFeedback(null);
    setSummary(null);
    setStage("setup");
  };

  if (stage === "summary" && summary) {
    return <SummaryView summary={summary} onRestart={restart} />;
  }

  const inSet = stage === "active" || stage === "paused";

  return (
    <CameraStage facing={facing} onFrame={onFrame}>
      {/* Top bar */}
      <div className="safe-top absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 bg-gradient-to-b from-black/70 to-transparent px-3 pb-6">
        <Link
          href="/"
          aria-label="Back to exercises"
          className="grid h-11 w-11 place-items-center rounded-full bg-black/50 text-xl backdrop-blur hover:bg-black/70"
        >
          ←
        </Link>
        <p className="truncate text-base font-semibold">
          {exercise.icon} {exercise.name}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? "Unmute voice coach" : "Mute voice coach"}
            aria-pressed={muted}
            className="grid h-11 w-11 place-items-center rounded-full bg-black/50 text-lg backdrop-blur hover:bg-black/70"
          >
            {muted ? "🔇" : "🔊"}
          </button>
          <button
            onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
            aria-label="Switch camera"
            className="grid h-11 w-11 place-items-center rounded-full bg-black/50 text-lg backdrop-blur hover:bg-black/70"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Rep counter + feedback */}
      {inSet && (
        <div className="pointer-events-none absolute inset-x-0 top-20 z-10 flex flex-col items-center gap-3 px-4">
          <div className="rounded-3xl bg-black/55 px-8 py-2 text-center backdrop-blur">
            <p key={hud.reps} className="animate-pop text-8xl font-black leading-none tabular-nums" aria-live="polite">
              {hud.reps}
            </p>
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">reps</p>
          </div>
          {feedback && (
            <p
              key={feedback.id}
              role="status"
              className={`max-w-sm rounded-2xl px-5 py-3 text-center text-xl font-bold shadow-lg ${
                feedback.tone === "good" ? "bg-emerald-500 text-black" : "bg-amber-400 text-black"
              }`}
            >
              {feedback.text}
            </p>
          )}
          {stage === "active" && !hud.tracking && (
            <p className="rounded-2xl bg-red-500/90 px-4 py-2 text-center text-sm font-semibold">
              {missingText(hud.missing)} — step back so your whole body is in frame
            </p>
          )}
          {stage === "active" && hud.tracking && !hud.inPosition && exercise.positionHint && (
            <p className="rounded-2xl bg-sky-500/90 px-4 py-2 text-center text-sm font-semibold text-black">
              {exercise.positionHint}
            </p>
          )}
          {stage === "paused" && (
            <p className="rounded-2xl bg-white/90 px-4 py-2 text-sm font-bold text-black">Paused</p>
          )}
        </div>
      )}

      {/* Countdown */}
      {stage === "countdown" && (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
          <p key={countdown} className="animate-pop text-[10rem] font-black text-accent drop-shadow-lg">
            {countdown}
          </p>
        </div>
      )}

      {/* Setup sheet */}
      {stage === "setup" && (
        <div className="safe-bottom absolute inset-x-0 bottom-0 z-10 px-3">
          <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-zinc-950/90 p-5 backdrop-blur">
            <h1 className="text-xl font-bold">Get set up</h1>
            <ul className="mt-3 space-y-2 text-sm text-zinc-300">
              {exercise.setup.instructions.map((line) => (
                <li key={line} className="flex gap-2">
                  <span className="text-accent">•</span>
                  {line}
                </li>
              ))}
            </ul>
            <div
              className={`mt-4 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors ${
                hud.bodyReady ? "bg-emerald-500 text-black" : "bg-white/10 text-zinc-200"
              }`}
              aria-live="polite"
            >
              <span
                className={`h-3 w-3 shrink-0 rounded-full ${hud.bodyReady ? "bg-black" : "animate-pulse bg-amber-400"}`}
              />
              {hud.bodyReady ? "Full body detected — you're good to go" : `${missingText(hud.missing)}…`}
            </div>
            <button
              onClick={start}
              className={`mt-4 w-full rounded-2xl px-5 py-4 text-lg font-bold transition ${
                hud.bodyReady ? "bg-accent text-black hover:bg-accent-strong" : "bg-white/10 text-zinc-300 hover:bg-white/15"
              }`}
            >
              {hud.bodyReady ? "Start set" : "Start anyway"}
            </button>
          </div>
        </div>
      )}

      {/* Set controls */}
      {inSet && (
        <div className="safe-bottom absolute inset-x-0 bottom-0 z-10 flex justify-center gap-3 bg-gradient-to-t from-black/70 to-transparent px-4 pt-10">
          {stage === "active" ? (
            <button
              onClick={pause}
              className="min-w-32 rounded-2xl bg-white/15 px-6 py-4 text-lg font-bold backdrop-blur hover:bg-white/25"
            >
              Pause
            </button>
          ) : (
            <button
              onClick={resume}
              className="min-w-32 rounded-2xl bg-accent px-6 py-4 text-lg font-bold text-black hover:bg-accent-strong"
            >
              Resume
            </button>
          )}
          <button
            onClick={end}
            className="min-w-32 rounded-2xl bg-red-500 px-6 py-4 text-lg font-bold hover:bg-red-600"
          >
            End
          </button>
        </div>
      )}
    </CameraStage>
  );
}
