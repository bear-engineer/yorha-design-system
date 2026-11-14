import { afterEach, describe, expect, it, vi } from "vitest";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { lintRegistry as lintRegistryUntyped } from "./lint-registry.mjs";

// The motion rule adds `options` and `warnings`; typed here so the test does not depend on the declaration file.
type LintRegistry = (rootDir?: string, options?: { motionStrict?: boolean }) => { errors: string[]; warnings?: string[]; includes: number };
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
