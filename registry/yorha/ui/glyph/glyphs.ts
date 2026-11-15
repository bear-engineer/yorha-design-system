import { gridPath, pad, rasterize, type Grid, type GlyphBox, type GlyphSpec, type Pt } from "./glyph-core";

const D = (x: number, y: number): Pt => [x, y];
const sq = (x0: number, y0: number, x1: number, y1: number): Pt[] => [D(x0, y0), D(x1, y0), D(x1, y1), D(x0, y1), D(x0, y0)];
const DIAMOND_RING: Pt[] = [D(6, 1), D(11, 6), D(6, 11), D(1, 6), D(6, 1)];
const EYE: Pt[] = [D(1, 8), D(4, 4), D(12, 4), D(15, 8), D(12, 12), D(4, 12), D(1, 8)];
const arrow = (a: Pt, b: Pt, head: readonly Pt[]): GlyphSpec => ({ box: 12, stroke: [[a, b], head] });

/**
 * The glyph set. Where an icon exists the geometry is the icon's own whole-pixel coordinates, rasterised without
 * anti-aliasing (2x2 brush, Bresenham, polygon fill at cell centres). Everything else is rects, rings and polygons
 * on the same grid. 12 px is the native box unless noted.
 */
export const GLYPHS = {
  check: { box: 12, stroke: [[D(2, 6), D(5, 9), D(10, 3)]] },
  cross: { box: 12, stroke: [[D(2, 2), D(10, 10)], [D(10, 2), D(2, 10)]] },
  plus: { box: 12, stroke: [[D(6, 2), D(6, 10)], [D(2, 6), D(10, 6)]] },
  minus: { box: 12, stroke: [[D(2, 6), D(10, 6)]] },
  "chevron-down": { box: 12, stroke: [[D(2, 4), D(6, 8), D(10, 4)]], alt: { 16: { box: 16, stroke: [[D(3, 6), D(8, 11), D(13, 6)]] } } },
  "chevron-up": { box: 12, stroke: [[D(2, 8), D(6, 4), D(10, 8)]], alt: { 16: { box: 16, stroke: [[D(3, 10), D(8, 5), D(13, 10)]] } } },
  "chevron-left": { box: 12, stroke: [[D(8, 2), D(4, 6), D(8, 10)]], alt: { 16: { box: 16, stroke: [[D(10, 3), D(5, 8), D(10, 13)]] } } },
  "chevron-right": { box: 12, stroke: [[D(4, 2), D(8, 6), D(4, 10)]], alt: { 16: { box: 16, stroke: [[D(6, 3), D(11, 8), D(6, 13)]] } } },
  "triangle-right": { box: 12, fill: [[D(3, 1), D(9, 6), D(3, 11)]] },
  "triangle-left": { box: 12, fill: [[D(9, 1), D(3, 6), D(9, 11)]] },
  "triangle-down": { box: 12, fill: [[D(1, 3), D(11, 3), D(6, 9)]] },
  "triangle-up": { box: 12, fill: [[D(1, 9), D(11, 9), D(6, 3)]] },
  sort: { box: 12, stroke: [[D(3, 5), D(6, 2), D(9, 5)], [D(3, 7), D(6, 10), D(9, 7)]] },
  grip: { box: 12, rect: [[3, 1, 2, 2], [7, 1, 2, 2], [3, 5, 2, 2], [7, 5, 2, 2], [3, 9, 2, 2], [7, 9, 2, 2]] },
  diamond: { box: 12, fill: [[D(6, 0), D(12, 6), D(6, 12), D(0, 6)]] },
  "diamond-ring": { box: 12, stroke: [DIAMOND_RING] },
  "diamond-dot": { box: 12, stroke: [DIAMOND_RING], rect: [[5, 5, 2, 2]] },
  "diamond-target": { box: 16, stroke: [[D(8, 1), D(15, 8), D(8, 15), D(1, 8), D(8, 1)]], fill: [[D(8, 5), D(11, 8), D(8, 11), D(5, 8)]] },
  square: { box: 12, rect: [[2, 2, 8, 8]] },
  "square-x": { box: 12, rect: [[1, 1, 10, 10]], erase: [[D(3, 3), D(8, 8)], [D(8, 3), D(3, 8)], [D(4, 3), D(8, 7)], [D(7, 3), D(3, 7)]] },
  disc: { box: 12, disc: [[6, 6, 4]] },
  ring: { box: 12, ring: [[6, 6, 5]] },
  alert: { box: 12, fill: [[D(6, 1), D(11, 11), D(1, 11)]], erase: [[D(5, 5), D(5, 7)], [D(6, 5), D(6, 7)], [D(5, 9), D(5, 9)], [D(6, 9), D(6, 9)], [D(5, 8), D(5, 8)], [D(6, 8), D(6, 8)]] },
  info: { box: 12, ring: [[6, 6, 5]], rect: [[5, 3, 2, 2], [5, 6, 2, 3]] },
  lock: { box: 12, rect: [[2, 5, 8, 6]], stroke: [[D(4, 5), D(4, 2), D(8, 2), D(8, 5)]], erase: [[D(5, 7), D(5, 8)], [D(6, 7), D(6, 8)]] },
  copy: { box: 12, stroke: [[D(2, 7), D(2, 2), D(7, 2)], sq(5, 5, 10, 10)] },
  dots: { box: 12, rect: [[1, 5, 2, 2], [5, 5, 2, 2], [9, 5, 2, 2]] },
  "arrow-right": arrow(D(2, 6), D(10, 6), [D(6, 2), D(10, 6), D(6, 10)]),
  "arrow-left": arrow(D(2, 6), D(10, 6), [D(6, 2), D(2, 6), D(6, 10)]),
  "arrow-down": arrow(D(6, 2), D(6, 10), [D(2, 6), D(6, 10), D(10, 6)]),
  "arrow-up": arrow(D(6, 2), D(6, 10), [D(2, 6), D(6, 2), D(10, 6)]),
  calendar: { box: 16, stroke: [sq(2, 3, 14, 14), [D(2, 7), D(14, 7)], [D(5, 1), D(5, 4)], [D(11, 1), D(11, 4)]] },
  clock: { box: 16, ring: [[8, 8, 6]], stroke: [[D(8, 4), D(8, 8), D(11, 8)]] },
  search: { box: 16, ring: [[7, 7, 5]], stroke: [[D(11, 11), D(14, 14)]] },
  eye: { box: 16, stroke: [EYE], rect: [[7, 7, 2, 2]] },
  "eye-off": { box: 16, stroke: [EYE, [D(2, 14), D(14, 2)]] },
} as const satisfies Record<string, GlyphSpec>;

export type GlyphName = keyof typeof GLYPHS;
export const GLYPH_NAMES = Object.keys(GLYPHS) as readonly GlyphName[];
export const nativeBox = (name: GlyphName): GlyphBox => GLYPHS[name].box;

const cache = new Map<string, Grid>();
/** Bitmap of a glyph in `box` (native drawing when one exists for that box, else the native bitmap centred). */
export function glyphGrid(name: GlyphName, box: GlyphBox = nativeBox(name)): Grid {
  const key = `${name}@${box}`;
  let g = cache.get(key);
  if (!g) {
    const base = GLYPHS[name] as GlyphSpec;
    const alt = base.alt?.[box];
    g = alt ? rasterize(alt) : pad(rasterize(base), box);
    cache.set(key, g);
  }
  return g;
}

const paths = new Map<string, string>();
/** Merged-rect path (`M x y h w v h h -w Z ...`) of a glyph; memoised. */
export function glyphPath(name: GlyphName, box: GlyphBox = nativeBox(name)): string {
  const key = `${name}@${box}`;
  let d = paths.get(key);
  if (d === undefined) {
    d = gridPath(glyphGrid(name, box));
    paths.set(key, d);
  }
  return d;
}
