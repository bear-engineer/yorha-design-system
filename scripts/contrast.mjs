// WCAG 2.x contrast for the YoRHa tokens: pure colour math + the pair policy.
// Token loading lives in build-tokens.mjs; only the CLI at the bottom touches it.
import { fileURLToPath } from "node:url";

/** @param {string} hex "#rrggbb" */
export function hexToRgb(hex) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`invalid hex colour: ${hex}`);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const toLinear = (c) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const toGamma = (v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);

/** WCAG relative luminance of an sRGB hex colour. */
export function relativeLuminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio (1..21), order independent. */
export function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const round = (v, digits) => Number(v.toFixed(digits));

/** sRGB hex -> [L, C, H] (OKLCH), rounded so that oklchToHex() returns the same hex. */
export function hexToOklch(hex) {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.hypot(A, B);
  const H = C < 0.00005 ? 0 : (Math.atan2(B, A) * 180) / Math.PI;
  return [round(L, 4), round(C, 4), round(H < 0 ? H + 360 : H, 2)];
}

/** [L, C, H] (OKLCH) -> sRGB hex (gamut-clamped, 8-bit rounded). */
export function oklchToHex([L, C, H]) {
  const A = C * Math.cos((H * Math.PI) / 180);
  const B = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return `#${rgb
    .map((v) => Math.round(Math.min(1, Math.max(0, toGamma(v))) * 255).toString(16).padStart(2, "0"))
    .join("")}`;
}

/** Colour pairs that must hold in every accessible theme. fg/bg are colour token names. */
export const CONTRAST_PAIRS = [
  { fg: "fg-ink", bg: "bg", kind: "text" },
  { fg: "fg-ink", bg: "panel", kind: "text" },
  { fg: "fg-strong", bg: "bg", kind: "text" },
  { fg: "fg-strong", bg: "panel", kind: "text" },
  { fg: "fg", bg: "bg", kind: "text" },
  { fg: "fg", bg: "panel", kind: "text" },
  { fg: "fg-soft", bg: "bg", kind: "text" },
  { fg: "fg-soft", bg: "panel", kind: "text" },
  { fg: "fg-muted", bg: "bg", kind: "text" },
  { fg: "fg-muted", bg: "panel", kind: "text" },
  { fg: "alert", bg: "bg", kind: "text" },
  { fg: "alert", bg: "panel", kind: "text" },
  { fg: "on-ink", bg: "ink", kind: "text" },
  { fg: "on-ink-soft", bg: "ink", kind: "text" },
  { fg: "alert-on-ink", bg: "ink", kind: "text" },
  { fg: "on-control", bg: "control", kind: "text" },
  { fg: "border", bg: "bg", kind: "ui" },
  { fg: "border", bg: "panel", kind: "ui" },
  { fg: "separator", bg: "bg", kind: "ui" },
  { fg: "separator", bg: "panel", kind: "ui" },
  { fg: "alert-ui", bg: "bg", kind: "ui" },
  { fg: "alert-ui", bg: "panel", kind: "ui" },
  { fg: "ring", bg: "bg", kind: "ui" },
  { fg: "ring", bg: "panel", kind: "ui" },
  { fg: "ink", bg: "bg", kind: "ui" },
  { fg: "ink", bg: "panel", kind: "ui" },
];

/** Minimum ratios per accessible theme. Themes not listed here (authentic) are decoration modes and exempt. */
export const THRESHOLDS = {
  light: { text: 4.5, ui: 3 },
  dark: { text: 4.5, ui: 3 },
  "high-contrast": { text: 7, ui: 4.5 },
};

/**
 * @param {Record<string, string>} colors token name -> hex
 * @param {{ text: number, ui: number }} thresholds
 */
export function checkPairs(colors, thresholds, pairs = CONTRAST_PAIRS) {
  return pairs.map(({ fg, bg, kind }) => {
    const fgHex = colors[fg];
    const bgHex = colors[bg];
    if (!fgHex || !bgHex) throw new Error(`contrast pair ${fg}/${bg}: missing colour token`);
    const ratio = contrastRatio(fgHex, bgHex);
    const min = thresholds[kind];
    return { fg, bg, kind, fgHex, bgHex, ratio, min, pass: ratio >= min };
  });
}

// CLI: node scripts/contrast.mjs -> prints every pair, exits 1 when an accessible theme fails.
// (.then, not top-level await: build-tokens.mjs imports this module, and awaiting it here would deadlock.)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  import("./build-tokens.mjs").then(({ loadTokens, themeColors }) => {
    const colors = themeColors(loadTokens());
    let failed = 0;
    for (const [theme, thresholds] of Object.entries(THRESHOLDS)) {
      for (const row of checkPairs(colors[theme], thresholds)) {
        if (!row.pass) failed += 1;
        console.log(`${row.pass ? "ok  " : "FAIL"} ${theme.padEnd(14)} ${row.kind.padEnd(4)} ${`${row.fg}/${row.bg}`.padEnd(22)} ${row.ratio.toFixed(2)} (min ${row.min})`);
      }
    }
    if (failed) {
      console.error(`${failed} contrast pair(s) below threshold`);
      process.exitCode = 1;
    }
  });
}
