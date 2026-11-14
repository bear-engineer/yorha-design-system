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
});
