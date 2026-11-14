import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
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
const baseItem = () => (JSON.parse(read("registry/yorha/base/base/registry.json")) as { items: BaseItem[] }).items[0];

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

    it("long-string safety net keeps keep-all for ko and breaks links, code and cells", () => {
      const layer = block("@layer base");
      expect(layer).toContain("word-break: keep-all;");
      expect(layer).toMatch(/a, code, td, th \{\n\s+overflow-wrap: anywhere;/);
      expect(layer).toContain("max-width: var(--yorha-measure)");
    });

    it("registry base item carries the same rules", () => {
      const item = baseItem();
      expect(Object.keys(item.css)).toEqual(expect.arrayContaining(["@utility yorha-tabular", "@utility yorha-break", ":lang(ko), :lang(ja)", ":lang(en)"]));
      expect((item.css[":root"] as Record<string, string>)["--yorha-measure"]).toBe("40em");
    });
  });
});
