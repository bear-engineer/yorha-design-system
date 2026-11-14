import type { ReactNode } from "react";

export const MAX_FLASH_HZ = 3;
export type Theme = "light" | "dark" | "authentic" | "high-contrast";
export type Motion = "full" | "reduced" | "off";
export type Density = "default" | "compact" | "comfortable";

export function YorhaProvider({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}
export const useTheme = () => ({ theme: "light" as Theme, setTheme: (_: Theme) => {} });
export const useMotion = () => ({ motion: "full" as Motion, setMotion: (_: Motion) => {} });
export const useDensity = () => ({ density: "default" as Density, setDensity: (_: Density) => {} });
export const useSoundPreference = () => ({ enabled: false, volume: 0.5, setEnabled: (_: boolean) => {}, setVolume: (_: number) => {} });
