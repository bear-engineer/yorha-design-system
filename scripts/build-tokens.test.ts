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
    expect(Object.keys(generate()).sort()).toEqual(["registry/yorha/base/base/registry.json", "src/docs/foundations/tokens.generated.ts", "src/styles/tokens.generated.css"]);
    expect(Object.values(OUTPUTS).sort()).toEqual(Object.keys(generate()).sort());
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

    it("CJK body leading is at least 1.7 and Latin stays 1.6", () => {
      expect(Number(rootVar("yorha-leading-body-cjk"))).toBeGreaterThanOrEqual(1.7);
      expect(Number(rootVar("yorha-leading-body"))).toBe(1.6);
      expect(block(":lang(ko), :lang(ja)")).toContain("--yorha-leading-body: var(--yorha-leading-body-cjk);");
      expect(block(":lang(en)")).toContain("--yorha-leading-body: 1.6;");
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
      expect(Object.keys(item.css)).toEqual(expect.arrayContaining(["@utility yorha-tabular", "@utility yorha-break", ":lang(ko), :lang(ja)", ":lang(en)"]));
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
      route: "320ms",
      "route-exit": "200ms",
      "shared-element": "360ms",
      press: "90ms",
    };
    const MOTION_UTILITIES = ["yorha-pop", "yorha-panel", "yorha-fade", "yorha-slide-up", "yorha-slide-down", "yorha-slide-left", "yorha-slide-right", "yorha-collapse", "yorha-press", "yorha-stagger"];
    const OTHER_UTILITIES = ["yorha-focus", "yorha-tabular", "yorha-break"];
    const utilityBlock = (name: string) => block(`@utility ${name}`);

    it.each(Object.entries(DURATIONS))("duration token %s is %s under both names", (name, value) => {
      expect(blockVar(":root", `yorha-motion-${name}`)).toBe(value);
      expect(blockVar(":root", `motion-${name}`)).toBe(value);
    });

    it("keeps the v1 durations", () => {
      expect(blockVar(":root", "motion-select")).toBe("180ms");
      expect(blockVar(":root", "motion-panel")).toBe("400ms");
      expect(blockVar(":root", "motion-panel-exit")).toBe("240ms");
      expect(blockVar(":root", "motion-stagger")).toBe("100ms");
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
      for (const name of names) expect(blockVar(selector, name as string), name).toBe("0ms");
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
      for (const name of MOTION_UTILITIES.filter((utility) => !["yorha-press", "yorha-stagger"].includes(utility))) {
        expect(utilityBlock(name), name).toContain("&[data-starting-style], &[data-ending-style] {");
        expect(utilityBlock(name), name).toMatch(/transition-property: [a-z, ]*opacity/);
        expect(utilityBlock(name), name).toContain("var(--motion-reduced-fade)");
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
});
