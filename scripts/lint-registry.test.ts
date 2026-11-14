import { describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { lintRegistry } from "./lint-registry.mjs";

const fixture = (n: string) => fileURLToPath(new URL(`./fixtures/${n}`, import.meta.url));
const repo = fileURLToPath(new URL("..", import.meta.url));

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
    ["missing-core-deps", /must list @yorha\/utils/],
  ])("rejects fixture %s", (name, message) => {
    const { errors } = lintRegistry(fixture(name));
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.join("\n")).toMatch(message);
  });

  it("accepts the real registry", () => {
    expect(lintRegistry(repo).errors).toEqual([]);
  });
});
