/**
 * Pure layout for TimelineGraph (V4-050..052). No React, no DOM. Used by the component and by the drag-and-drop layer:
 * time <-> px mapping (`timeToX`, `xToTime`), step snapping (`snapTime`, `stepFor`), item geometry (`itemGeometry`),
 * row tops and pointer-y -> row (`buildRows`, `rowAtY`), sub-lane packing (`packLanes`), zoom (`resolveZoom`, `LADDER`)
 * and axis ticks (`pickTicks`). Every px result is an integer.
 */

export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;
/** px per hour; integer values keep ticks and 15-minute steps on whole pixels. */
export const LADDER = [1, 2, 4, 8, 16, 32, 64] as const;
export const PRESET_PX_PER_HOUR = { hour: 64, day: 4, week: 1 } as const;
export const MAX_CANVAS_PX = 20_000;
export const MIN_MINOR_PITCH = 48;
export const MIN_BAR_W = 6;
/** Bars narrower than this put their label outside, to the right. */
export const LABEL_OUTSIDE_W = 40;
/** Hit box of a milestone (24 px target); the dot glyph sits in its centre. */
export const MILESTONE_BOX = 24;
export const PACK_GAP = 2;

export const AXIS = { guides: 16, major: 20, minor: 20, height: 56 } as const;

export interface Metrics {
  /** Height of one sub-lane. */
  subH: number;
  /** Lane padding (top + bottom). */
  pad: number;
  /** Minimum row height. */
  rowMin: number;
  /** Bar height. */
  barH: number;
  /** Group header row height. */
  groupH: number;
}
export const METRICS: Record<"default" | "compact", Metrics> = {
  default: { subH: 28, pad: 8, rowMin: 44, barH: 24, groupH: 28 },
  compact: { subH: 24, pad: 4, rowMin: 28, barH: 24, groupH: 28 },
};

export type ZoomPreset = "hour" | "day" | "week" | "fit";
export type ZoomValue = ZoomPreset | { pxPerHour: number };

/** px per hour for a zoom value, clamped so the canvas never exceeds `MAX_CANVAS_PX`. */
export function resolveZoom(zoom: ZoomValue, ctx: { spanMs: number; viewportPx: number }): number {
  const spanH = Math.max(ctx.spanMs / HOUR, 1e-6);
  let raw: number;
  if (typeof zoom === "object") raw = zoom.pxPerHour;
  else if (zoom === "fit") raw = ctx.viewportPx > 0 ? Math.floor(Math.floor(ctx.viewportPx) / spanH * 1e6) / 1e6 : PRESET_PX_PER_HOUR.day;
  else raw = PRESET_PX_PER_HOUR[zoom];
  const max = Math.floor((MAX_CANVAS_PX / spanH) * 1e6) / 1e6;
  return Math.max(1e-6, Math.min(raw, max));
}

/** Next ladder value above (dir 1) or below (dir -1) `px`, or undefined at the end of the ladder. */
export function ladderStep(px: number, dir: 1 | -1, max = Infinity, min = 0): number | undefined {
  const next = dir === 1 ? LADDER.find((v) => v > px + 1e-9 && v <= max + 1e-9) : [...LADDER].reverse().find((v) => v < px - 1e-9 && v >= min - 1e-9);
  return next;
}

export const timeToX = (ms: number, startMs: number, pxPerHour: number) => Math.round(((ms - startMs) / HOUR) * pxPerHour);
export const xToTime = (x: number, startMs: number, pxPerHour: number) => startMs + (x / pxPerHour) * HOUR;

/** Default drag step: 15 min when zoomed in (>= 4 px/h), else 1 h. */
export const stepFor = (pxPerHour: number) => (pxPerHour >= 4 ? 15 * 60_000 : HOUR);
/** Nearest multiple of `step` counted from `origin`. */
export const snapTime = (ms: number, step: number, origin = 0) => origin + Math.round((ms - origin) / step) * step;

const labelWidth = (title: string) => {
  let w = 8;
  for (const ch of title) w += ch.charCodeAt(0) > 255 ? 12 : 7;
  return w;
};

export interface Geometry {
  instant: boolean;
  /** Left edge and width of the item box in canvas px (instant: the 24 px hit box). */
  left: number;
  width: number;
  /** Label placed outside, to the right of the box. */
  labelOutside: boolean;
  /** Occupied x range including an outside label; this is what sub-lane packing uses. */
  x0: number;
  x1: number;
}
export function itemGeometry(item: { title: string; start: number; end?: number }, ctx: { startMs: number; pxPerHour: number }): Geometry {
  const xs = timeToX(item.start, ctx.startMs, ctx.pxPerHour);
  if (item.end === undefined) {
    const left = xs - MILESTONE_BOX / 2;
    return { instant: true, left, width: MILESTONE_BOX, labelOutside: true, x0: left, x1: left + MILESTONE_BOX + labelWidth(item.title) };
  }
  const xe = timeToX(item.end, ctx.startMs, ctx.pxPerHour);
  const width = Math.max(MIN_BAR_W, xe - xs);
  const labelOutside = width < LABEL_OUTSIDE_W;
  return { instant: false, left: xs, width, labelOutside, x0: xs, x1: xs + width + (labelOutside ? 4 + labelWidth(item.title) : 0) };
}

export interface PackBox {
  id: string;
  lane: string;
  x0: number;
  x1: number;
}
export interface Packed {
  /** Sub-lane index per item id. */
  sub: Record<string, number>;
  subCount: Record<string, number>;
  /** Row height per lane id: max(rowMin, subCount * subH + pad). */
  height: Record<string, number>;
}
/** Greedy, deterministic sub-lane packing: sorted by x0, then wider first, then id; first sub-lane that is free wins. */
export function packLanes(boxes: PackBox[], lanes: { id: string }[], m: Metrics = METRICS.default): Packed {
  const sub: Record<string, number> = {};
  const subCount: Record<string, number> = {};
  const height: Record<string, number> = {};
  for (const lane of lanes) {
    const ends: number[] = [];
    const mine = boxes.filter((b) => b.lane === lane.id).sort((a, b) => a.x0 - b.x0 || b.x1 - b.x0 - (a.x1 - a.x0) || (a.id < b.id ? -1 : 1));
    for (const b of mine) {
      let i = ends.findIndex((end) => b.x0 >= end + PACK_GAP);
      if (i < 0) i = ends.length;
      ends[i] = b.x1;
      sub[b.id] = i;
    }
    subCount[lane.id] = ends.length;
    height[lane.id] = Math.max(m.rowMin, ends.length * m.subH + m.pad);
  }
  return { sub, subCount, height };
}

export interface LaneLike {
  id: string;
  label: string;
  group?: string;
}
export interface Row {
  kind: "lane" | "group";
  /** Lane id, or the group name. */
  id: string;
  top: number;
  height: number;
  collapsed?: boolean;
}
/** Row tops below the axis. Group headers appear where `lane.group` changes; lanes of a collapsed group are left out. */
export function buildRows(lanes: LaneLike[], collapsed: ReadonlySet<string>, height: Record<string, number>, m: Metrics = METRICS.default): Row[] {
  const rows: Row[] = [];
  let top = 0;
  let prev: string | undefined;
  for (const lane of lanes) {
    if (lane.group !== undefined && lane.group !== prev) {
      rows.push({ kind: "group", id: lane.group, top, height: m.groupH, collapsed: collapsed.has(lane.group) });
      top += m.groupH;
    }
    prev = lane.group;
    if (lane.group !== undefined && collapsed.has(lane.group)) continue;
    const h = height[lane.id] ?? m.rowMin;
    rows.push({ kind: "lane", id: lane.id, top, height: h });
    top += h;
  }
  return rows;
}
export const rowsHeight = (rows: Row[]) => (rows.length ? rows[rows.length - 1]!.top + rows[rows.length - 1]!.height : 0);
/** Lane row under y (px below the axis); group rows and out-of-range y give undefined. */
export function rowAtY(rows: Row[], y: number): Row | undefined {
  const row = rows.find((r) => y >= r.top && y < r.top + r.height);
  return row?.kind === "lane" ? row : undefined;
}
/** Top (px below the axis) of an item's box inside its row. */
export const itemTop = (row: Row, sub: number, m: Metrics = METRICS.default) => row.top + Math.floor(m.pad / 2) + sub * m.subH + Math.floor((m.subH - m.barH) / 2);

// ---- ticks (time-zone aware) ----

export type TickUnit = "1h" | "6h" | "12h" | "1d" | "1w" | "1mo";
const UNIT_MS: Record<Exclude<TickUnit, "1mo">, number> = { "1h": HOUR, "6h": 6 * HOUR, "12h": 12 * HOUR, "1d": DAY, "1w": 7 * DAY };
const MINOR_UNITS = ["1h", "6h", "12h", "1d", "1w"] as const;

const fmtCache = new Map<string, Intl.DateTimeFormat>();
/** Zone offset (wall - UTC) at `ms`; `timeZone` undefined = the host zone. */
export function zoneOffset(ms: number, timeZone?: string): number {
  if (!timeZone) return -new Date(ms).getTimezoneOffset() * 60_000;
  let f = fmtCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" });
    fmtCache.set(timeZone, f);
  }
  const p: Record<string, number> = {};
  for (const part of f.formatToParts(ms)) if (part.type !== "literal") p[part.type] = Number(part.value);
  return Date.UTC(p.year!, p.month! - 1, p.day!, p.hour!, p.minute!, p.second!) - Math.floor(ms / 1000) * 1000;
}
const wall = (ms: number, tz?: string) => ms + zoneOffset(ms, tz);
const fromWall = (w: number, tz?: string) => {
  const g = w - zoneOffset(w, tz);
  return w - zoneOffset(g, tz);
};
/** Day of week (0 = Sunday) of `ms` in the zone. */
export const zoneWeekday = (ms: number, tz?: string) => new Date(wall(ms, tz)).getUTCDay();

function floorUnit(ms: number, unit: TickUnit, tz?: string): number {
  const w = new Date(wall(ms, tz));
  const y = w.getUTCFullYear();
  const mo = w.getUTCMonth();
  const d = w.getUTCDate();
  const h = w.getUTCHours();
  switch (unit) {
    case "1h":
      return fromWall(Date.UTC(y, mo, d, h), tz);
    case "6h":
      return fromWall(Date.UTC(y, mo, d, h - (h % 6)), tz);
    case "12h":
      return fromWall(Date.UTC(y, mo, d, h - (h % 12)), tz);
    case "1d":
      return fromWall(Date.UTC(y, mo, d), tz);
    case "1w":
      return fromWall(Date.UTC(y, mo, d - ((w.getUTCDay() + 6) % 7)), tz);
    case "1mo":
      return fromWall(Date.UTC(y, mo, 1), tz);
  }
}
function nextUnit(tick: number, unit: TickUnit, tz?: string): number {
  if (unit === "1mo") {
    const w = new Date(wall(tick, tz));
    return fromWall(Date.UTC(w.getUTCFullYear(), w.getUTCMonth() + 1, 1), tz);
  }
  if (unit === "1d" || unit === "1w") {
    const w = new Date(wall(tick, tz));
    return fromWall(Date.UTC(w.getUTCFullYear(), w.getUTCMonth(), w.getUTCDate() + (unit === "1w" ? 7 : 1)), tz);
  }
  // hour units step in real time (whole-hour zones keep the alignment; guarantees progress across DST)
  return tick + UNIT_MS[unit];
}
function ticksBetween(startMs: number, endMs: number, unit: TickUnit, tz: string | undefined, includeFloor: boolean): number[] {
  const out: number[] = [];
  let t = floorUnit(startMs, unit, tz);
  if (!includeFloor && t < startMs) t = nextUnit(t, unit, tz);
  let guard = 0;
  while (t <= endMs && guard++ < 5000) {
    out.push(t);
    t = nextUnit(t, unit, tz);
  }
  return out;
}

export interface Ticks {
  minor: { unit: TickUnit; pitchPx: number; ticks: number[] } | null;
  /** Calendar boundaries; the first one may lie before `startMs` (the segment the range starts in). */
  major: { unit: TickUnit; ticks: number[] };
}
/**
 * Minor unit = smallest of 1 h, 6 h, 12 h, 1 d, 1 w whose pitch is >= 48 px; major = the next calendar unit
 * (day, week, month). Nothing below the minor unit is drawn.
 */
export function pickTicks(startMs: number, endMs: number, pxPerHour: number, timeZone?: string): Ticks {
  const minorUnit = MINOR_UNITS.find((u) => (UNIT_MS[u] / HOUR) * pxPerHour >= MIN_MINOR_PITCH);
  const majorUnit: TickUnit = !minorUnit || minorUnit === "1w" ? "1mo" : minorUnit === "1d" ? "1w" : "1d";
  return {
    minor: minorUnit
      ? { unit: minorUnit, pitchPx: (UNIT_MS[minorUnit] / HOUR) * pxPerHour, ticks: ticksBetween(startMs, endMs, minorUnit, timeZone, false) }
      : null,
    major: { unit: majorUnit, ticks: ticksBetween(startMs, endMs, majorUnit, timeZone, true) },
  };
}
