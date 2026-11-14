import { describe, expect, it } from "vitest";
import { cn, cnState } from "./utils";

describe("cn", () => {
  it("joins truthy values and flattens arrays", () => {
    expect(cn("a", false, null, ["b", ["c"]], undefined, 0)).toBe("a b c 0");
  });
});

describe("cnState", () => {
  it("returns a string for string className", () => {
    expect(cnState("base", "extra")).toBe("base extra");
  });
  it("returns a function for function className", () => {
    const f = cnState<{ open: boolean }>("base", (s) => (s.open ? "on" : "off"));
    expect(typeof f).toBe("function");
    expect((f as (s: { open: boolean }) => string)({ open: true })).toBe("base on");
  });
});
