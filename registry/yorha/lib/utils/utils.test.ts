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
    const names = [...theme.matchAll(/--([a-z-]+?)-(yorha[a-z0-9-]*|yorha):/g)].map((m) => [m[1], m[2]] as const);
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
