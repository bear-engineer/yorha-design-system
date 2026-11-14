export interface ColorTokenValue {
  colorSpace: "oklch";
  components: [number, number, number];
  alpha?: number;
  hex: string;
}
export interface LoadedTokens {
  base: Map<string, { type: string; value: unknown; description?: string; extensions?: Record<string, unknown> }>;
  modifiers: Record<string, { default: string; contexts: Record<string, LoadedTokens["base"]> }>;
}
/** Output path (relative to the repo root) for each generated file. */
export const OUTPUTS: { css: string; registry: string; docs: string; routeCss: string };
export function loadTokens(): LoadedTokens;
/** theme -> colour token name -> hex fallback */
export function themeColors(tokens: LoadedTokens): Record<string, Record<string, string>>;
/** theme -> colour token name -> DTCG colour value */
export function themeColorTokens(tokens: LoadedTokens): Record<string, Record<string, ColorTokenValue>>;
/** Pure: output path -> file content. The CLI writes exactly this. */
export function generate(): Record<string, string>;
