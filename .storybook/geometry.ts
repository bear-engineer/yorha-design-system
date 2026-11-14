/**
 * Geometry assertions (G15). Pure DOM, no test-runner import: they throw a plain Error with the measured
 * values, so they work from story play functions (storybook/test) and from stability/ (vitest) alike.
 * A layout-heavy item is not done without one of these; a screenshot is never the only proof.
 */
const TOL = 0.5;

const rect = (el: Element) => el.getBoundingClientRect();
const fmt = (n: number) => Number(n.toFixed(2));
const name = (el: Element) => {
  const id = el.getAttribute("data-slot") ?? el.getAttribute("role") ?? "";
  const text = (el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 16);
  return `<${el.tagName.toLowerCase()}${id ? ` ${id}` : ""}${text ? ` "${text}"` : ""}>`;
};
function fail(message: string): never {
  throw new Error(`geometry: ${message}`);
}
const near = (a: number, b: number, tol = TOL) => Math.abs(a - b) <= tol;

/** Distinct values after clustering within `tol`, ascending. */
function cluster(values: number[], tol = TOL): number[] {
  const out: number[] = [];
  for (const v of [...values].sort((a, b) => a - b)) if (out.length === 0 || v - out[out.length - 1]! > tol) out.push(v);
  return out;
}

/** Cells form `rows` rows (each sharing one y) of `columns` cells (distinct x with an equal pitch), all of one width and height. */
export function expectGrid(cells: Element[], { columns, rows }: { columns: number; rows?: number }): void {
  const first = cells[0];
  if (!first) fail("expectGrid: no cells");
  const rects = cells.map(rect);
  const firstRect = rect(first);
  const ys = cluster(rects.map((r) => r.top));
  const xs = cluster(rects.map((r) => r.left));
  if (xs.length !== columns) fail(`expectGrid: ${xs.length} distinct x positions, expected ${columns} columns (${xs.map(fmt).join(", ")})`);
  if (rows !== undefined && ys.length !== rows) fail(`expectGrid: ${ys.length} rows, expected ${rows} (${ys.map(fmt).join(", ")})`);
  if (rows !== undefined && cells.length !== rows * columns) fail(`expectGrid: ${cells.length} cells, expected ${rows * columns}`);
  for (const y of ys) {
    const inRow = rects.filter((r) => near(r.top, y));
    if (inRow.length !== columns) fail(`expectGrid: row at y=${fmt(y)} has ${inRow.length} cells, expected ${columns}`);
  }
  const pitches = xs.slice(1).map((x, i) => x - xs[i]!);
  for (const p of pitches) if (!near(p, pitches[0]!)) fail(`expectGrid: unequal column pitch ${pitches.map(fmt).join(", ")}`);
  for (const [i, r] of rects.entries()) {
    if (!near(r.width, firstRect.width) || !near(r.height, firstRect.height)) {
      fail(`expectGrid: cell ${i} ${name(cells[i]!)} is ${fmt(r.width)}x${fmt(r.height)}, first cell is ${fmt(firstRect.width)}x${fmt(firstRect.height)}`);
    }
  }
}

export function expectSameHeight(...els: Element[]): void {
  const first = rect(els[0]!).height;
  for (const el of els) if (!near(rect(el).height, first)) fail(`expectSameHeight: ${els.map((e) => `${name(e)} ${fmt(rect(e).height)}`).join(", ")}`);
}

export function expectSameLeft(...els: Element[]): void {
  const first = rect(els[0]!).left;
  for (const el of els) if (!near(rect(el).left, first)) fail(`expectSameLeft: ${els.map((e) => `${name(e)} ${fmt(rect(e).left)}`).join(", ")}`);
}

/** The element's box lies inside the viewport with `pad` px to spare on every side. */
export function expectWithinViewport(el: Element, pad = 8): void {
  const r = rect(el);
  const width = document.documentElement.clientWidth;
  const height = window.innerHeight;
  if (r.left < pad - TOL || r.top < pad - TOL || r.right > width - pad + TOL || r.bottom > height - pad + TOL) {
    fail(`expectWithinViewport: ${name(el)} [${fmt(r.left)}, ${fmt(r.top)}, ${fmt(r.right)}, ${fmt(r.bottom)}] outside ${width}x${height} with pad ${pad}`);
  }
}

/** Popup sits `gap` px under the anchor and aligns its start, centre or end edge with it. */
export function expectAnchoredBelow(popup: Element, anchor: Element, { gap = 8, align = "start" }: { gap?: number; align?: "start" | "center" | "end" } = {}): void {
  const p = rect(popup);
  const a = rect(anchor);
  if (!near(p.top - a.bottom, gap, 1)) fail(`expectAnchoredBelow: gap ${fmt(p.top - a.bottom)}, expected ${gap}`);
  const [got, want] = align === "start" ? [p.left, a.left] : align === "end" ? [p.right, a.right] : [p.left + p.width / 2, a.left + a.width / 2];
  if (!near(got, want, 1)) fail(`expectAnchoredBelow: ${align} edge ${fmt(got)}, anchor ${fmt(want)}`);
}

/** Intersection area of the two boxes is zero (touching edges are fine). */
export function expectNoOverlap(a: Element, b: Element): void {
  const ra = rect(a);
  const rb = rect(b);
  const w = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
  const h = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
  if (w > TOL && h > TOL) fail(`expectNoOverlap: ${name(a)} and ${name(b)} overlap by ${fmt(w)}x${fmt(h)}`);
}

export function expectCentered(inner: Element, outer: Element, tol = TOL): void {
  const i = rect(inner);
  const o = rect(outer);
  const dx = i.left + i.width / 2 - (o.left + o.width / 2);
  const dy = i.top + i.height / 2 - (o.top + o.height / 2);
  if (Math.abs(dx) > tol || Math.abs(dy) > tol) fail(`expectCentered: ${name(inner)} off centre by dx ${fmt(dx)}, dy ${fmt(dy)}`);
}

const isWhole = (v: number) => {
  const device = v * (window.devicePixelRatio || 1);
  return Math.abs(device - Math.round(device)) < 0.01;
};

/** Top and height are whole device pixels ("y", default); "xy" also checks left and width (fixed squares). */
export function expectPixelSnapped(el: Element, { axes = "y" }: { axes?: "y" | "xy" } = {}): void {
  const r = rect(el);
  const bad: string[] = [];
  if (!isWhole(r.top)) bad.push(`top ${fmt(r.top)}`);
  if (!isWhole(r.height)) bad.push(`height ${fmt(r.height)}`);
  if (axes === "xy") {
    if (!isWhole(r.left)) bad.push(`left ${fmt(r.left)}`);
    if (!isWhole(r.width)) bad.push(`width ${fmt(r.width)}`);
  }
  if (bad.length) fail(`expectPixelSnapped(${axes}): ${name(el)} ${bad.join(", ")}`);
}

/** All text of the element renders on one line (every line box shares one top). */
export function expectSingleLine(el: Element): void {
  const range = document.createRange();
  range.selectNodeContents(el);
  const tops = cluster([...range.getClientRects()].filter((r) => r.width > 0).map((r) => r.top), 2);
  if (tops.length > 1) fail(`expectSingleLine: ${name(el)} wraps onto ${tops.length} lines`);
}
