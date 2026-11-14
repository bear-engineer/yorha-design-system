import { describe, expect, it } from "vitest";
import { restingGlyphs } from "./decipher";

describe("restingGlyphs (FTXT-06)", () => {
  it("first paint is deterministic and not one repeated glyph", () => {
    const graphemes = Array.from("가나다라마바사아");
    const glyphs = restingGlyphs(graphemes);
    expect(restingGlyphs(graphemes)).toEqual(glyphs);
    expect(new Set(glyphs).size).toBeGreaterThan(1);
  });
});
