import { afterEach, describe, expect, it, vi } from "vitest";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { lintRegistry as lintRegistryUntyped } from "./lint-registry.mjs";

// The motion rule adds `options` and `warnings`; typed here so the test does not depend on the declaration file.
type LintRegistry = (rootDir?: string, options?: { motionStrict?: boolean; craftStrict?: boolean; pixelStrict?: boolean }) => { errors: string[]; warnings?: string[]; includes: number };
const lintRegistry = lintRegistryUntyped as unknown as LintRegistry;

const fixture = (n: string) => fileURLToPath(new URL(`./fixtures/${n}`, import.meta.url));
const repo = fileURLToPath(new URL("..", import.meta.url));
const cli = fileURLToPath(new URL("./lint-registry.mjs", import.meta.url));

describe("lintRegistry", () => {
  it("accepts a clean fixture", () => {
    expect(lintRegistry(fixture("ok")).errors).toEqual([]);
  });

  it.each([
    ["bare-dep", /bare registryDependency "button"/],
    ["missing-story", /missing story thing\.stories\.tsx/],
    ["hex-color", /hard-codes hex color #c0ffee/],
    ["outline-none", /removes outline without focus-visible/],
    ["cross-import", /imports non-primary file "@\/components\/ui\/other-helper" of other/],
    ["font-binary", /binary audio\/font not allowed.*face\.woff2/],
    ["missing-target", /needs target \"@ui\/thing.tsx\" for a flat consumer install/],
    ["missing-core-deps", /must list @yorha\/utils/],
  ])("rejects fixture %s", (name, message) => {
    const { errors } = lintRegistry(fixture(name));
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.join("\n")).toMatch(message);
  });

  it("accepts the real registry", () => {
    expect(lintRegistry(repo, { motionStrict: false }).errors).toEqual([]);
  });
});

describe("lintRegistry motion rule", () => {
  afterEach(() => vi.unstubAllEnvs());

  const MOTION_FIXTURES = [
    ["motion/raw-ms", [/thing\.tsx:3 motion: raw duration "250ms"/, /thing\.tsx:3 motion: raw duration "40ms"/]],
    ["motion/cubic-bezier", [/thing\.tsx:2 motion: raw cubic-bezier\(\)/]],
    ["motion/transition-all", [/thing\.tsx:2 motion: transition-all/]],
    ["motion/layout-transition", [/thing\.tsx:2 motion: transition on layout property \"width\"/]],
    ["motion/layout-transition-inset", [/thing\.tsx:2 motion: transition on layout property \"inset\"/, /thing\.tsx:2 motion: transition on layout property \"margin-left\"/]],
    ["motion/display-switch", [/thing\.tsx:2 motion: state indicator toggled by display \(`hidden` \+ `group-data-\[pressed\]\/item:block`\)/]],
    ["motion/wipe-transition", [/thing\.tsx:2 motion: ad-hoc background-size transition \(use the yorha-wipe utility/]],
    ["motion/focus-colors", [/thing\.tsx:2 motion: transition-colors on an element with focus-visible classes/]],
  ] as const;

  it("accepts tokens, utilities, identifiers and comments", () => {
    const result = lintRegistry(fixture("motion/ok"), { motionStrict: true });
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it.each(MOTION_FIXTURES)("warns on fixture %s by default", (name, messages) => {
    vi.stubEnv("YORHA_MOTION_STRICT", "");
    const result = lintRegistry(fixture(name));
    expect(result.errors).toEqual([]);
    for (const message of messages) expect((result.warnings ?? []).join("\n")).toMatch(message);
    expect(result.warnings).toHaveLength(messages.length);
  });

  it.each(MOTION_FIXTURES)("rejects fixture %s when strict", (name, messages) => {
    const result = lintRegistry(fixture(name), { motionStrict: true });
    for (const message of messages) expect(result.errors.join("\n")).toMatch(message);
    expect(result.errors).toHaveLength(messages.length);
    expect(result.warnings).toEqual([]);
  });

  it("allows a layout-property transition that carries a lint-allow comment with a reason", () => {
    const result = lintRegistry(fixture("motion/layout-allowed"), { motionStrict: true });
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it("names the transform/opacity alternative", () => {
    const { errors } = lintRegistry(fixture("motion/layout-transition"), { motionStrict: true });
    expect(errors.join("\n")).toMatch(/animate transform, opacity or colour/);
  });

  it("YORHA_MOTION_STRICT=1 turns the rule into errors", () => {
    vi.stubEnv("YORHA_MOTION_STRICT", "1");
    expect(lintRegistry(fixture("motion/transition-all")).errors.join("\n")).toMatch(/motion: transition-all/);
  });

  it("names the token or utility to use instead", () => {
    const { errors } = lintRegistry(fixture("motion/raw-ms"), { motionStrict: true });
    expect(errors.join("\n")).toMatch(/--motion-\* token or a yorha-\* motion utility/);
  });

  describe("CLI", () => {
    const run = (name: string, strict: string) =>
      spawnSync(process.execPath, [cli], { cwd: fixture(name), encoding: "utf8", env: { ...process.env, YORHA_MOTION_STRICT: strict } });

    it("prints warnings and exits 0 by default", () => {
      const result = run("motion/raw-ms", "");
      expect(result.stderr).toMatch(/warning: thing: thing\.tsx:3 motion: raw duration "250ms"/);
      expect(result.stdout).toMatch(/registry lint ok \(1 includes, 2 motion warnings\)/);
      expect(result.status).toBe(0);
    });

    it("exits 1 when YORHA_MOTION_STRICT=1", () => {
      const result = run("motion/raw-ms", "1");
      expect(result.stderr).toMatch(/thing: thing\.tsx:3 motion: raw duration "250ms"/);
      expect(result.status).toBe(1);
    });

    it("stays quiet about motion on a clean fixture", () => {
      const result = run("motion/ok", "1");
      expect(result.stderr).toBe("");
      expect(result.stdout).toMatch(/registry lint ok \(1 includes\)/);
      expect(result.status).toBe(0);
    });
  });
});

describe("lintRegistry craft rules (G16)", () => {
  afterEach(() => vi.unstubAllEnvs());

  const CRAFT_FIXTURES = [
    ["craft/td-flex", /thing\.tsx:3 craft: display:flex on a table cell/],
    ["craft/opacity-disabled", /thing\.tsx:3 craft: opacity-based disabled/],
    ["craft/text-shadow", /thing\.tsx:3 craft: text-shadow-yorha outside heading\.tsx/],
    ["craft/leading", /thing\.tsx:3 craft: leading-yorha-tight in a component/],
    ["craft/inline-svg", /thing\.tsx:3 craft: inline <svg> outside icons\/timeline/],
    ["craft/glyph-icon", /thing\.tsx:3 craft: text glyph "×" used as an icon/],
    ["craft/fractional", /thing\.tsx:3 craft: fractional arbitrary length "h-\[2\.5rem\]"/],
    ["craft/press-grouped", /thing\.tsx:3 craft: yorha-press on a grouped item/],
  ] as const;

  it("accepts a clean craft fixture, strict", () => {
    const result = lintRegistry(fixture("craft/ok"), { motionStrict: true, craftStrict: true });
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it.each(CRAFT_FIXTURES)("warns on fixture %s unless craftStrict, errors when strict", (name, message) => {
    const soft = lintRegistry(fixture(name), { motionStrict: true, craftStrict: false });
    expect(soft.errors).toEqual([]);
    expect((soft.warnings ?? []).join("\n")).toMatch(message);
    const hard = lintRegistry(fixture(name), { motionStrict: true, craftStrict: true });
    expect(hard.errors.join("\n")).toMatch(message);
  });

  it("raw control heights only ever warn (use h-control-*)", () => {
    const result = lintRegistry(fixture("craft/raw-height"), { motionStrict: true, craftStrict: true });
    expect(result.errors).toEqual([]);
    expect((result.warnings ?? []).join("\n")).toMatch(/thing\.tsx:3 craft: raw h-10 on a control \(use the h-control-\* scale\)/);
  });

  it("YORHA_CRAFT_STRICT=1 turns the rules into errors (CLI default is warnings while the sweeps land)", () => {
    const run = (strict: string) =>
      spawnSync(process.execPath, [cli], { cwd: fixture("craft/leading"), encoding: "utf8", env: { ...process.env, YORHA_MOTION_STRICT: "1", YORHA_CRAFT_STRICT: strict } });
    expect(run("").status).toBe(0);
    expect(run("1").status).toBe(1);
  });
});

describe("lintRegistry v4 fx rules (L1-L4, L6)", () => {
  const FX = [
    ["fx/keyframes-mix", [/css @keyframes yorha-fx-mixed: fx-keyframes-mix/]],
    ["fx/keyframes-props", [/yorha-fx-shadow: fx-keyframes-props: animates "text-shadow"/, /yorha-fx-shadow: fx-keyframes-props: animates "mask-image"/]],
    ["fx/steps", [/thing\.tsx:2 motion: raw steps\(\)/]],
    ["fx/on-control", [/thing\.tsx:4 motion: fx-on-control/, /thing\.tsx:5 motion: fx-on-control/]],
  ] as const;

  it("accepts the passing fixture: allowed props, mask-image in yorha-dissolve-*, step tokens, comments", () => {
    const result = lintRegistry(fixture("fx/ok"), { motionStrict: true, pixelStrict: true });
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it.each(FX)("fixture %s: warning by default, error when strict", (name, messages) => {
    const lax = lintRegistry(fixture(name), { motionStrict: false });
    expect(lax.errors).toEqual([]);
    const strict = lintRegistry(fixture(name), { motionStrict: true });
    for (const message of messages) expect(strict.errors.join("\n")).toMatch(message);
    expect(strict.errors).toHaveLength(messages.length);
    for (const message of messages) expect((lax.warnings ?? []).join("\n")).toMatch(message);
  });

  it("L6 pixel: warns on rotate-45, <svg> without crispEdges and a scale transition on an icon; the lint-allow comment passes", () => {
    const lax = lintRegistry(fixture("fx/pixel"), { motionStrict: false });
    expect(lax.errors).toEqual([]);
    const text = (lax.warnings ?? []).join("\n");
    expect(text).toMatch(/thing\.tsx:4 pixel: "rotate-45"/);
    expect(text).toMatch(/thing\.tsx:5 pixel: <svg> without shapeRendering="crispEdges"/);
    expect(text).toMatch(/thing\.tsx:6 pixel: scale transition on a glyph or icon/);
    expect(text).not.toMatch(/thing\.tsx:8 pixel/);
    expect((lax.warnings ?? []).filter((warning) => warning.includes(" pixel: "))).toHaveLength(3);
    const strict = lintRegistry(fixture("fx/pixel"), { motionStrict: false, pixelStrict: true });
    expect(strict.errors).toHaveLength(3);
  });
});
