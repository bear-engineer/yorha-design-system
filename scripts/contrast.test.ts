import { describe, expect, it } from "vitest";
import { CONTRAST_PAIRS, THRESHOLDS, checkPairs, contrastRatio, hexToOklch, oklchToHex, relativeLuminance } from "./contrast.mjs";
import { loadTokens, themeColorTokens, themeColors } from "./build-tokens.mjs";

const tokens = loadTokens();
const colors = themeColors(tokens);
const ACCESSIBLE = ["light", "dark", "high-contrast"] as const;

describe("WCAG relative luminance and contrast ratio", () => {
  it("gives 21:1 for black on white and 1:1 for equal colours", () => {
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1, 6);
    expect(relativeLuminance("#000000")).toBe(0);
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 6);
    expect(contrastRatio("#dad4bb", "#dad4bb")).toBe(1);
  });

  it("is order independent", () => {
    expect(contrastRatio("#3f3d36", "#dad4bb")).toBe(contrastRatio("#dad4bb", "#3f3d36"));
  });

  it("reproduces the dossier section 8 reference ratios", () => {
    expect(contrastRatio("#3f3d36", "#dad4bb")).toBeCloseTo(7.31, 2);
    expect(contrastRatio("#5f5c4e", "#dad4bb")).toBeCloseTo(4.51, 2);
    expect(contrastRatio("#cd664d", "#dad4bb")).toBeCloseTo(2.52, 2);
  });

  it("converts hex to OKLCH and back without loss", () => {
    for (const hex of ["#d1cdb7", "#3f3d36", "#913d29", "#000000", "#ffffff"]) {
      expect(oklchToHex(hexToOklch(hex))).toBe(hex);
    }
  });
});

describe("theme contrast gate", () => {
  it("gates exactly light, dark and high-contrast (authentic is exempt)", () => {
    expect(Object.keys(THRESHOLDS).sort()).toEqual([...ACCESSIBLE].sort());
    for (const theme of ACCESSIBLE) {
      expect(THRESHOLDS[theme]?.text).toBeGreaterThanOrEqual(4.5);
      expect(THRESHOLDS[theme]?.ui).toBeGreaterThanOrEqual(3);
    }
  });

  it("checks both text and UI pairs", () => {
    expect(CONTRAST_PAIRS.filter((p) => p.kind === "text").length).toBeGreaterThan(0);
    expect(CONTRAST_PAIRS.filter((p) => p.kind === "ui").length).toBeGreaterThan(0);
  });

  it.each(ACCESSIBLE)("%s: text pairs >= 4.5:1 and UI pairs >= 3:1", (theme) => {
    const rows = checkPairs(colors[theme] ?? {}, THRESHOLDS[theme] ?? { text: 4.5, ui: 3 });
    expect(rows).toHaveLength(CONTRAST_PAIRS.length);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.filter((r) => !r.pass).map((r) => `${r.fg}/${r.bg} ${r.ratio.toFixed(2)} < ${r.min}`)).toEqual([]);
  });

  it("gates every text token on bg and panel, and every border/separator/focus token at >= 3:1 (all accessible themes)", () => {
    const has = (fg: string, bg: string, kind: string) => CONTRAST_PAIRS.some((p) => p.fg === fg && p.bg === bg && p.kind === kind);
    for (const fg of ["fg-ink", "fg-strong", "fg", "fg-soft", "fg-muted", "alert"]) {
      for (const bg of ["bg", "panel"]) expect(has(fg, bg, "text"), `text ${fg}/${bg}`).toBe(true);
    }
    for (const fg of ["border", "separator", "ring", "alert-ui"]) {
      for (const bg of ["bg", "panel"]) expect(has(fg, bg, "ui"), `ui ${fg}/${bg}`).toBe(true);
    }
    for (const theme of ACCESSIBLE) {
      expect(THRESHOLDS[theme]?.ui, theme).toBeGreaterThanOrEqual(3);
      for (const row of checkPairs(colors[theme] ?? {}, THRESHOLDS[theme] ?? { text: 4.5, ui: 3 })) {
        if (["fg-muted", "separator"].includes(row.fg)) expect(row.ratio, `${theme} ${row.fg}/${row.bg}`).toBeGreaterThanOrEqual(row.kind === "text" ? 4.5 : 3);
      }
    }
  });

  it("authentic stays a decoration mode: it fails the AA gate", () => {
    const rows = checkPairs(colors.authentic ?? {}, { text: 4.5, ui: 3 });
    expect(rows.some((r) => !r.pass)).toBe(true);
  });

  it("every colour token's OKLCH components render to its hex fallback", () => {
    const all = Object.entries(themeColorTokens(tokens));
    expect(all.map(([theme]) => theme).sort()).toEqual(["authentic", "dark", "high-contrast", "light"]);
    for (const [theme, byName] of all) {
      for (const [name, value] of Object.entries(byName)) {
        expect(oklchToHex(value.components), `${theme}.${name}`).toBe(value.hex);
      }
    }
  });
});

describe("fixture that must fail", () => {
  it("flags text below 4.5:1 and UI below 3:1", () => {
    const fixture = { ...colors.light, "fg-muted": "#bab5a1", border: "#b4af9a" };
    const failed = checkPairs(fixture, { text: 4.5, ui: 3 })
      .filter((r) => !r.pass)
      .map((r) => `${r.kind}:${r.fg}/${r.bg}`);
    expect(failed.sort()).toEqual(["text:fg-muted/bg", "text:fg-muted/panel", "ui:border/bg", "ui:border/panel"]);
  });

  it("throws on a pair that names a missing token", () => {
    expect(() => checkPairs({ bg: "#d1cdb7" }, { text: 4.5, ui: 3 }, [{ fg: "nope", bg: "bg", kind: "text" }])).toThrow(/missing colour token/);
  });
});
