import { useCallback } from "react";
import { useSoundPreference } from "@/components/yorha-provider";
// Procedural WebAudio cues. No audio files: every sound is an oscillator or noise envelope.
// One AudioContext is created lazily on the first enabled play and shared afterwards.

export const SOUND_CUES = [
  "cursor-move",
  "select",
  "confirm",
  "cancel",
  "open",
  "close",
  "error",
  "typing-tick",
] as const;

export type SoundCue = (typeof SOUND_CUES)[number];

interface Tone {
  wave: OscillatorType;
  from: number;
  to: number;
  /** Start offset from the cue start, seconds. */
  at: number;
  dur: number;
  peak: number;
}

interface CueSpec {
  tones: readonly Tone[];
  noise?: { dur: number; peak: number };
}

const CUE_SPECS: Record<SoundCue, CueSpec> = {
  "cursor-move": { tones: [{ wave: "square", from: 1200, to: 1400, at: 0, dur: 0.025, peak: 0.04 }] },
  select: { tones: [{ wave: "triangle", from: 660, to: 880, at: 0, dur: 0.06, peak: 0.12 }] },
  confirm: {
    tones: [
      { wave: "triangle", from: 523, to: 523, at: 0, dur: 0.07, peak: 0.12 },
      { wave: "triangle", from: 784, to: 784, at: 0.07, dur: 0.12, peak: 0.12 },
    ],
  },
  cancel: { tones: [{ wave: "sawtooth", from: 440, to: 220, at: 0, dur: 0.12, peak: 0.05 }] },
  open: { tones: [{ wave: "sine", from: 300, to: 900, at: 0, dur: 0.18, peak: 0.12 }] },
  close: { tones: [{ wave: "sine", from: 900, to: 300, at: 0, dur: 0.14, peak: 0.1 }] },
  error: {
    tones: [
      { wave: "square", from: 150, to: 150, at: 0, dur: 0.1, peak: 0.07 },
      { wave: "square", from: 150, to: 120, at: 0.14, dur: 0.1, peak: 0.07 },
    ],
  },
  "typing-tick": { tones: [], noise: { dur: 0.012, peak: 0.05 } },
};

const MIN_LEVEL = 0.0001;
const NOTE_TAIL = 0.02;
const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

interface EngineState {
  ctx: AudioContext;
  master: GainNode;
  blurred: boolean;
  volume: number;
  listeners: Array<[keyof WindowEventMap, EventListener, AddEventListenerOptions | undefined]>;
}

let engine: EngineState | null = null;

function onBlur() {
  if (!engine) return;
  engine.blurred = true;
  engine.master.gain.value = 0;
}

function onFocus() {
  if (!engine) return;
  engine.blurred = false;
  engine.master.gain.value = engine.volume;
}

/** Creates the shared AudioContext on first use. Returns null when WebAudio is unavailable. */
function ensureEngine(): EngineState | null {
  if (engine) return engine;
  if (typeof window === "undefined") return null;
  const Ctor: typeof AudioContext | undefined =
    window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;

  const ctx = new Ctor();
  const master = ctx.createGain();
  master.connect(ctx.destination);
  engine = { ctx, master, blurred: false, volume: 0.5, listeners: [] };

  // Unlock: browsers keep a context suspended until a user gesture; resume on the first one.
  const unlock = () => {
    if (engine?.ctx.state === "suspended") void engine.ctx.resume();
  };
  const listeners: EngineState["listeners"] = [
    ["blur", onBlur, undefined],
    ["focus", onFocus, undefined],
    ["pointerdown", unlock, { once: true, passive: true }],
    ["keydown", unlock, { once: true }],
  ];
  for (const [type, fn, opts] of listeners) window.addEventListener(type, fn, opts);
  engine.listeners = listeners;
  return engine;
}

function scheduleTone(ctx: AudioContext, out: AudioNode, tone: Tone, t0: number) {
  const start = t0 + tone.at;
  const end = start + tone.dur;
  const osc = ctx.createOscillator();
  osc.type = tone.wave;
  osc.frequency.setValueAtTime(tone.from, start);
  osc.frequency.linearRampToValueAtTime(tone.to, end);
  const env = ctx.createGain();
  env.gain.setValueAtTime(MIN_LEVEL, start);
  env.gain.exponentialRampToValueAtTime(tone.peak, start + Math.min(0.005, tone.dur / 4));
  env.gain.exponentialRampToValueAtTime(MIN_LEVEL, end);
  osc.connect(env);
  env.connect(out);
  osc.start(start);
  osc.stop(end + NOTE_TAIL);
}

function scheduleNoise(ctx: AudioContext, out: AudioNode, dur: number, peak: number, t0: number) {
  const frames = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const env = ctx.createGain();
  env.gain.setValueAtTime(peak, t0);
  env.gain.exponentialRampToValueAtTime(MIN_LEVEL, t0 + dur);
  src.connect(env);
  env.connect(out);
  src.start(t0);
  src.stop(t0 + dur + NOTE_TAIL);
}

/**
 * Plays one cue at the given master volume (0..1). No-op without WebAudio.
 * Callers gate on the user's sound preference; this function does not check it.
 */
export function playCue(cue: SoundCue, volume: number): void {
  const e = ensureEngine();
  if (!e) return;
  e.volume = clamp01(volume);
  e.master.gain.value = e.blurred ? 0 : e.volume;
  if (e.ctx.state === "suspended") void e.ctx.resume();

  const spec = CUE_SPECS[cue];
  const t0 = e.ctx.currentTime;
  for (const tone of spec.tones) scheduleTone(e.ctx, e.master, tone, t0);
  if (spec.noise) scheduleNoise(e.ctx, e.master, spec.noise.dur, spec.noise.peak, t0);
}

/** Closes the shared context and removes window listeners. Test-only; not used by components. */
export function resetSoundEngineForTests(): void {
  if (!engine) return;
  if (typeof window !== "undefined") {
    for (const [type, fn, opts] of engine.listeners) window.removeEventListener(type, fn, opts);
  }
  engine = null;
}

/**
 * Returns `play(cue)`. Does nothing while the sound preference is off (the default).
 * Volume comes from the provider's `sound.volume`.
 * (Kept in this file so a consumer install puts everything in one lib file.)
 */
export function useSound() {
  const { enabled, volume } = useSoundPreference();
  const play = useCallback(
    (cue: SoundCue) => {
      if (!enabled) return;
      playCue(cue, volume);
    },
    [enabled, volume],
  );
  return { play };
}

/** Interaction kinds that may play a cue, mapped onto the existing procedural cues (no new sounds in v4). */
export const CUE_MAP = {
  "overlay-open": "open",
  "overlay-close": "close",
  toggle: "select",
  "kanban-lift": "select",
  "kanban-drop": "confirm",
  "kanban-cancel": "cancel",
  "kanban-limit": "error",
  "toast-info": "select",
  "toast-success": "confirm",
  "toast-warning": "error",
  "toast-error": "error",
  sort: "cursor-move",
} as const satisfies Record<string, SoundCue>;

export type CueKind = keyof typeof CUE_MAP;

/** Same cue within this window is dropped (a held key or a burst of updates must not machine-gun). */
export const CUE_THROTTLE_MS = 60;
const lastCue = new Map<SoundCue, number>();

/**
 * `useCue(kind)` returns a function that plays the cue mapped to `kind`. Off by default (sound preference),
 * throttled to one cue per 60 ms. Call it from user-event handlers only, never from effects reacting to
 * programmatic or controlled-value updates.
 */
export function useCue(kind: CueKind) {
  const { play } = useSound();
  return useCallback(() => {
    const cue: SoundCue = CUE_MAP[kind];
    const now = typeof performance === "undefined" ? Date.now() : performance.now();
    const last = lastCue.get(cue);
    if (last !== undefined && now - last < CUE_THROTTLE_MS) return;
    lastCue.set(cue, now);
    play(cue);
  }, [kind, play]);
}
