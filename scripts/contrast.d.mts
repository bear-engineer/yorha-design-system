export type ContrastKind = "text" | "ui";
export interface ContrastPair {
  fg: string;
  bg: string;
  kind: ContrastKind;
}
export interface ContrastThresholds {
  text: number;
  ui: number;
}
export interface ContrastRow extends ContrastPair {
  fgHex: string;
  bgHex: string;
  ratio: number;
  min: number;
  pass: boolean;
}
export const CONTRAST_PAIRS: ContrastPair[];
export const THRESHOLDS: Record<string, ContrastThresholds>;
export function hexToRgb(hex: string): [number, number, number];
export function relativeLuminance(hex: string): number;
export function contrastRatio(a: string, b: string): number;
export function hexToOklch(hex: string): [number, number, number];
export function oklchToHex(lch: readonly [number, number, number]): string;
export function checkPairs(colors: Record<string, string>, thresholds: ContrastThresholds, pairs?: ContrastPair[]): ContrastRow[];
