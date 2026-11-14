// RED stub: play() does nothing. Replaced in the GREEN commit.
import type { SoundCue } from "./sound";

export function useSound() {
  return {
    play: (_cue: SoundCue) => {},
  };
}
