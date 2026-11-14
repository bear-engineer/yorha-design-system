import { describe, expect, it } from "vitest";
import { tickCount } from "./typer";

describe("tickCount (FTXT-05)", () => {
  const chars = Array.from("abc de fgh");

  it("counts only revealed non-whitespace graphemes", () => {
    expect(tickCount(chars, 10)).toBe(8);
    expect(tickCount(chars, 4)).toBe(3);
    expect(tickCount(chars, 0)).toBe(0);
  });
});
