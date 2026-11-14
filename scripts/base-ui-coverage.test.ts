import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  computeCoverage,
  listComponents,
  namespaceOf,
  renderMarkdown,
  runCoverage,
  scanSources,
  validateExceptions,
} from "./base-ui-coverage.mjs";

const FIX = fileURLToPath(new URL("./fixtures/coverage/", import.meta.url));
const SCRIPT = fileURLToPath(new URL("./base-ui-coverage.mjs", import.meta.url));
const BASE_UI = join(FIX, "base-ui");

const exportsMap = {
  ".": { require: "./index.cjs" },
  "./package.json": "./package.json",
  "./checkbox": { require: "./checkbox.cjs" },
  "./tabs": { require: "./tabs.cjs" },
  "./merge-props": { require: "./merge-props.cjs" },
  "./use-render": { require: "./use-render.cjs" },
  "./types": { require: "./types.cjs" },
  "./unstable-thing": { require: "./unstable-thing.cjs" },
  "./internals/helper": { require: "./internals-helper.cjs" },
};

describe("listComponents", () => {
  it("keeps public components and drops internals, types, merge-props, use-render, unstable-*", () => {
    expect(listComponents(exportsMap)).toEqual(["checkbox", "tabs"]);
  });
});

describe("namespaceOf", () => {
  it("lists parts and skips DataAttributes/CssVariables exports", () => {
    const mod = createRequire(join(BASE_UI, "package.json"))(join(BASE_UI, "checkbox.cjs"));
    expect(namespaceOf("checkbox", mod)).toEqual({ name: "Checkbox", parts: ["Root", "Indicator"] });
  });

  it("returns no parts for a single $$typeof component", () => {
    const mod = { Button: { $$typeof: Symbol.for("react.forward_ref"), render: () => null }, ButtonDataAttributes: {} };
    expect(namespaceOf("button", mod)).toEqual({ name: null, parts: [] });
  });
});

const src = `import {
  Tabs as TabsPrimitive,
} from "@base-ui/react/tabs";
import type { Checkbox as C } from "@base-ui/react/checkbox";
export const a = [TabsPrimitive.Root, TabsPrimitive.Tab];
export const b = C.Root;
`;

describe("scanSources", () => {
  it("records aliased, multi-line and type-only imports plus member usage", () => {
    const u = scanSources([{ path: "registry/yorha/ui/tabs/tabs.tsx", text: src }]);
    expect(u.tabs).toEqual({ dirs: ["registry/yorha/ui/tabs"], members: ["Root", "Tab"] });
    expect(u.checkbox?.members).toEqual(["Root"]);
  });

  it("ignores story files", () => {
    expect(scanSources([{ path: "registry/yorha/ui/tabs/tabs.stories.tsx", text: src }])).toEqual({});
  });
});

const comps = [
  { component: "tabs", namespace: "Tabs", parts: ["Root", "List", "Tab", "Panel"] },
  { component: "accordion", namespace: "Accordion", parts: ["Root"] },
];
const usages = { tabs: { dirs: ["registry/yorha/ui/tabs"], members: ["Root", "List", "Tab"] } };

describe("computeCoverage", () => {
  it("fails an unused part and an uncovered component", () => {
    const { failures } = computeCoverage(comps, usages, []);
    expect(failures.join("\n")).toMatch(/tabs: part Tabs\.Panel not used/);
    expect(failures.join("\n")).toMatch(/accordion: no registry item imports @base-ui\/react\/accordion/);
  });

  it("accepts reasoned waivers and reports them", () => {
    const exc = [
      { component: "tabs", part: "Panel", reason: "not needed yet" },
      { component: "accordion", reason: "T6" },
    ];
    const r = computeCoverage(comps, usages, exc);
    expect(r.failures).toEqual([]);
    expect(r.rows.find((x) => x.component === "tabs")?.waived).toEqual(["Panel"]);
  });

  it("rejects an empty reason, an unknown component and an unknown part", () => {
    const errors = validateExceptions(
      [
        { component: "tabs", part: "Panel", reason: "  " },
        { component: "nope", reason: "x" },
        { component: "tabs", part: "Nope", reason: "x" },
      ],
      comps,
    );
    expect(errors.join("\n")).toMatch(/reason/);
    expect(errors.join("\n")).toMatch(/unknown component "nope"/);
    expect(errors.join("\n")).toMatch(/unknown part tabs\.Nope/);
  });
});

describe("runCoverage", () => {
  it("passes the ok fixture", () => {
    const r = runCoverage({ root: join(FIX, "ok"), baseUiDir: BASE_UI });
    expect(r.failures).toEqual([]);
    expect(r.rows.map((x) => x.component)).toEqual(["checkbox", "tabs"]);
  });

  it("fails when a part is removed from a wrapper (story usage does not count)", () => {
    const r = runCoverage({ root: join(FIX, "removed-part"), baseUiDir: BASE_UI });
    expect(r.failures.join("\n")).toMatch(/tabs: part Tabs\.Panel not used/);
  });

  it("fails when a public component has no registry item", () => {
    const r = runCoverage({ root: join(FIX, "missing-component"), baseUiDir: BASE_UI });
    expect(r.failures.join("\n")).toMatch(/tabs: no registry item imports/);
  });

  it("accepts a reasoned waiver for the removed part", () => {
    const r = runCoverage({
      root: join(FIX, "removed-part"),
      baseUiDir: BASE_UI,
      exceptionsPath: join(FIX, "exceptions", "waived.json"),
    });
    expect(r.failures).toEqual([]);
  });

  it("rejects a blank waiver reason", () => {
    const r = runCoverage({
      root: join(FIX, "ok"),
      baseUiDir: BASE_UI,
      exceptionsPath: join(FIX, "exceptions", "empty-reason.json"),
    });
    expect(r.failures.join("\n")).toMatch(/reason/);
  });

  it("renders a markdown table with item dir and missing parts", () => {
    const r = runCoverage({ root: join(FIX, "removed-part"), baseUiDir: BASE_UI });
    expect(r.markdown).toMatch(/\| Component \| Item dir \| Parts used\/total \| Missing \|/);
    expect(r.markdown).toMatch(/\| tabs \| registry\/yorha\/ui\/tabs \| 3\/4 \| Tabs\.Panel \|/);
    expect(renderMarkdown(r.rows, r.failures)).toBe(r.markdown);
  });
});

describe("CLI", () => {
  it("exits 0 on the ok fixture and 1 when a part is removed", () => {
    const ok = spawnSync(process.execPath, [SCRIPT, "--root", join(FIX, "ok"), "--base-ui", BASE_UI], {
      encoding: "utf8",
    });
    expect(ok.status).toBe(0);
    const bad = spawnSync(process.execPath, [SCRIPT, "--root", join(FIX, "removed-part"), "--base-ui", BASE_UI], {
      encoding: "utf8",
    });
    expect(bad.status).toBe(1);
    expect(bad.stderr).toMatch(/Tabs\.Panel/);
  });

  it("--report prints the markdown table to stdout", () => {
    const r = spawnSync(process.execPath, [SCRIPT, "--report", "--root", join(FIX, "removed-part"), "--base-ui", BASE_UI], {
      encoding: "utf8",
    });
    expect(r.stdout).toMatch(/\| tabs \| registry\/yorha\/ui\/tabs \| 3\/4 \| Tabs\.Panel \|/);
  });
});
