import { useCallback } from "react";
import { useSoundPreference } from "@/components/yorha-provider";
import { playCue, type SoundCue } from "./sound";

/**
 * Returns `play(cue)`. Does nothing while the sound preference is off (the default).
 * Volume comes from the provider's `sound.volume`.
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
