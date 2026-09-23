import { numberToWords } from "./numberWords";

/** The same cue is spoken at most once per this window. */
const CUE_COOLDOWN_MS = 4000;
/** Minimum gap between any two form cues so they don't pile up. */
const GLOBAL_CUE_GAP_MS = 1500;

/**
 * Speaks rep counts and form cues through the Web Speech API.
 *
 * - Rep counts are high priority: they interrupt whatever is being said, so
 *   the count always lines up with the rep.
 * - Form cues are rate-limited per cue (4s) and globally, and are dropped
 *   rather than queued if something else is still being spoken.
 *
 * iOS Safari only allows speech that starts inside a user gesture, so call
 * `unlock()` from a tap handler (e.g. the Start button) before the set.
 */
export class VoiceCoach {
  private muted = false;
  private lastSpokenAt = new Map<string, number>();
  private lastCueAt = 0;
  private voice: SpeechSynthesisVoice | null = null;

  constructor() {
    if (!VoiceCoach.isSupported()) return;
    this.pickVoice();
    // Chrome loads voices asynchronously.
    window.speechSynthesis.addEventListener?.("voiceschanged", () => this.pickVoice());
  }

  static isSupported(): boolean {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) this.cancel();
  }

  /** Must be called from a user gesture on iOS to enable later speech. */
  unlock(): void {
    if (!VoiceCoach.isSupported()) return;
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    window.speechSynthesis.speak(u);
  }

  sayRep(count: number): void {
    this.speak(numberToWords(count), { interrupt: true });
  }

  /**
   * Speak a form cue, respecting the per-cue cooldown. Returns whether it was spoken.
   * `afterRep` queues it right behind a rep count just spoken ("Four… go a bit lower")
   * instead of dropping it because speech is in progress.
   */
  sayCue(key: string, text: string, { afterRep = false } = {}): boolean {
    const now = Date.now();
    const last = this.lastSpokenAt.get(key) ?? 0;
    if (now - last < CUE_COOLDOWN_MS) return false;
    if (!afterRep) {
      if (now - this.lastCueAt < GLOBAL_CUE_GAP_MS) return false;
      if (VoiceCoach.isSupported() && window.speechSynthesis.speaking) return false;
    }
    this.lastSpokenAt.set(key, now);
    this.lastCueAt = now;
    this.speak(text);
    return true;
  }

  /** One-off announcement (e.g. "Let's go"). */
  say(text: string, interrupt = false): void {
    this.speak(text, { interrupt });
  }

  cancel(): void {
    if (VoiceCoach.isSupported()) window.speechSynthesis.cancel();
  }

  private speak(text: string, { interrupt = false } = {}): void {
    if (this.muted || !VoiceCoach.isSupported()) return;
    const synth = window.speechSynthesis;
    if (interrupt) synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (this.voice) u.voice = this.voice;
    u.lang = this.voice?.lang ?? "en-US";
    u.rate = 1.05;
    u.pitch = 1;
    u.volume = 1;
    synth.speak(u);
  }

  private pickVoice(): void {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return;
    const english = voices.filter((v) => v.lang?.toLowerCase().startsWith("en"));
    // Prefer higher-quality local voices when the platform labels them.
    this.voice =
      english.find((v) => /natural|enhanced|premium|samantha|google us english/i.test(v.name)) ??
      english.find((v) => v.localService) ??
      english[0] ??
      null;
  }
}
