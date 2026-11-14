import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cn, cnState } from "./utils";

describe("cn", () => {
  it("joins truthy values and flattens arrays", () => {
    expect(cn("a", false, null, ["b", ["c"]], undefined, 0)).toBe("a b c 0");
  });
});

describe("cn tailwind-merge", () => {
  it("lets a consumer override win without `!`", () => {
    expect(cn("w-full p-0", "w-40")).toBe("p-0 w-40");
    expect(cn("px-3", "px-0", false)).toBe("px-0");
  });

  it("keeps yorha font size and colour apart, in either order", () => {
    expect(cn("text-yorha-sm", "text-yorha-fg")).toBe("text-yorha-sm text-yorha-fg");
    expect(cn("text-yorha-fg-muted", "text-yorha-lg")).toBe("text-yorha-fg-muted text-yorha-lg");
    expect(cn("text-yorha-fg text-yorha-sm", "text-yorha-xl text-yorha-alert")).toBe("text-yorha-xl text-yorha-alert");
  });

  it("merges the size-scale utilities (G2): the last control height / padding wins, widths and heights stay apart", () => {
    expect(cn("h-control-md", "h-control-sm")).toBe("h-control-sm");
    expect(cn("h-control-md", "h-9")).toBe("h-9");
    expect(cn("h-9", "h-control-lg")).toBe("h-control-lg");
    expect(cn("px-pad-md", "px-3")).toBe("px-3");
    expect(cn("px-3", "px-pad-sm")).toBe("px-pad-sm");
    expect(cn("size-control-md", "size-icon-sm")).toBe("size-icon-sm");
    expect(cn("min-h-row", "min-h-0")).toBe("min-h-0");
    expect(cn("h-control-md", "w-control-md")).toBe("h-control-md w-control-md");
    expect(cn("size-indicator", "size-bullet")).toBe("size-bullet");
    expect(cn("leading-yorha-latin", "leading-none")).toBe("leading-none");
  });

  it("replaces yorha motion utilities with the last one", () => {
    expect(cn("yorha-pop", "yorha-fade")).toBe("yorha-fade");
    expect(cn("yorha-slide-up yorha-stagger", "yorha-slide-left")).toBe("yorha-stagger yorha-slide-left");
  });

  it("resolves tracking, radius, shadow, text-shadow, ease and duration tokens", () => {
    expect(cn("tracking-yorha-wide", "tracking-yorha-heading")).toBe("tracking-yorha-heading");
    expect(cn("rounded-yorha", "rounded-full")).toBe("rounded-full");
    expect(cn("shadow-yorha-sm", "shadow-yorha-lg")).toBe("shadow-yorha-lg");
    expect(cn("text-shadow-yorha", "text-shadow-none")).toBe("text-shadow-none");
    expect(cn("ease-yorha", "ease-yorha-in")).toBe("ease-yorha-in");
    expect(cn("duration-(--motion-press)", "duration-(--motion-select)")).toBe("duration-(--motion-select)");
  });

  it("covers every yorha token in the generated @theme block", () => {
    const css = readFileSync(new URL("../../../../src/styles/tokens.generated.css", import.meta.url), "utf8");
    const theme = /@theme inline \{([\s\S]*?)\n\}/.exec(css)?.[1] ?? "";
    const names = [...theme.matchAll(/--([a-z-]+?)-(yorha[a-z0-9-]*|yorha):/g)].map((m) => [m[1] ?? "", m[2] ?? ""] as const);
    expect(names.length).toBeGreaterThan(40);
    const bad: string[] = [];
    for (const [group, name] of names) {
      if (name.includes("--line-height")) continue;
      // a later value of the same kind must replace this one
      const pairs: Record<string, [string, string] | undefined> = {
        color: [`text-${name}`, "text-red-500"],
        text: [`text-${name}`, "text-sm"],
        tracking: [`tracking-${name}`, "tracking-tight"],
        radius: [`rounded-${name}`, "rounded-full"],
        shadow: [`shadow-${name}`, "shadow-none"],
        ease: [`ease-${name}`, "ease-linear"],
        leading: [`leading-${name}`, "leading-none"],
        font: [`font-${name}`, "font-sans"],
        "font-weight": [`font-${name}`, "font-thin"],
      };
      if (group === "color") {
        if (cn(`bg-${name}`, "bg-red-500") !== "bg-red-500") bad.push(`bg-${name}`);
        continue;
      }
      const pair = pairs[group];
      if (!pair) continue;
      if (cn(pair[0], pair[1]) !== pair[1]) bad.push(pair[0]);
    }
    expect(bad).toEqual([]);
    expect(cn("text-shadow-yorha", "text-shadow-none")).toBe("text-shadow-none");
  });
});

describe("cn size scale", () => {
  it("knows every --spacing-* key of the generated @theme block", () => {
    const css = readFileSync(new URL("../../../../src/styles/tokens.generated.css", import.meta.url), "utf8");
    const theme = /@theme inline \{([\s\S]*?)\n\}/.exec(css)?.[1] ?? "";
    const keys = [...theme.matchAll(/--spacing-([a-z-]+):/g)].map((m) => m[1] ?? "");
    expect(keys).toEqual(expect.arrayContaining(["control-sm", "control-md", "control-lg", "row", "pad-sm", "pad-md", "pad-lg", "indicator", "bullet", "icon-sm", "icon-md", "icon-lg"]));
    const bad = keys.filter((key) => cn(`h-${key}`, "h-9") !== "h-9" || cn("h-9", `h-${key}`) !== `h-${key}` || cn(`px-${key}`, "px-3") !== "px-3");
    expect(bad).toEqual([]);
  });
});

describe("cn state colours (G7)", () => {
  it("keeps bg-yorha-hover and bg-yorha-ink as one colour group, text-yorha-disabled apart from text sizes", () => {
    expect(cn("bg-yorha-hover", "bg-yorha-pressed")).toBe("bg-yorha-pressed");
    expect(cn("bg-yorha-ink", "bg-yorha-hover")).toBe("bg-yorha-hover");
    expect(cn("text-yorha-sm", "text-yorha-disabled")).toBe("text-yorha-sm text-yorha-disabled");
    expect(cn("border-yorha-border", "border-yorha-disabled")).toBe("border-yorha-disabled");
    expect(cn("border", "border-yorha-disabled")).toBe("border border-yorha-disabled");
  });
});

describe("cnState", () => {
  it("returns a string for string className", () => {
    expect(cnState("base", "extra")).toBe("base extra");
  });
  it("merges conflicts in the string and function forms", () => {
    expect(cnState("w-full", "w-40")).toBe("w-40");
    const f = cnState<{ open: boolean }>("w-full text-yorha-sm", (s) => (s.open ? "w-40 text-yorha-fg" : undefined));
    expect((f as (s: { open: boolean }) => string)({ open: true })).toBe("text-yorha-sm w-40 text-yorha-fg");
    expect((f as (s: { open: boolean }) => string)({ open: false })).toBe("w-full text-yorha-sm");
  });
  it("returns a function for function className", () => {
    const f = cnState<{ open: boolean }>("base", (s) => (s.open ? "on" : "off"));
    expect(typeof f).toBe("function");
    expect((f as (s: { open: boolean }) => string)({ open: true })).toBe("base on");
  });
});
