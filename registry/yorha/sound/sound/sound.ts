// RED stub: compiles, renders no sound. Replaced in the GREEN commit.

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

export function playCue(_cue: SoundCue, _volume: number): void {}

export function resetSoundEngineForTests(): void {}

export { useSound } from "./use-sound";
