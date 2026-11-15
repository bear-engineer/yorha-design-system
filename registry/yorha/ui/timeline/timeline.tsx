import * as React from "react";
import { Glyph, type GlyphName } from "@/components/ui/glyph";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import {
  AXIS,
  HOUR,
  METRICS,
  buildRows,
  itemGeometry,
  itemTop,
  ladderStep,
  packLanes,
  pickTicks,
  resolveZoom,
  rowsHeight,
  timeToX,
  xToTime,
  zoneWeekday,
  type TickUnit,
  type ZoomValue,
} from "./timeline-layout";

export type TimelineDate = Date | string | number;
export type TimelineZoom = ZoomValue;
export type TimelineView = "graph" | "table";
export type TimelineStatus = "info" | "success" | "warn" | "danger";
export type TimelineItemStatus = "default" | "done" | "warn" | "danger" | "pending";

export interface TimelineLane {
  id: string;
  label: string;
  /** Consecutive lanes with the same group name share a collapsible header row. */
  group?: string;
}

export interface TimelineGraphItem {
  id: string;
  /** Lane id. */
  lane: string;
  title: string;
  start: TimelineDate;
  /** Omit for a milestone (dot-glyph diamond, move only). */
  end?: TimelineDate;
  /** Ids of items this one depends on; a connector is drawn from each to this item. */
  dependsOn?: string[];
  /** Shape, not only colour: done = check, warn = triangle, danger = square-x, pending = dither fill. */
  status?: TimelineItemStatus;
}

export interface TimelineGraphHandle {
  scrollToTime(t: TimelineDate): void;
  zoomTo(z: TimelineZoom): void;
}

export interface TimelineGraphLabels {
  zoomIn: string;
  zoomOut: string;
  fit: string;
  jumpToNow: string;
  graph: string;
  table: string;
  view: string;
  now: string;
  lane: string;
  title: string;
  start: string;
  end: string;
  dependsOn: string;
  empty: string;
  outBefore: string;
  outAfter: string;
  sortBy: string;
  expand: string;
  zoom: Record<"hour" | "day" | "week" | "fit", string>;
  units: { d: string; h: string; m: string };
}

const DEFAULT_LABELS: TimelineGraphLabels = {
  zoomIn: "확대",
  zoomOut: "축소",
  fit: "맞춤",
  jumpToNow: "현재로",
  graph: "그래프",
  table: "표",
  view: "보기",
  now: "현재",
  lane: "구분",
  title: "제목",
  start: "시작",
  end: "종료",
  dependsOn: "선행 작업",
  empty: "일정이 없습니다",
  outBefore: "범위 앞 일정",
  outAfter: "범위 뒤 일정",
  sortBy: "정렬",
  expand: "펼치기",
  zoom: { hour: "시간", day: "일", week: "주", fit: "맞춤" },
  units: { d: "일", h: "시간", m: "분" },
};

const toMs = (d: TimelineDate) => (d instanceof Date ? d.getTime() : typeof d === "number" ? d : new Date(d).getTime());

const btn =
  "yorha-press yorha-disabled inline-flex h-control-sm min-w-control-sm items-center justify-center gap-1 border border-yorha-border bg-yorha-bg px-pad-sm font-yorha text-yorha-sm text-yorha-fg hover:bg-yorha-ink hover:text-yorha-on-ink focus-visible:yorha-focus aria-pressed:bg-yorha-ink aria-pressed:text-yorha-on-ink";

const firstGrapheme = (s: string) => {
  const seg = typeof Intl !== "undefined" && "Segmenter" in Intl ? [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(s)] : null;
  return seg?.[0]?.segment ?? [...s][0] ?? "";
};
const fmtNum = (n: number) => String(Math.round(n * 100) / 100);
const isDev = () => (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.NODE_ENV !== "production";

interface Norm {
  src: TimelineGraphItem;
  id: string;
  lane: string;
  title: string;
  start: number;
  end?: number;
  status: TimelineItemStatus;
}

export interface TimelineGraphProps extends Omit<React.ComponentProps<"div">, "children" | "onSelect"> {
  /** Accessible name of the whole timeline. */
  label: string;
  lanes: TimelineLane[];
  range: { start: TimelineDate; end: TimelineDate };
  /** Controlled items. */
  items?: TimelineGraphItem[];
  /** Uncontrolled items. */
  defaultItems?: TimelineGraphItem[];
  /** "hour" 64 px/h, "day" 4 px/h (96 px/day), "week" 1 px/h, "fit" (whole range in the viewport) or `{ pxPerHour }`. Default "day". */
  zoom?: TimelineZoom;
  defaultZoom?: TimelineZoom;
  onZoomChange?: (zoom: TimelineZoom, pxPerHour: number) => void;
  /** "graph" (HTML items over an SVG grid) or "table" (same data as a real table). Default "graph". */
  view?: TimelineView;
  onViewChange?: (view: TimelineView) => void;
  /** Position of the now line. Omitted = the live clock (30 s tick); hidden outside `range`. */
  now?: TimelineDate;
  /** Where the graph starts scrolled. Default "start". */
  initialScroll?: "start" | "now" | TimelineDate;
  selectedId?: string | null;
  defaultSelectedId?: string | null;
  onSelectedIdChange?: (id: string | null) => void;
  /** Called on Enter or click of an item. */
  onItemSelect?: (item: TimelineGraphItem) => void;
  /** IANA zone for tick alignment and labels. Default: the host zone. */
  timeZone?: string;
  /** BCP 47 locale for ticks and labels. Default "ko-KR". */
  locale?: string;
  /** "compact" = 28 px rows. Default "default" (44 px). */
  density?: "default" | "compact";
  /** Weekend bands (1 px diagonal dither). */
  bands?: boolean;
  /** Scroll area height limit; the axis and the lane column stay put while the lanes scroll. */
  maxHeight?: number | string;
  /** Text of the status row when there are no items. */
  emptyText?: string;
  onViewportChange?: (viewport: { start: Date; end: Date }) => void;
  apiRef?: React.Ref<TimelineGraphHandle>;
  labels?: Partial<TimelineGraphLabels>;
}

type SortKey = "lane" | "title" | "start" | "end";

/**
 * Lane/bar timeline: an aria-hidden SVG grid (ticks, connectors) under HTML items (`button`s). Geometry is linear in
 * time, `px = round((t - range.start) / 1 h * pxPerHour)`; see `timeline-layout.ts` for the pure helpers.
 * Items stack in sub-lanes when they overlap. Arrow keys move between items (Left/Right in a lane, Up/Down between
 * lanes), `+`/`-` zoom, `t` jumps to now, Enter selects.
 */
export function TimelineGraph({
  label,
  lanes,
  range,
  items: itemsProp,
  defaultItems,
  zoom: zoomProp,
  defaultZoom = "day",
  onZoomChange,
  view: viewProp = "graph",
  onViewChange,
  now: nowProp,
  initialScroll = "start",
  selectedId: selectedProp,
  defaultSelectedId = null,
  onSelectedIdChange,
  onItemSelect,
  timeZone,
  locale = "ko-KR",
  density = "default",
  bands = false,
  maxHeight,
  emptyText,
  onViewportChange,
  apiRef,
  labels: labelsProp,
  className,
  onKeyDown,
  ...props
}: TimelineGraphProps) {
  const t = {
    ...DEFAULT_LABELS,
    ...labelsProp,
    zoom: { ...DEFAULT_LABELS.zoom, ...labelsProp?.zoom },
    units: { ...DEFAULT_LABELS.units, ...labelsProp?.units },
  };
  const m = METRICS[density];
  const [innerItems] = React.useState(defaultItems ?? []);
  const rawItems = itemsProp ?? innerItems;
  const [zoomState, setZoomState] = React.useState<TimelineZoom>(defaultZoom);
  const zoomValue = zoomProp ?? zoomState;
  const [view, setViewState] = React.useState(viewProp);
  React.useEffect(() => setViewState(viewProp), [viewProp]);
  const [selState, setSelState] = React.useState<string | null>(defaultSelectedId);
  const selectedId = selectedProp !== undefined ? selectedProp : selState;
  const [collapsed, setCollapsed] = React.useState<ReadonlySet<string>>(new Set());
  const [sort, setSort] = React.useState<{ key: SortKey; dir: "asc" | "desc" } | null>(null);

  const startMs = toMs(range.start);
  const endMs = toMs(range.end);
  const spanMs = Math.max(endMs - startMs, HOUR);

  // ---- measuring ----
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const labelsRef = React.useRef<HTMLDivElement>(null);
  const tableRef = React.useRef<HTMLDivElement>(null);
  const [viewportPx, setViewportPx] = React.useState(0);
  const [sbH, setSbH] = React.useState(0);
  const [viewX, setViewX] = React.useState({ left: 0, width: 0 });
  const [tableOverflow, setTableOverflow] = React.useState(false);

  const px = resolveZoom(zoomValue, { spanMs, viewportPx });
  const spanH = spanMs / HOUR;
  const maxPx = resolveZoom({ pxPerHour: 1e6 }, { spanMs, viewportPx });
  const minPx = Math.min(1, resolveZoom("fit", { spanMs, viewportPx }));
  const canvasW = Math.max(1, Math.round(spanH * px));

  React.useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => {
      setViewportPx(el.clientWidth);
      setSbH(el.offsetHeight - el.clientHeight);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [view]);
  React.useLayoutEffect(() => {
    const el = tableRef.current;
    if (!el) return;
    const measure = () => setTableOverflow(el.scrollWidth > el.clientWidth + 1);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [view, sort]);

  // ---- items ----
  const norm = React.useMemo<Norm[]>(
    () =>
      rawItems.map((src) => {
        let s = toMs(src.start);
        let e = src.end === undefined ? undefined : toMs(src.end);
        if (e !== undefined && e < s) {
          if (isDev()) console.warn(`TimelineGraph: item "${src.id}" ends before it starts; swapped.`);
          [s, e] = [e, s];
        }
        return { src, id: src.id, lane: src.lane, title: src.title, start: s, end: e, status: src.status ?? "default" };
      }),
    [rawItems],
  );
  const outBefore = norm.filter((n) => (n.end ?? n.start) < startMs).length;
  const outAfter = norm.filter((n) => n.start > endMs).length;
  const laneIds = new Set(lanes.map((l) => l.id));
  const shown = norm.filter((n) => (n.end ?? n.start) >= startMs && n.start <= endMs && laneIds.has(n.lane));

  const geo = new Map(shown.map((n) => [n.id, itemGeometry(n, { startMs, pxPerHour: px })]));
  const packed = packLanes(
    shown.map((n) => ({ id: n.id, lane: n.lane, x0: geo.get(n.id)!.x0, x1: geo.get(n.id)!.x1 })),
    lanes,
    m,
  );
  const rows = buildRows(lanes, collapsed, packed.height, m);
  const rowOf = new Map(rows.map((r) => [r.id, r]));
  const bodyH = rowsHeight(rows);
  const canvasH = AXIS.height + bodyH;
  const visible = shown.filter((n) => rowOf.get(n.lane)?.kind === "lane");
  const laneIndex = new Map(lanes.map((l, i) => [l.id, i]));
  const laneLabel = (id: string) => lanes.find((l) => l.id === id)?.label ?? id;

  const boxes = new Map(
    visible.map((n) => {
      const g = geo.get(n.id)!;
      const row = rowOf.get(n.lane)!;
      const top = AXIS.height + itemTop(row, packed.sub[n.id] ?? 0, m);
      return [n.id, { ...g, top, cy: top + (g.instant ? 12 : m.barH / 2), height: g.instant ? 24 : m.barH }] as const;
    }),
  );

  // ---- formatting ----
  const f = React.useMemo(() => {
    const mk = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, { timeZone, ...o });
    const hm = mk({ hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    return {
      full: mk({ month: "long", day: "numeric", hour: "numeric", minute: "2-digit" }),
      cell: mk({ dateStyle: "medium", timeStyle: "short" }),
      time: hm,
      minor: { "1h": hm, "6h": hm, "12h": hm, "1d": mk({ day: "numeric", weekday: "short" }), "1w": mk({ month: "short", day: "numeric" }) } as Record<string, Intl.DateTimeFormat>,
      major: { "1d": mk({ month: "short", day: "numeric", weekday: "short" }), "1w": mk({ month: "short", day: "numeric" }), "1mo": mk({ year: "numeric", month: "long" }) } as Record<string, Intl.DateTimeFormat>,
    };
  }, [locale, timeZone]);
  const when = (n: Norm) => (n.end === undefined ? f.full.format(n.start) : `${f.full.format(n.start)} – ${f.full.format(n.end)}`);
  const duration = (n: Norm) => {
    if (n.end === undefined) return "";
    const min = Math.round((n.end - n.start) / 60_000);
    const d = Math.floor(min / 1440);
    const h = Math.floor((min % 1440) / 60);
    const mi = min % 60;
    return [d && `${d}${t.units.d}`, h && `${h}${t.units.h}`, mi && `${mi}${t.units.m}`].filter(Boolean).join(" ") || `0${t.units.m}`;
  };

  // ---- now (live) ----
  const [tick, setTick] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (nowProp !== undefined) return;
    const id = window.setInterval(() => setTick(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, [nowProp]);
  const nowMs = nowProp !== undefined ? toMs(nowProp) : tick;
  const showNow = nowMs >= startMs && nowMs <= endMs;
  const nowX = timeToX(nowMs, startMs, px);

  // ---- zoom (anchored) ----
  const anchor = React.useRef<{ time: number; ax: number } | null>(null);
  const setZoom = (next: TimelineZoom, ax?: number) => {
    const el = scrollRef.current;
    if (el) {
      const a = ax ?? el.clientWidth / 2;
      anchor.current = { time: xToTime(el.scrollLeft + a, startMs, px), ax: a };
    }
    if (zoomProp === undefined) setZoomState(next);
    onZoomChange?.(next, resolveZoom(next, { spanMs, viewportPx }));
  };
  const zoomBy = (dir: 1 | -1, ax?: number) => {
    const next = ladderStep(px, dir, maxPx, minPx);
    if (next === undefined) return;
    setZoom(next === 64 ? "hour" : next === 4 ? "day" : next === 1 ? "week" : { pxPerHour: next }, ax);
  };
  React.useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && anchor.current) el.scrollLeft = ((anchor.current.time - startMs) / HOUR) * px - anchor.current.ax;
    anchor.current = null;
  }, [px, startMs]);
  const zoomByRef = React.useRef(zoomBy);
  zoomByRef.current = zoomBy;

  // ctrl+wheel zoom about the pointer (non-passive: must stop the page zoom)
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let last = 0;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const at = performance.now();
      if (at - last < 80) return;
      last = at;
      zoomByRef.current(e.deltaY < 0 ? 1 : -1, e.clientX - el.getBoundingClientRect().left);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [view]);

  // ---- scroll: viewport, initial position, api ----
  const lastVp = React.useRef("");
  const reportViewport = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setViewX({ left: el.scrollLeft, width: el.clientWidth });
    const key = `${el.scrollLeft}:${el.clientWidth}:${px}`;
    if (key === lastVp.current) return;
    lastVp.current = key;
    onViewportChange?.({ start: new Date(xToTime(el.scrollLeft, startMs, px)), end: new Date(xToTime(el.scrollLeft + el.clientWidth, startMs, px)) });
  }, [onViewportChange, px, startMs]);
  React.useLayoutEffect(() => reportViewport(), [reportViewport, viewportPx, canvasW]);

  const scrollToTime = (d: TimelineDate) => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = Math.max(0, timeToX(toMs(d), startMs, px) - el.clientWidth / 2);
  };
  const didInit = React.useRef(false);
  React.useLayoutEffect(() => {
    if (view !== "graph") didInit.current = false;
    else if (!didInit.current && viewportPx > 0) {
      didInit.current = true;
      if (initialScroll === "now") scrollToTime(nowMs);
      else if (initialScroll !== "start") scrollToTime(initialScroll);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, viewportPx]);
  React.useImperativeHandle(apiRef, () => ({ scrollToTime, zoomTo: (z) => setZoom(z) }));

  // ---- pan (space-drag, middle button) and pinch ----
  const [panReady, setPanReady] = React.useState(false);
  const pan = React.useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const pointers = React.useRef(new Map<number, number>());
  const pinchBase = React.useRef(0);
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.set(e.pointerId, e.clientX);
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchBase.current = Math.abs(a! - b!);
      pan.current = null;
      return;
    }
    if (e.button === 1 || (panReady && e.button === 0)) {
      e.preventDefault();
      const el = e.currentTarget;
      el.setPointerCapture(e.pointerId);
      pan.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop };
    }
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, e.clientX);
    if (pointers.current.size === 2 && pinchBase.current > 0) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.abs(a! - b!);
      const ratio = dist / pinchBase.current;
      if (ratio > 1.4 || ratio < 0.7) {
        zoomBy(ratio > 1 ? 1 : -1, (a! + b!) / 2 - e.currentTarget.getBoundingClientRect().left);
        pinchBase.current = dist;
      }
      return;
    }
    const p = pan.current;
    if (!p) return;
    e.currentTarget.scrollLeft = p.left - (e.clientX - p.x);
    e.currentTarget.scrollTop = p.top - (e.clientY - p.y);
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    pinchBase.current = 0;
    pan.current = null;
  };

  // ---- selection, hover, focus, keyboard ----
  const [hoverId, setHoverId] = React.useState<string | null>(null);
  const [focusId, setFocusId] = React.useState<string | null>(null);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const itemRefs = React.useRef(new Map<string, HTMLButtonElement>());
  const byStart = (a: Norm, b: Norm) => a.start - b.start || (a.end ?? a.start) - (b.end ?? b.start) || (a.id < b.id ? -1 : 1);
  const ordered = [...visible].sort(byStart);
  const tabbableId = activeId && ordered.some((o) => o.id === activeId) ? activeId : ordered[0]?.id;
  const focusItem = (n: Norm | undefined) => n && itemRefs.current.get(n.id)?.focus();
  const overlap = (a: Norm, b: Norm) => Math.max(0, Math.min(a.end ?? a.start, b.end ?? b.start) - Math.max(a.start, b.start));
  const laneOrder = rows.filter((r) => r.kind === "lane").map((r) => r.id);
  const inLane = (id: string) => visible.filter((n) => n.lane === id).sort(byStart);
  const navigate = (n: Norm, e: React.KeyboardEvent) => {
    const mine = inLane(n.lane);
    const i = mine.indexOf(n);
    const vertical = (dir: 1 | -1) => {
      for (let l = laneOrder.indexOf(n.lane) + dir; l >= 0 && l < laneOrder.length; l += dir) {
        const cand = inLane(laneOrder[l]!);
        if (cand.length) return [...cand].sort((a, b) => overlap(b, n) - overlap(a, n) || Math.abs(a.start - n.start) - Math.abs(b.start - n.start))[0];
      }
      return undefined;
    };
    const ctrl = e.ctrlKey || e.metaKey;
    const sc = scrollRef.current;
    let handled = true;
    switch (e.key) {
      case "ArrowRight":
        focusItem(mine[i + 1]);
        break;
      case "ArrowLeft":
        focusItem(mine[i - 1]);
        break;
      case "ArrowDown":
        focusItem(vertical(1));
        break;
      case "ArrowUp":
        focusItem(vertical(-1));
        break;
      case "Home":
        focusItem(ctrl ? ordered[0] : mine[0]);
        break;
      case "End":
        focusItem(ctrl ? ordered[ordered.length - 1] : mine[mine.length - 1]);
        break;
      case "PageDown":
        sc?.scrollBy({ left: sc.clientWidth * 0.9 });
        break;
      case "PageUp":
        sc?.scrollBy({ left: -sc.clientWidth * 0.9 });
        break;
      case "t":
      case "T":
        if (showNow) scrollToTime(nowMs);
        break;
      default:
        handled = false;
    }
    if (handled) e.preventDefault();
  };
  const select = (n: Norm) => {
    if (selectedProp === undefined) setSelState(n.id);
    onSelectedIdChange?.(n.id);
    onItemSelect?.(n.src);
  };

  const readoutItem = norm.find((n) => n.id === (hoverId ?? focusId ?? selectedId));
  const nowSide = !showNow ? null : nowX < viewX.left ? "before" : nowX > viewX.left + viewX.width ? "after" : null;

  // ---- connectors ----
  const arrows = visible.flatMap((target) =>
    (target.src.dependsOn ?? []).flatMap((id, dep) => {
      const src = visible.find((i) => i.id === id);
      return src ? [{ key: `${id}>${target.id}`, src, target, dep }] : [];
    }),
  );
  const arrowPath = (src: Norm, target: Norm, dep: number) => {
    const a = boxes.get(src.id)!;
    const b = boxes.get(target.id)!;
    const step = dep * 6;
    const x2 = b.left;
    if (a.instant) {
      const ax = a.left + 12;
      const dir = b.cy >= a.cy ? 1 : -1;
      const sy = a.cy + dir * 8;
      if (x2 >= ax + step + 8) return `M${ax},${sy} V${b.cy} H${x2}`;
      const mid = sy + dir * 8;
      return `M${ax},${sy} V${mid} H${x2 - 8 - step} V${b.cy} H${x2}`;
    }
    const x1 = a.left + a.width;
    if (x2 >= x1 + 16 + step) return `M${x1},${a.cy} H${x1 + 8 + step} V${b.cy} H${x2}`;
    const detour = a.cy === b.cy ? a.cy + Math.floor(m.subH / 2) : Math.round((a.cy + b.cy) / 2);
    return `M${x1},${a.cy} V${detour} H${x2 - 8 - step} V${b.cy} H${x2}`;
  };
  const arrowId = `${React.useId()}-arrow`;

  // ---- ticks ----
  const ticks = pickTicks(startMs, endMs, px, timeZone);
  const majorSegs = ticks.major.ticks
    .map((ms, i, all) => {
      const x0 = Math.max(0, timeToX(ms, startMs, px));
      const x1 = Math.min(canvasW, i + 1 < all.length ? timeToX(all[i + 1]!, startMs, px) : canvasW);
      return { ms, x0, x1 };
    })
    .filter((s) => s.x1 > s.x0);
  const minorXs = (ticks.minor?.ticks ?? []).map((ms) => ({ ms, x: timeToX(ms, startMs, px) }));
  const dayTicks = bands ? pickTicks(startMs, endMs, 64, timeZone).major.ticks : [];

  const groupSpan = (name: string) => {
    const ids = lanes.filter((l) => l.group === name).map((l) => l.id);
    const its = shown.filter((n) => ids.includes(n.lane));
    if (!its.length) return null;
    const lefts = its.map((n) => geo.get(n.id)!.left + (geo.get(n.id)!.instant ? 12 : 0));
    const rights = its.map((n) => geo.get(n.id)!.left + (geo.get(n.id)!.instant ? 12 : geo.get(n.id)!.width));
    const x0 = Math.max(0, Math.min(...lefts));
    return { x0, x1: Math.min(canvasW, Math.max(Math.max(...rights), x0 + 2)) };
  };

  const setView = (v: TimelineView) => {
    setViewState(v);
    onViewChange?.(v);
  };

  const sortedTable = React.useMemo(() => {
    const base = [...norm].sort(byStart);
    if (!sort) return base;
    const cmp = (a: Norm, b: Norm) => {
      switch (sort.key) {
        case "lane":
          return (laneIndex.get(a.lane) ?? 0) - (laneIndex.get(b.lane) ?? 0);
        case "title":
          return a.title.localeCompare(b.title, locale);
        case "start":
          return a.start - b.start;
        case "end":
          return (a.end ?? Infinity) - (b.end ?? Infinity);
      }
    };
    return base.sort((a, b) => (sort.dir === "asc" ? cmp(a, b) : cmp(b, a)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [norm, sort, locale, lanes]);
  const cycleSort = (key: SortKey) => setSort((s) => (!s || s.key !== key ? { key, dir: "asc" } : s.dir === "asc" ? { key, dir: "desc" } : null));

  const zoomName =
    typeof zoomValue === "string" ? t.zoom[zoomValue] : Math.abs(px - 4) < 1e-6 ? t.zoom.day : Math.abs(px - 1) < 1e-6 ? t.zoom.week : Math.abs(px - 64) < 1e-6 ? t.zoom.hour : `${fmtNum(px)} px/h`;

  const itemClass = (n: Norm, instant: boolean) =>
    cn(
      "absolute inset-0 cursor-pointer text-left font-yorha text-yorha-xs outline-none focus-visible:yorha-focus",
      instant
        ? cn("grid place-items-center text-yorha-ink outline-current aria-pressed:outline-solid aria-pressed:outline-2 aria-pressed:-outline-offset-2", "[@media(hover:hover)_and_(pointer:fine)]:hover:outline-solid [@media(hover:hover)_and_(pointer:fine)]:hover:outline-1 [@media(hover:hover)_and_(pointer:fine)]:hover:-outline-offset-2")
        : cn(
            "flex items-center gap-1 overflow-hidden border px-1.5 outline-current aria-pressed:outline-solid aria-pressed:outline-2 aria-pressed:-outline-offset-4",
            "[@media(hover:hover)_and_(pointer:fine)]:hover:outline-solid [@media(hover:hover)_and_(pointer:fine)]:hover:outline-1 [@media(hover:hover)_and_(pointer:fine)]:hover:-outline-offset-2",
            n.status === "pending" ? "border-yorha-ink bg-yorha-panel text-yorha-fg" : "border-yorha-bg bg-yorha-ink text-yorha-on-ink",
            n.status === "danger" && "border-2 border-yorha-alert-ui",
          ),
    );
  const statusGlyph: Partial<Record<TimelineItemStatus, GlyphName>> = { done: "check", warn: "triangle-up", danger: "square-x" };

  return (
    <div
      role="group"
      aria-label={label}
      data-slot="timeline-graph"
      data-zoom={typeof zoomValue === "string" ? zoomValue : "custom"}
      data-px-per-hour={fmtNum(px)}
      data-view={view}
      data-rows={density}
      className={cn("@container flex w-full min-w-0 flex-col gap-2 font-yorha text-yorha-fg", className)}
      onKeyDown={(e) => {
        onKeyDown?.(e);
        if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
        if (e.key === " " && view === "graph") setPanReady(true);
        if (e.key === "+" || e.key === "=") {
          e.preventDefault();
          zoomBy(1);
        } else if (e.key === "-" || e.key === "_") {
          e.preventDefault();
          zoomBy(-1);
        }
      }}
      onKeyUp={(e) => {
        if (e.key === " ") setPanReady(false);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPanReady(false);
      }}
      {...props}
    >
      <div data-part="toolbar" className="flex flex-wrap items-center justify-between gap-2 border-b border-yorha-border pb-2">
        <div className="flex flex-wrap items-center gap-1">
          <button type="button" className={btn} aria-label={t.zoomOut} disabled={view !== "graph" || ladderStep(px, -1, maxPx, minPx) === undefined} onClick={() => zoomBy(-1)}>
            <Glyph name="minus" />
          </button>
          <button type="button" className={btn} aria-label={t.zoomIn} disabled={view !== "graph" || ladderStep(px, 1, maxPx, minPx) === undefined} onClick={() => zoomBy(1)}>
            <Glyph name="plus" />
          </button>
          <button type="button" className={btn} aria-pressed={zoomValue === "fit"} disabled={view !== "graph"} onClick={() => setZoom("fit")}>
            {t.fit}
          </button>
          <button type="button" className={btn} disabled={view !== "graph" || !showNow} onClick={() => scrollToTime(nowMs)} data-now-side={nowSide ?? "in"}>
            <span aria-hidden="true" className="relative block size-3 shrink-0">
              <Glyph name="chevron-left" className={cn("absolute inset-0", nowSide === "before" ? "opacity-100" : "opacity-0")} />
              <Glyph name="chevron-right" className={cn("absolute inset-0", nowSide === "after" ? "opacity-100" : "opacity-0")} />
            </span>
            {t.jumpToNow}
          </button>
          <span className="inline-block min-w-20 px-2 text-yorha-sm tracking-yorha-wide text-yorha-fg-soft" data-part="scale-label">
            {zoomName}
          </span>
        </div>
        <ToggleGroup aria-label={t.view} required value={[view]} onValueChange={(v) => v[0] && setView(v[0] as TimelineView)}>
          <ToggleGroupItem value="graph">{t.graph}</ToggleGroupItem>
          <ToggleGroupItem value="table">{t.table}</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div className="flex h-6 items-center gap-3 text-yorha-xs text-yorha-fg-soft" data-part="readout-row">
        <div data-part="readout" aria-live="off" className="h-6 min-w-0 flex-1 truncate leading-6 text-yorha-fg">
          {readoutItem ? `${readoutItem.title} · ${laneLabel(readoutItem.lane)} · ${when(readoutItem)}${readoutItem.end === undefined ? "" : ` · ${duration(readoutItem)}`}` : ""}
        </div>
        {(
          [
            ["before", outBefore, t.outBefore],
            ["after", outAfter, t.outAfter],
          ] as const
        ).map(([k, n, text]) => (
          <span key={k} data-part={`out-${k}`} aria-label={`${text} ${n}`} className={cn("flex shrink-0 items-center gap-1 tabular-nums", n ? "" : "invisible")}>
            {k === "before" ? <Glyph name="chevron-left" /> : null}
            <span>{n}</span>
            {k === "after" ? <Glyph name="chevron-right" /> : null}
          </span>
        ))}
      </div>
      {view === "table" ? (
        <div
          ref={tableRef}
          role="region"
          aria-label={label}
          tabIndex={tableOverflow ? 0 : undefined}
          data-part="table-region"
          className="yorha-scroll yorha-scroll-cue-x overflow-y-hidden focus-visible:yorha-focus"
        >
          <table data-part="table" className="w-full min-w-max border-collapse text-left text-yorha-sm">
            <caption className="sr-only">{label}</caption>
            <thead className="bg-yorha-ink text-yorha-on-ink">
              <tr>
                {(
                  [
                    ["lane", t.lane],
                    ["title", t.title],
                    ["start", t.start],
                    ["end", t.end],
                  ] as const
                ).map(([key, text]) => (
                  <th key={key} scope="col" aria-sort={sort?.key === key ? (sort.dir === "asc" ? "ascending" : "descending") : "none"} className="p-0 font-yorha-bold text-yorha-sm uppercase tracking-yorha-wide">
                    <button type="button" data-sort={key} aria-label={`${text}, ${t.sortBy}`} onClick={() => cycleSort(key)} className="flex min-h-control-sm w-full items-center gap-1 px-3 py-2 text-left uppercase focus-visible:yorha-focus-inset">
                      {text}
                      <Glyph name={sort?.key === key && sort.dir === "desc" ? "arrow-down" : "arrow-up"} className={sort?.key === key ? "opacity-100" : "opacity-0"} />
                    </button>
                  </th>
                ))}
                <th scope="col" className="px-3 py-2 font-yorha-bold text-yorha-sm uppercase tracking-yorha-wide">
                  {t.dependsOn}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedTable.map((n) => (
                <tr key={n.id} className="border-b border-yorha-border" data-item-id={n.id}>
                  <th scope="row" className="px-3 py-2 text-left font-yorha-medium">
                    {laneLabel(n.lane)}
                  </th>
                  <td className="px-3 py-2">
                    {onItemSelect ? (
                      <button type="button" className="inline-flex min-h-[24px] items-center text-left underline decoration-yorha-border underline-offset-4 focus-visible:yorha-focus" onClick={() => onItemSelect(n.src)}>
                        {n.title}
                      </button>
                    ) : (
                      n.title
                    )}
                  </td>
                  <td className="yorha-tabular px-3 py-2">{f.cell.format(n.start)}</td>
                  <td className="yorha-tabular px-3 py-2">{n.end === undefined ? "—" : f.cell.format(n.end)}</td>
                  <td className="px-3 py-2">{(n.src.dependsOn ?? []).map((id) => norm.find((i) => i.id === id)?.title ?? id).join(", ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div data-part="body" className="grid grid-cols-[auto_minmax(0,1fr)] border border-yorha-border bg-yorha-bg">
          <div ref={labelsRef} data-part="lane-labels" className="w-7 shrink-0 overflow-hidden border-r border-yorha-border bg-yorha-panel @md:w-36" style={maxHeight !== undefined ? { maxHeight } : undefined}>
            <div style={{ paddingBottom: sbH }}>
              <div style={{ height: AXIS.height }} className="flex items-end px-2 pb-2 text-yorha-xs tracking-yorha-wide text-yorha-fg-soft @max-md:justify-center @max-md:px-0">
                <span className="@max-md:sr-only">{t.lane}</span>
              </div>
              {rows.map((row) => {
                if (row.kind === "group") {
                  return (
                    <button
                      key={`g:${row.id}`}
                      type="button"
                      data-part="group-toggle"
                      aria-expanded={!row.collapsed}
                      aria-label={`${row.id}, ${t.expand}`}
                      title={row.id}
                      style={{ height: row.height }}
                      onClick={() =>
                        setCollapsed((c) => {
                          const next = new Set(c);
                          if (next.has(row.id)) next.delete(row.id);
                          else next.add(row.id);
                          return next;
                        })
                      }
                      className="flex w-full items-center gap-1 border-t border-yorha-border bg-yorha-panel px-1 text-left text-yorha-xs font-yorha-bold tracking-yorha-wide focus-visible:yorha-focus-inset @md:px-2"
                    >
                      <Glyph name={row.collapsed ? "chevron-right" : "chevron-down"} />
                      <span className="truncate @max-md:sr-only">{row.id}</span>
                    </button>
                  );
                }
                const lane = lanes.find((l) => l.id === row.id)!;
                return (
                  <div
                    key={lane.id}
                    data-lane={lane.id}
                    title={lane.label}
                    style={{ height: row.height }}
                    className={cn("flex items-center border-t border-yorha-border px-2 text-yorha-sm font-yorha-medium tracking-yorha-wide @max-md:justify-center @max-md:px-0", lane.group !== undefined && "@md:pl-5")}
                  >
                    <span className="truncate @max-md:sr-only">{lane.label}</span>
                    <span aria-hidden="true" className="hidden @max-md:block">
                      {firstGrapheme(lane.label)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <div
            ref={scrollRef}
            data-part="scroller"
            data-pan={panReady ? "ready" : undefined}
            {...(visible.length ? {} : { role: "region", "aria-label": label, tabIndex: 0 })}
            className={cn("relative min-w-0 overflow-auto overscroll-x-contain [touch-action:pan-x_pan-y]", panReady && "cursor-grab")}
            style={maxHeight !== undefined ? { maxHeight } : undefined}
            onScroll={(e) => {
              if (labelsRef.current) labelsRef.current.scrollTop = e.currentTarget.scrollTop;
              reportViewport();
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <div data-part="canvas" className="relative overflow-clip text-yorha-fg" style={{ width: canvasW, height: canvasH }}>
              <svg data-part="grid" aria-hidden="true" width={canvasW} height={canvasH} shapeRendering="crispEdges" className="pointer-events-none absolute inset-0 block text-yorha-fg">
                <defs>
                  <marker id={arrowId} viewBox="0 0 8 8" refX="8" refY="4" markerWidth="8" markerHeight="8" orient="auto">
                    <path d="M0 0h2v8H0z M2 1h2v6H2z M4 2h2v4H4z M6 3h2v2H6z" className="fill-yorha-fg-soft" />
                  </marker>
                  <pattern id={`${arrowId}-band`} width="4" height="4" patternUnits="userSpaceOnUse">
                    <path d="M0 3h1v1H0z M1 2h1v1H1z M2 1h1v1H2z M3 0h1v1H3z" className="fill-yorha-border" />
                  </pattern>
                </defs>
                {bands
                  ? dayTicks
                      .filter((ms) => [0, 6].includes(zoneWeekday(ms, timeZone)))
                      .map((ms) => {
                        const x0 = Math.max(0, timeToX(ms, startMs, px));
                        const x1 = Math.min(canvasW, timeToX(ms + 24 * HOUR, startMs, px));
                        return x1 > x0 ? <rect key={ms} data-part="band" x={x0} y={AXIS.height} width={x1 - x0} height={bodyH} fill={`url(#${arrowId}-band)`} /> : null;
                      })
                  : null}
                {rows.map((row) => (
                  <line key={row.id} x1={0} x2={canvasW} y1={AXIS.height + row.top + 0.5} y2={AXIS.height + row.top + 0.5} className="stroke-yorha-border" strokeWidth={1} />
                ))}
                {majorSegs.map((s) => (
                  <line key={`M${s.ms}`} x1={s.x0 + 0.5} x2={s.x0 + 0.5} y1={AXIS.guides} y2={canvasH} className="stroke-yorha-border" strokeWidth={1} />
                ))}
                {minorXs.map((tk) => (
                  <line key={`m${tk.ms}`} x1={tk.x + 0.5} x2={tk.x + 0.5} y1={AXIS.height} y2={canvasH} className="stroke-yorha-border" strokeWidth={1} strokeDasharray="1 3" />
                ))}
                <g transform="translate(0.5 0.5)">
                  {arrows.map(({ key, src, target, dep }) => (
                    <path key={key} data-part="dependency" d={arrowPath(src, target, dep)} fill="none" className="stroke-yorha-fg-soft" strokeWidth={1} markerEnd={`url(#${arrowId})`} />
                  ))}
                </g>
              </svg>
              <div data-part="axis" className="sticky top-0 z-30 bg-yorha-panel" style={{ height: AXIS.height, width: canvasW }}>
                <div className="absolute inset-x-0 bottom-0 border-b border-yorha-border" />
                {majorSegs.map((s) => (
                  <div key={s.ms} data-part="tick-major" className="absolute overflow-hidden" style={{ left: s.x0, width: s.x1 - s.x0, top: AXIS.guides, height: AXIS.major }}>
                    <span data-part="tick-label" className="sticky left-0 block max-w-full truncate px-1.5 text-yorha-xs leading-5 font-yorha-bold text-yorha-fg">
                      {f.major[ticks.major.unit]!.format(Math.max(s.ms, startMs))}
                    </span>
                  </div>
                ))}
                {minorXs.map((tk, i) => {
                  const next = minorXs[i + 1]?.x ?? tk.x + Math.round(ticks.minor!.pitchPx);
                  const w = Math.min(next, canvasW) - tk.x;
                  return w > 0 ? (
                    <div key={tk.ms} data-part="tick-minor" className="absolute overflow-hidden border-l border-yorha-border" style={{ left: tk.x, width: w, top: AXIS.guides + AXIS.major, height: AXIS.minor }}>
                      <span data-part="tick-label" className="yorha-tabular block truncate px-1 text-yorha-xs leading-5 text-yorha-fg-soft">
                        {f.minor[ticks.minor!.unit as TickUnit]!.format(tk.ms)}
                      </span>
                    </div>
                  ) : null;
                })}
                {showNow ? (
                  <div data-part="now-tag" className={cn("absolute top-0 flex items-center gap-0.5 bg-yorha-ink px-1 text-yorha-xs leading-4 font-yorha-bold whitespace-nowrap text-yorha-on-ink", nowX > canvasW - 110 && "-translate-x-full")} style={{ left: nowX, height: AXIS.guides }}>
                    <Glyph name="triangle-right" />
                    {t.now} {f.time.format(nowMs)}
                  </div>
                ) : null}
              </div>
              {showNow ? <div data-part="now" aria-hidden="true" className="pointer-events-none absolute z-[5] w-0.5 bg-yorha-alert-ui" style={{ left: nowX - 1, top: AXIS.height, height: bodyH }} /> : null}
              {!norm.length ? (
                <div data-part="empty" role="status" className="absolute z-10 flex items-center px-3 text-yorha-sm text-yorha-fg-soft" style={{ left: 0, top: AXIS.height, height: m.rowMin, width: Math.min(canvasW, viewportPx || canvasW) }}>
                  {emptyText ?? t.empty}
                </div>
              ) : null}
              <div data-part="items" className="pointer-events-none absolute inset-0 z-10">
                {rows
                  .filter((r) => r.kind === "group")
                  .map((r) => {
                    const span = groupSpan(r.id);
                    return span ? <div key={r.id} data-part="group-span" aria-hidden="true" className="absolute h-1 bg-yorha-fg-soft" style={{ left: span.x0, width: span.x1 - span.x0, top: AXIS.height + r.top + Math.floor((r.height - 4) / 2) }} /> : null;
                  })}
                {visible.map((n) => {
                  const b = boxes.get(n.id)!;
                  const current = n.end !== undefined && n.start <= nowMs && nowMs <= n.end;
                  const glyph = statusGlyph[n.status];
                  return (
                    <div
                      key={n.id}
                      data-part="item"
                      data-item-id={n.id}
                      data-lane={n.lane}
                      data-status={n.status}
                      data-instant={b.instant ? "" : undefined}
                      style={{ left: b.left, top: b.top, width: b.width, height: b.height, "--yorha-stagger-index": Math.min(laneIndex.get(n.lane) ?? 0, 8) } as React.CSSProperties}
                      className="yorha-stream pointer-events-none absolute"
                      onPointerEnter={(e) => e.pointerType !== "touch" && setHoverId(n.id)}
                      onPointerLeave={() => setHoverId((h) => (h === n.id ? null : h))}
                    >
                      <button
                        ref={(el) => {
                          if (el) itemRefs.current.set(n.id, el);
                          else itemRefs.current.delete(n.id);
                        }}
                        type="button"
                        data-part="item-button"
                        data-title={n.title}
                        data-lane={n.lane}
                        tabIndex={n.id === tabbableId ? 0 : -1}
                        aria-label={`${laneLabel(n.lane)}: ${n.title}, ${when(n)}`}
                        aria-pressed={selectedId === n.id}
                        aria-current={current ? "time" : undefined}
                        title={b.labelOutside || b.width < 120 ? n.title : undefined}
                        className={cn(itemClass(n, b.instant), "pointer-events-auto")}
                        onFocus={() => {
                          setActiveId(n.id);
                          setFocusId(n.id);
                        }}
                        onBlur={() => setFocusId((x) => (x === n.id ? null : x))}
                        onClick={() => select(n)}
                        onKeyDown={(e) => navigate(n, e)}
                      >
                        {b.instant ? (
                          <Glyph name="diamond" />
                        ) : (
                          <>
                            {n.status === "pending" ? <span data-part="dither" aria-hidden="true" className="yorha-dither-25 pointer-events-none absolute inset-0 bg-yorha-ink" /> : null}
                            {glyph && !b.labelOutside ? <Glyph name={glyph} className="relative" /> : null}
                            {b.labelOutside ? null : (
                              <span data-part="item-label" className={cn("relative min-w-0 flex-1 truncate", n.status === "pending" && "bg-yorha-panel px-1")}>
                                {n.title}
                              </span>
                            )}
                          </>
                        )}
                      </button>
                      {b.labelOutside ? (
                        <span data-part="item-label-out" aria-hidden="true" className="pointer-events-none absolute top-1/2 left-full ml-1 -translate-y-1/2 bg-yorha-bg px-0.5 text-yorha-xs leading-4 whitespace-nowrap text-yorha-fg">
                          {n.title}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- vertical event list ----

export interface TimelineEvent {
  id: string;
  time: TimelineDate;
  title: string;
  body?: React.ReactNode;
  /** Omit for a neutral event. */
  status?: TimelineStatus;
}

export interface TimelineProps extends Omit<React.ComponentProps<"ol">, "children"> {
  /** Accessible name of the list. */
  label: string;
  items: TimelineEvent[];
  locale?: string;
  /** Visually hidden status words; default Korean. */
  statusLabels?: Partial<Record<TimelineStatus, string>>;
}

const STATUS_WORDS: Record<TimelineStatus, string> = { info: "정보", success: "성공", warn: "경고", danger: "위험" };

// Dot glyphs on the integer grid (16 px box): none = ring (pending), info = target (current), success = solid diamond
// (done), warn = triangle, danger = square-x. The shape carries the status without colour.
const dotGlyph: Record<TimelineStatus | "none", GlyphName> = {
  none: "diamond-ring",
  info: "diamond-target",
  success: "diamond",
  warn: "triangle-up",
  danger: "square-x",
};

/** Vertical event list for logs and history: dot glyph, time, title, body. Entry uses yorha-stagger. */
export function Timeline({ label, items, locale = "ko-KR", statusLabels, className, ...props }: TimelineProps) {
  const words = { ...STATUS_WORDS, ...statusLabels };
  const fmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
  return (
    <ol aria-label={label} className={cn("m-0 flex list-none flex-col p-0 font-yorha text-yorha-fg", className)} {...props}>
      {items.map((item, i) => {
        const ms = toMs(item.time);
        return (
          <li
            key={item.id}
            data-status={item.status}
            style={{ "--yorha-stagger-index": i } as React.CSSProperties}
            className="yorha-stagger group relative grid grid-cols-[1.5rem_1fr] gap-x-3 pb-6 last:pb-0"
          >
            <span data-part="rail" aria-hidden="true" className="yorha-rail absolute top-3 bottom-0 left-[11px] text-yorha-border group-last:hidden" />
            <span aria-hidden="true" className={cn("relative z-1 flex h-6 items-center justify-center bg-yorha-panel", item.status === "danger" ? "text-yorha-alert-ui" : "text-yorha-ink")}>
              <Glyph name={dotGlyph[item.status ?? "none"]} box={16} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-3">
                <time dateTime={new Date(ms).toISOString()} className="yorha-tabular text-yorha-sm text-yorha-fg-soft">
                  {fmt.format(ms)}
                </time>
                <span className="font-yorha-medium text-yorha-fg-strong">
                  {item.status ? <span className="sr-only">{words[item.status]}: </span> : null}
                  {item.title}
                </span>
              </div>
              {item.body ? <div className="mt-1 text-yorha-sm text-yorha-fg">{item.body}</div> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
