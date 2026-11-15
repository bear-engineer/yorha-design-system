"use client";

import { CSPProvider } from "@base-ui/react/csp-provider";
import { DirectionProvider } from "@base-ui/react/direction-provider";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

/** Flash-rate ceiling (Hz) every animated component must respect (WCAG 2.3.1). */
export const MAX_FLASH_HZ = 3;

export type Theme = "light" | "dark" | "authentic" | "high-contrast";
export type Motion = "full" | "reduced" | "off";
export type Density = "default" | "compact" | "comfortable";

export const MOTION_STORAGE_KEY = "yorha:motion";
export const SOUND_STORAGE_KEY = "yorha:sound";
const MOTIONS: readonly Motion[] = ["full", "reduced", "off"];
const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

export interface SoundPreferenceDefaults {
  enabled?: boolean;
  /** 0..1 */
  volume?: number;
}

export interface YorhaProviderProps {
  /** Initial theme; later changes to the prop are applied too. Default `light`. */
  theme?: Theme;
  /** Initial motion. Without it: saved choice, then `prefers-reduced-motion`, then `full`. */
  motion?: Motion;
  /** Initial density. Default `default`. */
  density?: Density;
  /** Initial sound preference (state only; the sound engine reads it). Default off. */
  sound?: SoundPreferenceDefaults;
  /** Reading direction for Base UI components (DirectionProvider). Default `ltr`. */
  direction?: "ltr" | "rtl";
  /** CSP nonce for inline <style>/<script> that Base UI emits (CSPProvider). */
  nonce?: string;
  children?: ReactNode;
}

interface YorhaContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  motion: Motion;
  setMotion: (motion: Motion) => void;
  density: Density;
  setDensity: (density: Density) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  soundVolume: number;
  setSoundVolume: (volume: number) => void;
}

const YorhaContext = createContext<YorhaContextValue | null>(null);

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);
const isMotion = (v: unknown): v is Motion => MOTIONS.includes(v as Motion);

function readStoredMotion(): Motion | null {
  try {
    const v = window.localStorage.getItem(MOTION_STORAGE_KEY);
    return isMotion(v) ? v : null;
  } catch {
    return null;
  }
}

function systemMotion(): Motion {
  return typeof window.matchMedia === "function" && window.matchMedia(REDUCED_QUERY).matches ? "reduced" : "full";
}

/** Writes `data-<name>` on <html> and restores the previous value on cleanup. */
function useRootAttribute(name: string, value: string) {
  useEffect(() => {
    const el = document.documentElement;
    const previous = el.getAttribute(name);
    el.setAttribute(name, value);
    return () => {
      if (previous === null) el.removeAttribute(name);
      else el.setAttribute(name, previous);
    };
  }, [name, value]);
}

export function YorhaProvider({
  theme: themeProp,
  motion: motionProp,
  density: densityProp,
  sound,
  direction = "ltr",
  nonce,
  children,
}: YorhaProviderProps) {
  const [theme, setTheme] = useState<Theme>(themeProp ?? "light");
  const [density, setDensity] = useState<Density>(densityProp ?? "default");
  // Initial state is server-safe ("full"); the real preference is resolved in an effect.
  const [motion, setMotionState] = useState<Motion>(motionProp ?? "full");
  const [soundEnabled, setSoundEnabledState] = useState(sound?.enabled ?? false);
  const [soundVolume, setSoundVolumeState] = useState(clamp01(sound?.volume ?? 0.5));
  const soundRef = useRef({ enabled: sound?.enabled ?? false, volume: clamp01(sound?.volume ?? 0.5) });
  const soundGiven = sound !== undefined;

  // Saved sound choice (yorha:sound) applies unless the `sound` prop sets it explicitly. Off by default.
  useEffect(() => {
    if (soundGiven) return;
    try {
      const saved = JSON.parse(window.localStorage.getItem(SOUND_STORAGE_KEY) ?? "null") as { enabled?: unknown; volume?: unknown } | null;
      if (!saved) return;
      if (typeof saved.enabled === "boolean") {
        soundRef.current.enabled = saved.enabled;
        setSoundEnabledState(saved.enabled);
      }
      if (typeof saved.volume === "number") {
        soundRef.current.volume = clamp01(saved.volume);
        setSoundVolumeState(soundRef.current.volume);
      }
    } catch {
      /* storage unavailable or malformed: keep the defaults */
    }
  }, [soundGiven]);
  const saveSound = useCallback(() => {
    try {
      window.localStorage.setItem(SOUND_STORAGE_KEY, JSON.stringify(soundRef.current));
    } catch {
      /* in-memory only */
    }
  }, []);
  const setSoundEnabled = useCallback(
    (enabled: boolean) => {
      soundRef.current.enabled = enabled;
      setSoundEnabledState(enabled);
      saveSound();
    },
    [saveSound],
  );

  useEffect(() => {
    if (themeProp) setTheme(themeProp);
  }, [themeProp]);
  useEffect(() => {
    if (densityProp) setDensity(densityProp);
  }, [densityProp]);

  useEffect(() => {
    if (motionProp) {
      setMotionState(motionProp);
      return;
    }
    setMotionState(readStoredMotion() ?? systemMotion());
    const mql = typeof window.matchMedia === "function" ? window.matchMedia(REDUCED_QUERY) : null;
    if (!mql) return;
    const onChange = () => {
      if (!readStoredMotion()) setMotionState(systemMotion());
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [motionProp]);

  const setMotion = useCallback((next: Motion) => {
    setMotionState(next);
    try {
      window.localStorage.setItem(MOTION_STORAGE_KEY, next);
    } catch {
      /* storage unavailable: keep the in-memory choice */
    }
  }, []);
  const setSoundVolume = useCallback(
    (v: number) => {
      soundRef.current.volume = clamp01(v);
      setSoundVolumeState(soundRef.current.volume);
      saveSound();
    },
    [saveSound],
  );

  useRootAttribute("data-theme", theme);
  useRootAttribute("data-motion", motion);
  useRootAttribute("data-density", density);

  const value = useMemo<YorhaContextValue>(
    () => ({ theme, setTheme, motion, setMotion, density, setDensity, soundEnabled, setSoundEnabled, soundVolume, setSoundVolume }),
    [theme, motion, setMotion, density, soundEnabled, setSoundEnabled, soundVolume, setSoundVolume],
  );
  return (
    <CSPProvider nonce={nonce}>
      <DirectionProvider direction={direction}>
        <YorhaContext.Provider value={value}>{children}</YorhaContext.Provider>
      </DirectionProvider>
    </CSPProvider>
  );
}

function useYorha(): YorhaContextValue {
  const ctx = useContext(YorhaContext);
  if (!ctx) throw new Error("Yorha hooks must be used inside <YorhaProvider>.");
  return ctx;
}

export function useTheme() {
  const { theme, setTheme } = useYorha();
  return { theme, setTheme };
}

export function useMotion() {
  const { motion, setMotion } = useYorha();
  return { motion, setMotion };
}

export function useDensity() {
  const { density, setDensity } = useYorha();
  return { density, setDensity };
}

export function useSoundPreference() {
  const { soundEnabled, setSoundEnabled, soundVolume, setSoundVolume } = useYorha();
  return { enabled: soundEnabled, setEnabled: setSoundEnabled, volume: soundVolume, setVolume: setSoundVolume };
}
