/**
 * glyph-core: pure functions (no React, no DOM) for the YoRHa dot-glyph set.
 *
 * Grid: 1 CSS px per cell; glyph boxes are 12 / 16 / 20 cells (= px, the boxes the icons use). A glyph is a set of ON cells. It is drawn as merged <path> rects
 * with `shape-rendering="crispEdges"`, filled with currentColor, and may only be scaled by whole numbers (1, 2, 3).
 *
 * Authoring rule: a glyph is NOT hand-pixelled when an icon already exists. It is the same 2px square-cap
 * geometry as icons.tsx, rasterised WITHOUT anti-aliasing (2x2 brush, Bresenham). So `check` here and
 * `CheckIcon` share one source of truth and one set of coordinates.
 */
export type GlyphBox = 12 | 16 | 20;
export type Pt = readonly [number, number];

export interface GlyphSpec {
  box: GlyphBox;
  /** open/closed polylines drawn with the 2px brush; coordinates are the same whole-pixel coords as icons.tsx */
  stroke?: readonly (readonly Pt[])[];
  /** filled polygons (point-in-polygon at cell centres) */
  fill?: readonly (readonly Pt[])[];
  /** ring: [cx, cy, r] with a 2px wall (same as <circle r stroke-width=2>) */
  ring?: readonly (readonly [number, number, number])[];
  /** solid disc [cx, cy, r] */
  disc?: readonly (readonly [number, number, number])[];
  /** solid rects [x, y, w, h] */
  rect?: readonly (readonly [number, number, number, number])[];
  /** knock-out polylines, 1px brush (applied last): carves a mark out of a solid glyph */
  erase?: readonly (readonly Pt[])[];
  /** the same glyph drawn natively in another box (e.g. chevron at 16); other boxes centre the native bitmap */
  alt?: Partial<Record<GlyphBox, GlyphSpec>>;
  /** explicit bitmap rows ("#" = on); used when raster output needs a hand tweak */
  rows?: readonly string[];
}

export type Grid = boolean[][];

const blank = (n: number): Grid => Array.from({ length: n }, () => Array<boolean>(n).fill(false));

function put(g: Grid, x: number, y: number) {
  if (y >= 0 && y < g.length && x >= 0 && x < g.length) g[y]![x] = true;
}

/** 2x2 brush centred on a pixel EDGE (x-1..x), the way a 2px stroke on a whole-pixel coordinate covers pixels. */
function brush(g: Grid, x: number, y: number) {
  put(g, x - 1, y - 1);
  put(g, x, y - 1);
  put(g, x - 1, y);
  put(g, x, y);
}

function line(g: Grid, [x0, y0]: Pt, [x1, y1]: Pt) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  if (n === 0) return brush(g, x0, y0);
  for (let i = 0; i <= n; i++) brush(g, Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n));
}

function inPoly(poly: readonly Pt[], px: number, py: number) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]!;
    const [xj, yj] = poly[j]!;
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function rasterize(spec: GlyphSpec): Grid {
  const n = spec.box;
  const g = blank(n);
  if (spec.rows) {
    spec.rows.forEach((row, y) => [...row].forEach((c, x) => c === "#" && put(g, x, y)));
  }
  for (const pts of spec.stroke ?? []) for (let i = 0; i < pts.length - 1; i++) line(g, pts[i]!, pts[i + 1]!);
  for (const poly of spec.fill ?? [])
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (inPoly(poly, x + 0.5, y + 0.5)) put(g, x, y);
  for (const [cx, cy, r] of spec.ring ?? [])
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        if (d >= r - 1 && d <= r + 1) put(g, x, y);
      }
  for (const [cx, cy, r] of spec.disc ?? [])
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= r) put(g, x, y);
  for (const [rx, ry, w, h] of spec.rect ?? []) for (let y = ry; y < ry + h; y++) for (let x = rx; x < rx + w; x++) put(g, x, y);
  for (const pts of spec.erase ?? [])
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i]!;
      const [x1, y1] = pts[i + 1]!;
      const m = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
      for (let k = 0; k <= m; k++) {
        const x = Math.round(x0 + ((x1 - x0) * k) / m);
        const y = Math.round(y0 + ((y1 - y0) * k) / m);
        if (y >= 0 && y < n && x >= 0 && x < n) g[y]![x] = false;
      }
    }
  return g;
}

/** Merge ON cells into the fewest rects: horizontal runs, then equal runs on consecutive rows. Returns one `d` string. */
export function gridPath(g: Grid): string {
  type Run = { x: number; w: number; y: number; h: number };
  const open = new Map<string, Run>();
  const out: Run[] = [];
  g.forEach((row, y) => {
    const seen = new Set<string>();
    for (let x = 0; x < row.length; ) {
      if (!row[x]) {
        x++;
        continue;
      }
      let w = 0;
      while (row[x + w]) w++;
      const key = `${x}:${w}`;
      seen.add(key);
      const prev = open.get(key);
      if (prev && prev.y + prev.h === y) prev.h++;
      else {
        const run = { x, w, y, h: 1 };
        open.set(key, run);
        out.push(run);
      }
      x += w;
    }
    for (const k of [...open.keys()]) if (!seen.has(k)) open.delete(k);
  });
  return out.map((r) => `M${r.x} ${r.y}h${r.w}v${r.h}h${-r.w}Z`).join("");
}

/** Centre a native-box bitmap in a larger box (integer offset only: boxes are all even). */
export function pad(g: Grid, box: number): Grid {
  const n = g.length;
  if (box === n) return g;
  if (box < n) throw new Error(`glyph box ${box} is smaller than its native box ${n}`);
  const off = (box - n) / 2;
  const out = blank(box);
  g.forEach((row, y) => row.forEach((on, x) => on && (out[y + off]![x + off] = true)));
  return out;
}

export const rows = (g: Grid) => g.map((r) => r.map((c) => (c ? "#" : ".")).join(""));
