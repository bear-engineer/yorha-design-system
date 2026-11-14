import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { tokens as docsTokens } from "../src/docs/foundations/tokens.generated";
import { OUTPUTS, generate } from "./build-tokens.mjs";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const FONT_PACKAGES = ["pretendard", "@fontsource-variable/noto-sans-kr", "@fontsource-variable/noto-sans-jp", "@fontsource/zen-kaku-gothic-new", "@fontsource/m-plus-1-code"];

interface BaseItem {
  name: string;
  type: string;
  extends: string;
  dependencies: string[];
  cssVars: Record<"theme" | "light" | "dark", Record<string, string>>;
  css: Record<string, unknown>;
}
const baseItem = () => {
  const item = (JSON.parse(read("registry/yorha/base/base/registry.json")) as { items: BaseItem[] }).items[0];
  if (!item) throw new Error("registry/yorha/base/base/registry.json has no item");
  return item;
};

describe("token generator", () => {
  it("emits the css, registry and docs outputs", () => {
    expect(Object.keys(generate()).sort()).toEqual(["registry/yorha/base/base/registry.json", "src/docs/foundations/tokens.generated.ts", "src/styles/route-transition.generated.css", "src/styles/tokens.generated.css"]);
    expect(Object.values(OUTPUTS).sort()).toEqual(Object.keys(generate()).sort());
  });

  it("Storybook loads the kit's route-transition CSS (not the UA default crossfade)", () => {
    const css = generate()["src/styles/route-transition.generated.css"];
    expect(css).toContain("yorha-route-in-forward");
    expect(read("src/styles/storybook.css")).toContain("route-transition.generated.css");
  });

  it("is deterministic and the files on disk match it (no hand edits, no drift)", () => {
    const first = generate();
    expect(generate()).toEqual(first);
    for (const [path, content] of Object.entries(first)) expect(read(path), path).toBe(content);
  });

  it("registry base item is a registry:base that extends none", () => {
    const item = baseItem();
    expect(item).toMatchObject({ name: "base", type: "registry:base", extends: "none" });
    expect(Object.keys(item?.css ?? {}).some((k) => k.startsWith("@custom-variant dark"))).toBe(true);
    expect(Object.keys(item?.css ?? {})).toEqual(expect.arrayContaining(["[data-theme=authentic]", "[data-theme=high-contrast]", "[data-density=compact]", "[data-density=comfortable]", "[data-motion=reduced]", "[data-motion=off]", "@layer base"]));
  });

  it("registry cssVars carry the same values as the generated stylesheet", () => {
    const item = baseItem();
    const css = read("src/styles/tokens.generated.css");
    const block = (selector: string) => {
      const start = css.indexOf(`\n${selector} {\n`);
      expect(start, selector).toBeGreaterThanOrEqual(0);
      return css.slice(start, css.indexOf("\n}\n", start) + 1);
    };
    for (const [scope, selector] of [["light", ":root"], ["dark", ".dark"], ["theme", "@theme inline"]] as const) {
      const vars = Object.entries(item?.cssVars[scope] ?? {});
      expect(vars.length, scope).toBeGreaterThan(0);
      for (const [name, value] of vars) expect(block(selector), `${scope} --${name}`).toContain(`  --${name}: ${value};\n`);
    }
    expect(Object.keys(item?.cssVars.light ?? {})).toEqual(Object.keys(item?.cssVars.dark ?? {}));
  });

  it("pins the font packages exactly as package.json does", () => {
    const pkg = JSON.parse(read("package.json")) as { devDependencies: Record<string, string> };
    expect(baseItem()?.dependencies).toEqual(FONT_PACKAGES.map((name) => `${name}@${pkg.devDependencies[name]}`));
    const css = read("src/styles/tokens.generated.css");
    for (const name of FONT_PACKAGES) expect(css).toContain(`@import "${name}/`);
  });

  describe("readability tokens (C8)", () => {
    const css = () => read("src/styles/tokens.generated.css");
    const rootVar = (name: string) => new RegExp(`\\n  --${name}: ([^;]+);`).exec(css())?.[1];
    const block = (selector: string) => {
      const start = css().indexOf(`\n${selector} {\n`);
      expect(start, selector).toBeGreaterThanOrEqual(0);
      return css().slice(start, css().indexOf("\n}\n", start));
    };

    it("CJK body leading is at least 1.7 and Latin at least 1.6 (whole px), switched by :lang()", () => {
      expect(rootVar("yorha-leading-body-cjk")).toBe("1.75rem");
      expect(rootVar("yorha-leading-latin")).toBe("1.625rem");
      expect(block(":lang(ko), :lang(ja)")).toContain("--yorha-leading-body: var(--yorha-leading-body-cjk);");
      expect(block(":root, [data-density], :lang(en)")).toContain("--yorha-leading-body: var(--yorha-leading-latin);");
    });

    it("has a measure token of about 40em and a paragraph spacing token", () => {
      expect(rootVar("yorha-measure")).toBe("40em");
      expect(rootVar("yorha-paragraph-gap")).toBe("1em");
    });

    it("density=comfortable raises body text to 17px; default stays 16px", () => {
      expect(rootVar("yorha-text-base")).toBe("1rem");
      expect(block("[data-density=comfortable]")).toContain("--yorha-text-base: 1.0625rem;");
      expect(block("[data-density=compact]")).toContain("--yorha-text-base: 1rem;");
      expect(block("@layer base")).toMatch(/\[data-density\]:not\(:root\) \{\n\s+font-size: var\(--yorha-text-base\);/);
    });

    it("ships tabular and break utilities", () => {
      expect(block("@utility yorha-tabular")).toContain("font-variant-numeric: tabular-nums;");
      expect(block("@utility yorha-break")).toContain("overflow-wrap: anywhere;");
    });

    it("long-string safety net keeps keep-all for ko and breaks links and code anywhere, cells at word breaks", () => {
      const layer = block("@layer base");
      expect(layer).toContain("word-break: keep-all;");
      expect(layer).toMatch(/a, code \{\n\s+overflow-wrap: anywhere;/);
      expect(layer).toMatch(/td, th \{\n\s+overflow-wrap: break-word;/);
      expect(layer).toContain("max-width: var(--yorha-measure)");
    });

    it("registry base item carries the same rules", () => {
      const item = baseItem();
      expect(Object.keys(item.css)).toEqual(expect.arrayContaining(["@utility yorha-tabular", "@utility yorha-break", ":lang(ko), :lang(ja)", ":root, [data-density], :lang(en)"]));
      expect((item.css[":root"] as Record<string, string>)["--yorha-measure"]).toBe("40em");
    });
  });

  describe("motion system (C4, C6)", () => {
    const css = () => read("src/styles/tokens.generated.css");
    /** Top-level block by selector. `:root` appears twice (theme colours, then tokens): the one holding `marker` is returned. */
    const block = (selector: string, marker = "") => {
      const all = css();
      for (let start = all.indexOf(`\n${selector} {\n`); start >= 0; start = all.indexOf(`\n${selector} {\n`, start + 1)) {
        const text = all.slice(start, all.indexOf("\n}\n", start));
        if (text.includes(marker)) return text;
      }
      return expect.fail(`no "${selector}" block${marker ? ` containing ${marker}` : ""} in the generated stylesheet`);
    };
    const tokenRoot = () => block(":root", "--yorha-motion-select:");
    const blockVar = (selector: string, name: string) => new RegExp(`\\n\\s+--${name}: ([^;]+);`).exec(selector === ":root" ? tokenRoot() : block(selector))?.[1];
    const DURATIONS = {
      popover: "160ms",
      "popover-exit": "120ms",
      drawer: "450ms",
      collapse: "240ms",
      "tab-indicator": "240ms",
      route: "200ms",
      "route-exit": "120ms",
      "shared-element": "360ms",
      press: "90ms",
      modal: "280ms",
      "modal-exit": "200ms",
      "drawer-exit": "280ms",
      loop: "1200ms",
    };
    const MOTION_UTILITIES = ["yorha-pop", "yorha-panel", "yorha-fade", "yorha-slide-up", "yorha-slide-down", "yorha-slide-left", "yorha-slide-right", "yorha-collapse", "yorha-wipe", "yorha-press", "yorha-stagger"];
    const OTHER_UTILITIES = ["yorha-focus", "yorha-tabular", "yorha-segments", "yorha-break", "yorha-focus-inset", "yorha-tint", "yorha-disabled", "yorha-readonly", "yorha-invalid", "yorha-row", "yorha-surface", "yorha-scroll", "yorha-scroll-cue-x"];
    const utilityBlock = (name: string) => block(`@utility ${name}`);

    it.each(Object.entries(DURATIONS))("duration token %s is %s under both names", (name, value) => {
      expect(blockVar(":root", `yorha-motion-${name}`)).toBe(value);
      expect(blockVar(":root", `motion-${name}`)).toBe(value);
    });

    it("keeps the v1 durations", () => {
      expect(blockVar(":root", "motion-select")).toBe("180ms");
      expect(blockVar(":root", "motion-panel")).toBe("400ms");
      expect(blockVar(":root", "motion-panel-exit")).toBe("240ms");
      expect(blockVar(":root", "motion-stagger")).toBe("40ms");
    });

    it("adds emphasized and decelerate easings as variables and Tailwind ease-* keys", () => {
      for (const name of ["emphasized", "decelerate"]) {
        expect(blockVar(":root", `yorha-ease-${name}`) ?? "", name).toMatch(/^cubic-bezier\(/);
        expect(blockVar("@theme inline", `ease-yorha-${name}`), name).toBe(`var(--yorha-ease-${name})`);
      }
      expect(blockVar(":root", "yorha-ease-emphasized")).not.toBe(blockVar(":root", "yorha-ease-decelerate"));
    });

    it("full motion: spatial movement on, no reduced fade", () => {
      for (const selector of [":root", "[data-motion=full]"]) {
        expect(blockVar(selector, "motion-spatial"), selector).toBe("1");
        expect(blockVar(selector, "motion-reduced-fade"), selector).toBe("0ms");
      }
    });

    it.each(["[data-motion=reduced]", "@media (prefers-reduced-motion: reduce)"])("reduced (%s): every duration 0, opacity fade of at most 120ms, no spatial movement", (selector) => {
      const names = [...tokenRoot().matchAll(/\n\s+--(motion-[a-z-]+): [\d.]+ms;/g)].map((match) => match[1]).filter((name) => name !== "motion-reduced-fade");
      expect(names).toEqual(expect.arrayContaining(Object.keys(DURATIONS).map((name) => `motion-${name}`)));
      // --motion-loop is the one exception: loaders keep a slow opacity pulse (2400ms) instead of stopping
      for (const name of names.filter((n) => n !== "motion-loop")) expect(blockVar(selector, name as string), name).toBe("0ms");
      expect(blockVar(selector, "motion-loop")).toBe("2400ms");
      const fade = parseFloat(blockVar(selector, "motion-reduced-fade") ?? "NaN");
      expect(fade).toBeGreaterThan(0);
      expect(fade).toBeLessThanOrEqual(120);
      expect(blockVar(selector, "motion-spatial")).toBe("0");
    });

    it("off: every duration 0, no fade, no spatial movement", () => {
      const names = [...tokenRoot().matchAll(/\n\s+--(motion-[a-z-]+): [\d.]+ms;/g)].map((match) => match[1]);
      expect(names).toContain("motion-reduced-fade");
      for (const name of names) expect(blockVar("[data-motion=off]", name as string), name).toBe("0ms");
      expect(blockVar("[data-motion=off]", "motion-spatial")).toBe("0");
    });

    it("ships exactly the motion utilities of the spec", () => {
      const utilities = [...css().matchAll(/^@utility (yorha-[a-z-]+) \{$/gm)].map((match) => match[1]);
      expect(utilities.filter((name) => !OTHER_UTILITIES.includes(name as string))).toEqual(MOTION_UTILITIES);
      expect(docsTokens.motion.utilities).toEqual(MOTION_UTILITIES);
    });

    it("utilities use tokens only: no raw ms, no raw cubic-bezier, no transition: all", () => {
      for (const name of MOTION_UTILITIES) {
        expect(utilityBlock(name), name).not.toMatch(/\d+ms|cubic-bezier|\ball\b/);
        expect(utilityBlock(name), name).toMatch(/var\(--motion-/);
      }
    });

    it("open/close utilities transition between data-starting-style and data-ending-style, with an opacity fade when reduced", () => {
      for (const name of MOTION_UTILITIES.filter((utility) => !["yorha-press", "yorha-stagger", "yorha-wipe"].includes(utility))) {
        expect(utilityBlock(name), name).toContain("&[data-starting-style], &[data-ending-style] {");
        expect(utilityBlock(name), name).toMatch(/transition-property: [a-z, ]*opacity/);
        expect(utilityBlock(name), name).toContain("var(--motion-reduced-fade)");
      }
    });

    it("yorha-pop/panel/fade honour Base UI data-instant (keyboard open, Esc, focus tooltip) after the exit rule", () => {
      for (const name of ["yorha-pop", "yorha-panel", "yorha-fade"]) {
        const block = utilityBlock(name);
        expect(block, name).toMatch(/&\[data-instant\] \{\n\s+transition-duration: 0s;/);
        expect(block.indexOf("&[data-instant]"), name).toBeGreaterThan(block.lastIndexOf("&[data-ending-style] {"));
      }
    });

    it("exits ease with --yorha-ease, never ease-in", () => {
      for (const name of ["yorha-pop", "yorha-panel", "yorha-fade"]) {
        const exit = utilityBlock(name).slice(utilityBlock(name).lastIndexOf("&[data-ending-style] {"));
        expect(exit, name).toContain("transition-timing-function: var(--yorha-ease);");
        expect(exit, name).not.toContain("ease-in");
      }
    });

    it("stagger fits the entry budget: stagger * stagger-max + stagger-enter <= 500ms; yorha-stagger reads the entry token", () => {
      const ms = (name: string) => parseFloat(blockVar(":root", `motion-${name}`)!);
      const max = Number(blockVar(":root", "motion-stagger-max"));
      expect(ms("stagger")).toBe(40);
      expect(max).toBe(6);
      expect(ms("stagger-enter")).toBe(240);
      expect(ms("stagger") * max + ms("stagger-enter")).toBeLessThanOrEqual(500);
      expect(utilityBlock("yorha-stagger")).toContain("animation-duration: max(var(--motion-stagger-enter), var(--motion-reduced-fade));");
    });

    it("Motion.mdx utility table lists exactly the duration tokens each utility reads", () => {
      const doc = read("src/docs/foundations/Motion.mdx");
      const rows = [...doc.matchAll(/<tr><td><code>(yorha-[a-z-]+)<\/code><\/td>(.*?)<\/tr>/g)];
      expect(rows.map((row) => row[1])).toEqual(MOTION_UTILITIES);
      const DURATION = /--motion-(popover-exit|popover|panel-exit|panel|modal-exit|modal|drawer-exit|drawer|collapse|select-exit|select|press|stagger-enter|stagger)(?![a-z-])/g;
      for (const [, name, cells] of rows) {
        const tokenCell = (cells ?? "").split("</td>")[1] ?? "";
        const documented = new Set([...tokenCell.matchAll(DURATION)].map((match) => match[1]));
        const used = new Set([...utilityBlock(name!).matchAll(DURATION)].map((match) => match[1]));
        expect([...documented].sort(), name).toEqual([...used].sort());
      }
    });

    it("yorha-pop scales and fades from --transform-origin, exit on the faster token", () => {
      const pop = utilityBlock("yorha-pop");
      expect(pop).toContain("transform-origin: var(--transform-origin");
      expect(pop).toMatch(/&\[data-starting-style\], &\[data-ending-style\] \{\n\s+opacity: 0;\n\s+scale: [^;]*var\(--motion-scale-pop\)[^;]*var\(--motion-spatial\)/);
      expect(pop).toContain("var(--motion-popover)");
      expect(pop).toMatch(/&\[data-ending-style\] \{\n\s+transition-duration: [^;]*var\(--motion-popover-exit\)/);
    });

    it("yorha-panel and yorha-fade use the panel tokens; slides use the drawer token and follow the Base UI swipe variables", () => {
      expect(utilityBlock("yorha-panel")).toContain("var(--motion-panel)");
      expect(utilityBlock("yorha-panel")).toContain("var(--motion-panel-exit)");
      expect(utilityBlock("yorha-panel")).toMatch(/translate: [^;]*var\(--motion-shift\)[^;]*var\(--motion-spatial\)/);
      expect(utilityBlock("yorha-fade")).toContain("var(--motion-panel)");
      expect(utilityBlock("yorha-fade")).not.toMatch(/translate|scale/);
      for (const direction of ["up", "down", "left", "right"]) {
        const slide = utilityBlock(`yorha-slide-${direction}`);
        expect(slide, direction).toContain("var(--motion-drawer)");
        expect(slide, direction).toContain("var(--yorha-ease-emphasized)");
        expect(slide, direction).toContain("var(--drawer-swipe-movement-x, 0px)");
        expect(slide, direction).toContain("var(--drawer-swipe-movement-y, 0px)");
        expect(slide, direction).toMatch(/var\(--yorha-slide-distance, 100%\)[^;]*var\(--motion-spatial\)/);
        expect(slide, direction).toMatch(/&\[data-swiping\] \{\n\s+transition-duration: 0s;/);
      }
    });

    it("yorha-collapse animates height from the Base UI panel height variables", () => {
      const collapse = utilityBlock("yorha-collapse");
      expect(collapse).toContain("height: var(--collapsible-panel-height, auto);");
      expect(collapse).toContain("height: var(--accordion-panel-height, auto);");
      expect(collapse).toContain("overflow: hidden;");
      expect(collapse).toMatch(/transition-property: height, opacity;/);
      expect(collapse).toContain("var(--motion-collapse)");
      expect(collapse).toMatch(/&\[data-starting-style\], &\[data-ending-style\] \{\n\s+height: 0;\n\s+opacity: 0;/);
      expect(collapse).toMatch(/&\[data-ending-style\] \{\n\s+transition-duration: var\(--motion-select\), max\(var\(--motion-select\), var\(--motion-reduced-fade\)\);/);
    });

    it("yorha-wipe transitions background-size and colour: exit speed by default, enter speed on the selected states", () => {
      const wipe = utilityBlock("yorha-wipe");
      expect(wipe).toContain("transition-property: background-size, color;");
      expect(wipe).toContain("transition-timing-function: var(--yorha-ease-out);");
      expect(wipe).toMatch(/^\s+transition-duration: var\(--yorha-wipe-exit, var\(--motion-select-exit\)\), var\(--motion-press\);/m);
      expect(wipe).toMatch(/&:is\(.*\[data-highlighted\].*\[data-checked\].*\) \{\n\s+transition-duration: var\(--motion-select\), var\(--motion-press\);/);
    });

    it("yorha-press scales on :active with the press token; yorha-stagger delays by --motion-stagger times an index", () => {
      const press = utilityBlock("yorha-press");
      expect(press).toContain("var(--motion-press)");
      expect(press).toMatch(/&:active[^{]* \{\n\s+scale: [^;]*var\(--motion-scale-press\)[^;]*var\(--motion-spatial\)/);
      const stagger = utilityBlock("yorha-stagger");
      expect(stagger).toMatch(/animation-delay: calc\(var\(--motion-stagger\) \* [^;]*var\(--yorha-stagger-index, 0\)/);
      expect(stagger).toContain("animation-name: yorha-stagger-in;");
      expect(stagger).toContain("var(--motion-reduced-fade)");
      // Inside @layer base, not top level: the shadcn CLI moves a top-level @keyframes into @theme, where Tailwind drops it.
      expect(block("@layer base")).toMatch(/\n  @keyframes yorha-stagger-in \{\n\s+from \{\n\s+opacity: 0;/);
      expect(css()).not.toMatch(/^@keyframes /m);
    });

    it("registry base item carries the same utilities, keyframes and motion variables", () => {
      const item = baseItem();
      expect(Object.keys(item.css)).toEqual(expect.arrayContaining(MOTION_UTILITIES.map((name) => `@utility ${name}`)));
      expect(Object.keys(item.css).filter((key) => key.startsWith("@keyframes"))).toEqual([]);
      expect(Object.keys(item.css["@layer base"] as Record<string, unknown>)).toContain("@keyframes yorha-stagger-in");
      const root = item.css[":root"] as Record<string, string>;
      for (const [name, value] of Object.entries(DURATIONS)) expect(root[`--motion-${name}`], name).toBe(value);
      expect((item.css["[data-motion=reduced]"] as Record<string, string>)["--motion-spatial"]).toBe("0");
    });

    it("docs data lists every motion token", () => {
      expect(docsTokens.motion.durations.map((duration) => duration.name)).toEqual(expect.arrayContaining(Object.keys(DURATIONS)));
      expect(docsTokens.motion.easings.map((easing) => easing.name)).toEqual(expect.arrayContaining(["emphasized", "decelerate"]));
      expect(docsTokens.motion.parameters.map((parameter) => parameter.alias)).toEqual(
        expect.arrayContaining(["--motion-reduced-fade", "--motion-spatial", "--motion-scale-pop", "--motion-scale-press", "--motion-shift", "--motion-stagger-max"]),
      );
      const documented = docsTokens.motion.durations.length + docsTokens.motion.easings.length + docsTokens.motion.parameters.length;
      const declared = [...tokenRoot().matchAll(/\n\s+--yorha-(?:motion|ease)[a-z-]*: /g)].length;
      expect(documented).toBe(declared);
    });

    it("Motion.mdx: the utility table matches the base utilities 1:1 and the token tables render every token", () => {
      const mdx = read("src/docs/foundations/Motion.mdx");
      const section = /\n## 유틸리티\n([\s\S]*?)(?=\n## |$)/.exec(mdx)?.[1] ?? "";
      const rows = [...section.matchAll(/<tr><td><code>(yorha-[a-z-]+)<\/code><\/td>/g)].map((match) => match[1]);
      expect(rows).toEqual(MOTION_UTILITIES);
      for (const list of ["durations", "easings", "parameters"]) expect(mdx, list).toContain(`tokens.motion.${list}.map(`);
    });
  });

  it("emits forced-colors, table wrap, text-shadow and mobile base rules", () => {
    const css = generate()["src/styles/tokens.generated.css"] ?? "";
    expect(css).toMatch(/@media \(forced-colors: active\) \{[\s\S]*\.bg-yorha-ink \{[^}]*background-color: Highlight/);
    expect(css).toMatch(/\[role=switch\]\[data-checked\][^{]*\{[^}]*forced-color-adjust: none/);
    expect(css).toMatch(/\[role=tab\]\[data-active\][^{]*\{[^}]*Highlight/);
    expect(css).toMatch(/td, th \{\s*overflow-wrap: break-word/);
    expect(css).toMatch(/a, code \{\s*overflow-wrap: anywhere/);
    expect(css).toMatch(/\[data-theme=high-contrast\] \{[^}]*--yorha-text-shadow: none/);
    expect(css).toMatch(/-webkit-text-size-adjust: 100%/);
    expect(css).toMatch(/-webkit-tap-highlight-color: transparent/);
    expect(css).toMatch(/touch-action: manipulation/);
  });

  describe("craft v3 tokens (G1, G2, G4, G11-G14)", () => {
    const css = () => read("src/styles/tokens.generated.css");
    const find = (selector: string, marker = "") => {
      const all = css();
      for (let start = all.indexOf(`\n${selector} {\n`); start >= 0; start = all.indexOf(`\n${selector} {\n`, start + 1)) {
        const text = all.slice(start, all.indexOf("\n}\n", start));
        if (text.includes(marker)) return text;
      }
      return expect.fail(`no "${selector}" block containing "${marker}"`);
    };
    const tokenRoot = () => find(":root", "--yorha-motion-select:");
    const varIn = (block: string, name: string) => new RegExp(`\\n\\s+--${name}: ([^;]+);`).exec(block)?.[1];
    const px = (value: string | undefined) => {
      expect(value).toBeDefined();
      const n = parseFloat(value ?? "");
      return (value ?? "").endsWith("rem") ? n * 16 : n;
    };
    const utility = (name: string) => find(`@utility ${name}`);
    const CONTEXTS = { compact: 'data-density=compact', default: "", comfortable: "data-density=comfortable" } as const;
    const SIZES: Record<string, [number, number, number]> = {
      "control-sm": [24, 32, 40], "control-md": [32, 40, 48], "control-lg": [40, 48, 56], row: [28, 32, 40],
      "pad-sm": [8, 12, 12], "pad-md": [12, 16, 20], "pad-lg": [16, 24, 28],
    };

    it("G1: spacing stays 0.25rem in every density, the grid cell is 0.5rem", () => {
      expect(varIn(tokenRoot(), "yorha-spacing")).toBe("0.25rem");
      expect(varIn(tokenRoot(), "yorha-grid-size")).toBe("0.5rem");
      for (const density of ["compact", "comfortable"]) {
        const block = find(`[data-density=${density}]`);
        expect(block).not.toMatch(/--yorha-spacing|\n\s+--spacing:/);
      }
    });

    it.each(Object.entries(SIZES))("G2: size token %s per density", (name, [compact, normal, comfortable]) => {
      expect(px(varIn(tokenRoot(), `yorha-${name}`))).toBe(normal);
      expect(px(varIn(find("[data-density=compact]"), `yorha-${name}`))).toBe(compact);
      expect(px(varIn(find("[data-density=comfortable]"), `yorha-${name}`))).toBe(comfortable);
    });

    it("G2: density-fixed indicator, bullet and icon sizes", () => {
      const root = tokenRoot();
      expect(px(varIn(root, "yorha-indicator"))).toBe(20);
      expect(px(varIn(root, "yorha-bullet"))).toBe(8);
      expect([12, 16, 20]).toEqual(["sm", "md", "lg"].map((k) => px(varIn(root, `yorha-icon-${k}`))));
      expect(find("[data-density=compact]")).not.toContain("--yorha-icon-");
    });

    it("G2: Tailwind emits the canonical utility names from the generated @theme block", async () => {
      const { compile } = await import("tailwindcss");
      const theme = /@theme inline \{[\s\S]*?\n\}/.exec(css())?.[0] ?? "";
      const classes = ["h-control-md", "size-control-sm", "w-control-lg", "min-h-row", "h-row", "px-pad-md", "px-pad-sm", "size-icon-md", "size-indicator", "size-bullet"];
      const built = (await compile(`${theme}\n@tailwind utilities;`)).build(classes);
      for (const name of classes) expect(built, name).toContain(`.${name.replace(/^(\w+)-/, "$1-")}`);
      expect(built).toMatch(/\.h-control-md \{\s*height: var\(--yorha-control-md\)/);
      expect(built).toMatch(/\.px-pad-md \{\s*padding-inline: var\(--yorha-pad-md\)/);
    });

    it("G2: docs data lists the size tokens", () => {
      const names = (docsTokens as unknown as { sizes: { name: string }[] }).sizes.map((size) => size.name);
      expect(names).toEqual(expect.arrayContaining(["control.sm", "control.md", "control.lg", "row", "pad.sm", "pad.md", "pad.lg", "indicator", "bullet", "icon.sm", "icon.md", "icon.lg"]));
    });

    it("G4: every type pair is a whole px at a 16px root in both densities; CJK >= 1.7, Latin >= 1.6", () => {
      const sizePx = { xs: 12, sm: 14, lg: 18, xl: 22, "2xl": 28, "3xl": 36, display: 48 } as const;
      const pairs = { xs: 16, sm: 20, lg: 28, xl: 30, "2xl": 36, "3xl": 44, display: 56 } as const;
      for (const [k, size] of Object.entries(sizePx)) {
        const line = px(varIn(tokenRoot(), `yorha-line-height-${k}`));
        expect(line, k).toBe(pairs[k as keyof typeof pairs]);
        expect(Number.isInteger(line) && line > size, k).toBe(true);
      }
      for (const [density, base, latin, cjk] of [["default", 16, 26, 28], ["comfortable", 17, 28, 30]] as const) {
        const block = density === "default" ? tokenRoot() : find(`[data-density=${density}]`);
        expect(px(varIn(block, "yorha-text-base"))).toBe(base);
        const l = px(varIn(block, "yorha-leading-latin"));
        const c = px(varIn(block, "yorha-leading-body-cjk"));
        expect([l, c]).toEqual([latin, cjk]);
        expect(c / base).toBeGreaterThanOrEqual(1.7);
        expect(l / base).toBeGreaterThanOrEqual(1.6);
      }
      const theme = /@theme inline \{[\s\S]*?\n\}/.exec(css())?.[0] ?? "";
      expect(theme).toContain("--text-yorha-sm--line-height: var(--yorha-line-height-sm);");
      expect(theme).toContain("--text-yorha-base--line-height: var(--yorha-leading-body);");
      expect(theme).toContain("--text-yorha-display--line-height: var(--yorha-line-height-display);");
    });

    it("G11: modal and drawer-exit durations, 0 when reduced or off", () => {
      for (const [name, value] of Object.entries({ modal: "280ms", "modal-exit": "200ms", "drawer-exit": "280ms" })) {
        expect(varIn(tokenRoot(), `yorha-motion-${name}`), name).toBe(value);
        expect(varIn(tokenRoot(), `motion-${name}`), name).toBe(value);
        expect(varIn(find("[data-motion=reduced]"), `yorha-motion-${name}`), name).toBe("0ms");
        expect(varIn(find("[data-motion=off]"), `yorha-motion-${name}`), name).toBe("0ms");
      }
    });

    it("G11: yorha-press guards disabled and loading, delays the colour flip by 0.35 of the select duration", () => {
      const press = utility("yorha-press");
      expect(press).toContain("&:active:not(:disabled, [data-disabled], [aria-disabled=true], [data-loading], [aria-busy=true])");
      expect(press).toMatch(/transition-delay: 0s, calc\(var\(--motion-select\) \* 0\.35\), 0s, 0s, 0s;/);
      expect(press).toMatch(/transition-property: scale, color, /);
      expect(press).toMatch(/transition-duration: var\(--motion-press\), var\(--motion-press\), /);
    });

    it("G11: yorha-wipe colours at press speed with the same delay; exit reads --yorha-wipe-exit", () => {
      const wipe = utility("yorha-wipe");
      expect(wipe).toContain("var(--yorha-wipe-exit, var(--motion-select-exit))");
      expect(wipe).toContain("calc(var(--motion-select) * 0.35)");
      expect(wipe).toMatch(/var\(--motion-press\)/);
    });

    it("G11: slide exit reads the drawer-exit token, swipe strength and the standard ease", () => {
      const slide = utility("yorha-slide-up");
      expect(slide).toContain("calc(max(var(--motion-drawer-exit), var(--motion-reduced-fade)) * var(--drawer-swipe-strength, 1))");
      expect(slide).toMatch(/&\[data-ending-style\] \{[^}]*transition-timing-function: var\(--yorha-ease\);/);
    });

    it("G12: caret, selection, autofill and no-select base rules", () => {
      const base = find("@layer base");
      expect(base).toMatch(/input, textarea \{\n\s+caret-color: var\(--yorha-ink\);/);
      expect(base).toMatch(/::selection \{\n\s+background-color: var\(--yorha-ink\);\n\s+color: var\(--yorha-on-ink\);/);
      expect(base).toMatch(/:is\(input, textarea, select\):-webkit-autofill \{[^}]*-webkit-text-fill-color: var\(--yorha-fg-strong\);[^}]*inset 0 0 0 100vmax var\(--yorha-bg\)/);
      expect(base).toMatch(/:where\(button, summary, \[role=button\][^{]*\) \{\n\s+user-select: none;\n\s+-webkit-user-select: none;/);
      expect(css()).toMatch(/@media \(forced-colors: active\) \{[\s\S]*::selection \{[^}]*Highlight[^}]*HighlightText/);
    });

    it("G13: decor sits behind content (z -1)", () => {
      expect(varIn(tokenRoot(), "yorha-z-decor")).toBe("-1");
    });

    it("G14: yorha-segments draws the 8px pitch, 2px gap gauge on whole segments", () => {
      const seg = utility("yorha-segments");
      expect(seg).toContain("--yorha-seg-pitch: 8px;");
      expect(seg).toContain("--yorha-seg-gap: 2px;");
      expect(seg).toMatch(/repeating-linear-gradient\(to right, currentColor 0 calc\(var\(--yorha-seg-pitch\) - var\(--yorha-seg-gap\)\), transparent 0 var\(--yorha-seg-pitch\)\)/);
      expect(seg).toContain("background-repeat: repeat-x;");
      expect(Object.keys(baseItem().css)).toContain("@utility yorha-segments");
    });
  });
});

describe("craft v3 recipes (G5-G10)", () => {
  const css = () => read("src/styles/tokens.generated.css");
  const find = (selector: string, marker = "") => {
    const all = css();
    for (let start = all.indexOf(`\n${selector} {\n`); start >= 0; start = all.indexOf(`\n${selector} {\n`, start + 1)) {
      const text = all.slice(start, all.indexOf("\n}\n", start));
      if (text.includes(marker)) return text;
    }
    return expect.fail(`no "${selector}" block containing "${marker}"`);
  };
  const varIn = (block: string, name: string) => new RegExp(`\\n\\s+--${name}: ([^;]+);`).exec(block)?.[1];
  const utility = (name: string) => find(`@utility ${name}`);

  describe("G7 state recipes", () => {
    it("state tokens: hover 8, pressed 16, range 12, disabled 55 (percent); high-contrast re-declares them", () => {
      const root = find(":root", "--yorha-state-hover:");
      expect([varIn(root, "yorha-state-hover"), varIn(root, "yorha-state-pressed"), varIn(root, "yorha-state-range"), varIn(root, "yorha-state-disabled")]).toEqual(["8%", "16%", "12%", "55%"]);
      const hc = find("[data-theme=high-contrast]");
      expect([varIn(hc, "yorha-state-hover"), varIn(hc, "yorha-state-pressed"), varIn(hc, "yorha-state-range"), varIn(hc, "yorha-state-disabled")]).toEqual(["16%", "28%", "20%", "60%"]);
      // every theme block re-declares them so a nested data-theme subtree does not inherit another theme's percentages
      for (const theme of ["dark", "authentic", "light"]) expect(find(`[data-theme=${theme}]`), theme).toContain("--yorha-state-hover:");
    });

    it("state colours are colour-mix of ink / fg and are declared per theme (a subtree re-resolves them)", () => {
      for (const block of [find(":root", "--yorha-hover:"), find("[data-theme=dark]"), find("[data-theme=high-contrast]")]) {
        expect(varIn(block, "yorha-hover")).toBe("color-mix(in oklab, var(--yorha-ink) var(--yorha-state-hover), transparent)");
        expect(varIn(block, "yorha-pressed")).toBe("color-mix(in oklab, var(--yorha-ink) var(--yorha-state-pressed), transparent)");
        expect(varIn(block, "yorha-range")).toBe("color-mix(in oklab, var(--yorha-ink) var(--yorha-state-range), transparent)");
        expect(varIn(block, "yorha-disabled")).toBe("color-mix(in oklab, var(--yorha-fg) var(--yorha-state-disabled), transparent)");
      }
    });

    it("Tailwind emits bg-yorha-hover / bg-yorha-pressed / bg-yorha-range / text-yorha-disabled / border-yorha-disabled", async () => {
      const { compile } = await import("tailwindcss");
      const theme = /@theme inline \{[\s\S]*?\n\}/.exec(css())?.[0] ?? "";
      const classes = ["bg-yorha-hover", "bg-yorha-pressed", "bg-yorha-range", "text-yorha-disabled", "border-yorha-disabled", "bg-yorha-disabled"];
      const built = (await compile(`${theme}\n@tailwind utilities;`)).build(classes);
      for (const name of classes) expect(built, name).toContain(`.${name}`);
      expect(built).toMatch(/\.bg-yorha-hover \{\s*background-color: var\(--yorha-hover\)/);
    });

    it("yorha-tint: hover and press backgrounds on fine pointers only, never over a selected, disabled or highlighted state", () => {
      const tint = utility("yorha-tint");
      expect(tint).toContain("@media (hover: hover) and (pointer: fine)");
      const guard = ":disabled, [data-disabled], [aria-disabled=\"true\"], [data-checked], [data-pressed], [aria-pressed=\"true\"], [data-selected], [aria-selected=\"true\"], [aria-current], [data-highlighted], [data-popup-open], [data-panel-open]";
      expect(tint).toContain(`&:hover:not(${guard})`);
      expect(tint).toContain(`&:active:not(${guard})`);
      expect(tint).toMatch(/background-color: var\(--yorha-hover\);/);
      expect(tint).toMatch(/background-color: var\(--yorha-pressed\);\n\s+transition-duration: 0s;/);
      expect(tint).not.toMatch(/\bscale\b/);
    });

    it("yorha-disabled: no opacity, part-by-part colours, checked keeps its mark, GrayText in forced colours", () => {
      const disabled = utility("yorha-disabled");
      expect(disabled).toContain("&:is(:disabled, [data-disabled], [aria-disabled=\"true\"])");
      for (const rule of ["cursor: not-allowed;", "color: var(--yorha-disabled);", "border-color: var(--yorha-disabled);", "background-color: transparent;", "background-image: none;", "box-shadow: none;", "scale: none;", "opacity: 1;"]) expect(disabled, rule).toContain(rule);
      expect(disabled).toMatch(/\[data-checked\], \[data-indeterminate\], \[data-pressed\], \[aria-pressed="true"\], \[data-selected\], \[aria-selected="true"\]\)[^{]*\{[^}]*background-color: var\(--yorha-disabled\);[^}]*color: var\(--yorha-bg\);/);
      expect(disabled).toContain("@media (forced-colors: active)");
      expect(disabled).toContain("GrayText");
    });

    it("yorha-readonly: a printed form line; yorha-invalid: alert edge as an inset shadow, no border-width change", () => {
      const readonly = utility("yorha-readonly");
      expect(readonly).toContain("[data-readonly]");
      expect(readonly).toContain("[aria-readonly=\"true\"]");
      expect(readonly).toContain("border-bottom-color: var(--yorha-border);");
      expect(readonly).toContain("cursor: default;");
      const invalid = utility("yorha-invalid");
      expect(invalid).toContain("&:is([data-invalid], [aria-invalid=\"true\"])");
      expect(invalid).toContain("border-color: var(--yorha-alert-ui);");
      expect(invalid).toContain("box-shadow: inset 0 0 0 calc(var(--yorha-border-width-strong) - var(--yorha-border-width)) var(--yorha-alert-ui);");
      expect(invalid).not.toMatch(/^\s+border-width:/m);
    });

    it("registry base item carries the new utilities", () => {
      const keys = Object.keys(baseItem().css);
      for (const name of ["yorha-tint", "yorha-disabled", "yorha-readonly", "yorha-invalid"]) expect(keys).toContain(`@utility ${name}`);
    });
  });

  describe("G6 focus", () => {
    it("yorha-focus-inset draws the ring inside the box in currentColor; yorha-focus is unchanged", () => {
      const inset = utility("yorha-focus-inset");
      expect(inset).toContain("outline: var(--yorha-ring-width) solid currentColor;");
      expect(inset).toContain("outline-offset: calc(var(--yorha-ring-width) * -1);");
      const ring = utility("yorha-focus");
      expect(ring).toContain("outline: var(--yorha-ring-width) solid var(--yorha-ring);");
      expect(ring).toContain("outline-offset: var(--yorha-ring-offset);");
      expect(Object.keys(baseItem().css)).toContain("@utility yorha-focus-inset");
    });
  });

  describe("G8 row recipe", () => {
    it("yorha-row: full-bleed box on the row token, one ink layer, wipe only on the highlighted state", () => {
      const row = utility("yorha-row");
      for (const rule of ["position: relative;", "display: flex;", "align-items: center;", "gap: 8px;", "min-height: var(--yorha-row);", "padding: 4px 8px;", "user-select: none;", "outline: none;", "color: var(--yorha-fg);", "background-image: linear-gradient(var(--yorha-ink), var(--yorha-ink));", "background-size: 0% 100%;", "background-position: left;", "background-repeat: no-repeat;"]) expect(row, rule).toContain(rule);
      // base state leaves at once (0s); only the highlighted state transitions, over the press token
      expect(row).toMatch(/transition-property: background-size, color;\n\s+transition-duration: 0s;/);
      expect(row).toMatch(/&\[data-highlighted\]:not\(\[data-disabled\]\) \{[^}]*background-size: 100% 100%;[^}]*color: var\(--yorha-on-ink\);[^}]*transition-duration: var\(--motion-press\);[^}]*transition-timing-function: var\(--yorha-ease-out\);/);
      expect(row).toMatch(/&\[data-disabled\] \{[^}]*color: var\(--yorha-disabled\);[^}]*cursor: not-allowed;/);
      expect(row).toMatch(/@media \(forced-colors: active\) \{[\s\S]*outline: 2px solid Highlight;[\s\S]*outline-offset: -2px;/);
      expect(row).not.toContain("duration-");
    });

    it("the indicator slot is hidden in popups with no check, radio or option rows (no bullet on plain action rows)", () => {
      expect(find("@layer base")).toMatch(/\[data-slot\$=-content\]:not\(:has\(\[role=menuitemcheckbox\], \[role=menuitemradio\], \[role=option\]\)\) \[data-slot=row-indicator\] \{\n\s+display: none;/);
      expect(Object.keys(baseItem().css)).toContain("@utility yorha-row");
    });
  });

  describe("G10 overlay surface", () => {
    it("yorha-surface: panel ground, hairline border, no radius, hard offset shadow", () => {
      const surface = utility("yorha-surface");
      for (const rule of ["background-color: var(--yorha-panel);", "color: var(--yorha-fg);", "border: var(--yorha-border-width) solid var(--yorha-border);", "border-radius: var(--yorha-radius);", "box-shadow: 4px 4px 0 0 var(--yorha-shadow);"]) expect(surface, rule).toContain(rule);
    });

    it("yorha-scroll: contained thin scrollbar; yorha-scroll-cue-x: edge hairlines that show only when scrolled away", () => {
      const scroll = utility("yorha-scroll");
      for (const rule of ["overflow: auto;", "overscroll-behavior: contain;", "scrollbar-width: thin;", "scrollbar-color: var(--yorha-border) transparent;"]) expect(scroll, rule).toContain(rule);
      const cue = utility("yorha-scroll-cue-x");
      expect(cue).toMatch(/background-attachment: local, local, scroll, scroll;/);
      expect(cue).toContain("var(--yorha-scroll-ground, var(--yorha-bg))");
      expect(cue).toContain("var(--yorha-border)");
      for (const name of ["yorha-surface", "yorha-scroll", "yorha-scroll-cue-x"]) expect(Object.keys(baseItem().css)).toContain(`@utility ${name}`);
    });
  });
});
