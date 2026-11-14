import * as React from "react";
import { cn } from "@/lib/utils";

export type TimelineDate = Date | string | number;
export type TimelineScale = "hour" | "day" | "week";
export type TimelineView = "graph" | "table";
export type TimelineStatus = "info" | "success" | "warn" | "danger";

export interface TimelineLane {
  id: string;
  label: string;
}

export interface TimelineGraphItem {
  id: string;
  /** Lane id. */
  lane: string;
  title: string;
  start: TimelineDate;
  /** Omit for an instant (diamond marker). */
  end?: TimelineDate;
  /** Ids of items this one depends on; an arrow is drawn from each to this item. */
  dependsOn?: string[];
}

export interface TimelineGraphLabels {
  zoomIn: string;
  zoomOut: string;
  graph: string;
  table: string;
  now: string;
  lane: string;
  title: string;
  start: string;
  end: string;
  dependsOn: string;
  scale: Record<TimelineScale, string>;
}

const DEFAULT_LABELS: TimelineGraphLabels = {
  zoomIn: "확대",
  zoomOut: "축소",
  graph: "그래프",
  table: "표",
  now: "현재",
  lane: "구분",
  title: "제목",
  start: "시작",
  end: "종료",
  dependsOn: "선행 작업",
  scale: { hour: "시간", day: "일", week: "주" },
};

const toMs = (d: TimelineDate) => (d instanceof Date ? d.getTime() : typeof d === "number" ? d : new Date(d).getTime());

const UNIT_MS: Record<TimelineScale, number> = { hour: 3_600_000, day: 86_400_000, week: 604_800_000 };
/** Pixels per scale unit: 64 per hour, 96 per day, 128 per week. */
const PX_PER_UNIT: Record<TimelineScale, number> = { hour: 64, day: 96, week: 128 };
/** Zoomed out to in. */
const SCALES: TimelineScale[] = ["week", "day", "hour"];

const AXIS_H = 40;
const ROW_H = 44;
const BAR_H = 22;
const MARKER_R = 9;
const MIN_BAR_W = 6;

function alignedTicks(startMs: number, endMs: number, scale: TimelineScale): number[] {
  const d = new Date(startMs);
  if (scale === "hour") d.setMinutes(0, 0, 0);
  else {
    d.setHours(0, 0, 0, 0);
    if (scale === "week") d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday
  }
  const step = () => {
    if (scale === "hour") d.setHours(d.getHours() + 1);
    else d.setDate(d.getDate() + (scale === "week" ? 7 : 1));
  };
  while (d.getTime() < startMs) step();
  const out: number[] = [];
  while (d.getTime() <= endMs) {
    out.push(d.getTime());
    step();
  }
  return out;
}

const btn =
  "yorha-press inline-flex h-8 min-w-8 items-center justify-center border border-yorha-border bg-yorha-bg px-2 font-yorha text-yorha-sm text-yorha-fg hover:bg-yorha-ink hover:text-yorha-on-ink focus-visible:yorha-focus disabled:opacity-50 aria-pressed:bg-yorha-ink aria-pressed:text-yorha-on-ink";

export interface TimelineGraphProps extends Omit<React.ComponentProps<"div">, "children" | "onSelect"> {
  /** Accessible name of the whole timeline. */
  label: string;
  lanes: TimelineLane[];
  items: TimelineGraphItem[];
  range: { start: TimelineDate; end: TimelineDate };
  /** Tick unit and zoom level; re-syncs when the prop changes. Default "day". */
  scale?: TimelineScale;
  onScaleChange?: (scale: TimelineScale) => void;
  /** "graph" (SVG) or "table" (same data as a real table). Default "graph". */
  view?: TimelineView;
  onViewChange?: (view: TimelineView) => void;
  /** Position of the "now" line. Default `new Date()`; hidden outside `range`. */
  now?: TimelineDate;
  /** BCP 47 locale for ticks and labels. Default "ko-KR". */
  locale?: string;
  /** Called on Enter, Space or click of an item. */
  onItemSelect?: (item: TimelineGraphItem) => void;
  labels?: Partial<TimelineGraphLabels>;
}

/**
 * Lane/bar timeline in plain SVG. Geometry is linear in time: x = (time - range.start) / unit * px,
 * unit px = 64 (hour), 96 (day), 128 (week). Arrow keys move focus between items in time order,
 * "+" / "-" zoom, Enter selects.
 */
export function TimelineGraph({
  label,
  lanes,
  items,
  range,
  scale: scaleProp = "day",
  onScaleChange,
  view: viewProp = "graph",
  onViewChange,
  now = new Date(),
  locale = "ko-KR",
  onItemSelect,
  labels: labelsProp,
  className,
  onKeyDown,
  ...props
}: TimelineGraphProps) {
  const t = { ...DEFAULT_LABELS, ...labelsProp, scale: { ...DEFAULT_LABELS.scale, ...labelsProp?.scale } };
  const [scale, setScaleState] = React.useState(scaleProp);
  const [view, setViewState] = React.useState(viewProp);
  React.useEffect(() => setScaleState(scaleProp), [scaleProp]);
  React.useEffect(() => setViewState(viewProp), [viewProp]);

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const centerRatio = React.useRef<number | null>(null);
  const itemRefs = React.useRef(new Map<string, SVGGElement>());
  const markerId = `${React.useId()}-arrow`;

  const setScale = (next: TimelineScale) => {
    if (next === scale) return;
    const el = scrollRef.current;
    if (el && el.scrollWidth > 0) centerRatio.current = (el.scrollLeft + el.clientWidth / 2) / el.scrollWidth;
    setScaleState(next);
    onScaleChange?.(next);
  };
  const zoom = (dir: 1 | -1) => {
    const i = SCALES.indexOf(scale) + dir;
    if (i >= 0 && i < SCALES.length) setScale(SCALES[i]!);
  };
  React.useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && centerRatio.current !== null) el.scrollLeft = centerRatio.current * el.scrollWidth - el.clientWidth / 2;
    centerRatio.current = null;
  }, [scale]);

  const startMs = toMs(range.start);
  const endMs = toMs(range.end);
  const unit = UNIT_MS[scale];
  const px = PX_PER_UNIT[scale];
  const xOf = (time: TimelineDate) => ((toMs(time) - startMs) / unit) * px;
  const width = ((endMs - startMs) / unit) * px;
  const height = AXIS_H + lanes.length * ROW_H;

  const laneIndex = new Map(lanes.map((l, i) => [l.id, i]));
  const laneLabel = (id: string) => lanes.find((l) => l.id === id)?.label ?? id;
  const ordered = items
    .map((item, i) => ({ item, i }))
    .sort(
      (a, b) =>
        toMs(a.item.start) - toMs(b.item.start) ||
        toMs(a.item.end ?? a.item.start) - toMs(b.item.end ?? b.item.start) ||
        a.i - b.i,
    )
    .map((o) => o.item);

  const fmtFull = new Intl.DateTimeFormat(locale, { month: "long", day: "numeric", hour: "numeric", minute: "2-digit" });
  const fmtCell = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
  const fmtMonthDay = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" });
  const fmtWeekday = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const fmtTime = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hour12: false });
  const when = (item: TimelineGraphItem) =>
    item.end === undefined
      ? fmtFull.format(toMs(item.start))
      : `${fmtFull.format(toMs(item.start))} – ${fmtFull.format(toMs(item.end))}`;
  const itemLabel = (item: TimelineGraphItem) => `${laneLabel(item.lane)}: ${item.title}, ${when(item)}`;

  const tickLines = (ms: number, i: number): [string, string | null] => {
    if (scale === "hour") {
      const midnight = new Date(ms).getHours() === 0;
      return [fmtTime.format(ms), midnight || i === 0 ? fmtMonthDay.format(ms) : null];
    }
    if (scale === "day") return [fmtMonthDay.format(ms), fmtWeekday.format(ms)];
    return [fmtMonthDay.format(ms), null];
  };

  const geometry = (item: TimelineGraphItem) => {
    const row = laneIndex.get(item.lane) ?? 0;
    const cy = AXIS_H + row * ROW_H + ROW_H / 2;
    const x1 = xOf(item.start);
    if (item.end === undefined) {
      return { cy, left: x1 - MARKER_R, right: x1 + MARKER_R, x: x1, w: MARKER_R * 2, instant: true as const };
    }
    const w = Math.max(MIN_BAR_W, xOf(item.end) - x1);
    return { cy, left: x1, right: x1 + w, x: x1, w, instant: false as const };
  };

  const [activeId, setActiveId] = React.useState<string | null>(null);
  const tabbableId = activeId && ordered.some((o) => o.id === activeId) ? activeId : ordered[0]?.id;

  const move = (to: number) => {
    const next = ordered[Math.max(0, Math.min(ordered.length - 1, to))];
    if (next) itemRefs.current.get(next.id)?.focus();
  };

  const nowMs = toMs(now);
  const showNow = nowMs >= startMs && nowMs <= endMs;
  const nowX = xOf(nowMs);

  const arrows = items.flatMap((target) =>
    (target.dependsOn ?? []).flatMap((id) => {
      const src = items.find((i) => i.id === id);
      return src ? [{ key: `${id}>${target.id}`, src, target }] : [];
    }),
  );
  const arrowPath = (src: TimelineGraphItem, target: TimelineGraphItem) => {
    const a = geometry(src);
    const b = geometry(target);
    const x1 = a.right;
    const x2 = b.left;
    if (x2 >= x1 + 16) return `M${x1},${a.cy} H${x1 + 8} V${b.cy} H${x2}`;
    const detour = a.cy === b.cy ? a.cy + ROW_H / 2 - 4 : (a.cy + b.cy) / 2;
    return `M${x1},${a.cy} H${x1 + 8} V${detour} H${x2 - 8} V${b.cy} H${x2}`;
  };

  return (
    <div
      role="group"
      aria-label={label}
      data-scale={scale}
      data-view={view}
      className={cn("@container flex w-full min-w-0 flex-col gap-2 font-yorha text-yorha-fg", className)}
      onKeyDown={(e) => {
        onKeyDown?.(e);
        if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
        if (e.key === "+" || e.key === "=") {
          e.preventDefault();
          zoom(1);
        } else if (e.key === "-" || e.key === "_") {
          e.preventDefault();
          zoom(-1);
        }
      }}
      {...props}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-yorha-border pb-2">
        <div className="flex items-center gap-1">
          <button type="button" className={btn} aria-label={t.zoomOut} disabled={scale === "week"} onClick={() => zoom(-1)}>
            <span aria-hidden="true">−</span>
          </button>
          <button type="button" className={btn} aria-label={t.zoomIn} disabled={scale === "hour"} onClick={() => zoom(1)}>
            <span aria-hidden="true">+</span>
          </button>
          <span className="inline-block min-w-[3.5em] px-2 text-yorha-sm tracking-yorha-wide text-yorha-fg-soft" data-part="scale-label">
            {t.scale[scale]}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {(["graph", "table"] as const).map((v) => (
            <button
              key={v}
              type="button"
              className={btn}
              aria-pressed={view === v}
              onClick={() => {
                setViewState(v);
                onViewChange?.(v);
              }}
            >
              {t[v]}
            </button>
          ))}
        </div>
      </div>
      {view === "table" ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-yorha-sm">
            <caption className="sr-only">{label}</caption>
            <thead>
              <tr className="border-b border-yorha-border text-yorha-fg-soft">
                {[t.lane, t.title, t.start, t.end, t.dependsOn].map((h) => (
                  <th key={h} scope="col" className="px-2 py-2 font-yorha-medium tracking-yorha-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ordered.map((item) => (
                <tr key={item.id} className="border-b border-yorha-border" data-item-id={item.id}>
                  <td className="px-2 py-2">{laneLabel(item.lane)}</td>
                  <td className="px-2 py-2">
                    {onItemSelect ? (
                      <button
                        type="button"
                        className="inline-flex min-h-[24px] items-center text-left underline decoration-yorha-border underline-offset-4 focus-visible:yorha-focus"
                        onClick={() => onItemSelect(item)}
                      >
                        {item.title}
                      </button>
                    ) : (
                      item.title
                    )}
                  </td>
                  <td className="yorha-tabular px-2 py-2">{fmtCell.format(toMs(item.start))}</td>
                  <td className="yorha-tabular px-2 py-2">{item.end === undefined ? "—" : fmtCell.format(toMs(item.end))}</td>
                  <td className="px-2 py-2">
                    {(item.dependsOn ?? []).map((id) => items.find((i) => i.id === id)?.title ?? id).join(", ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={scrollRef} data-part="scroller" className="flex w-full overflow-x-auto border border-yorha-border bg-yorha-bg">
          <div
            data-part="lane-labels"
            className="sticky left-0 z-10 w-24 shrink-0 border-r border-yorha-border bg-yorha-panel @md:w-36"
          >
            <div style={{ height: AXIS_H }} />
            {lanes.map((lane) => (
              <div
                key={lane.id}
                style={{ height: ROW_H }}
                className="flex items-center border-t border-yorha-border px-2 text-yorha-sm font-yorha-medium tracking-yorha-wide"
              >
                <span className="truncate">{lane.label}</span>
              </div>
            ))}
          </div>
          <svg
            data-part="canvas"
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className="block shrink-0 overflow-hidden text-yorha-fg"
          >
            <defs>
              <marker id={markerId} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" orient="auto">
                <path d="M0,0 L8,4 L0,8 z" className="fill-yorha-fg-soft" />
              </marker>
            </defs>
            {lanes.map((lane, i) => (
              <line
                key={lane.id}
                x1={0}
                x2={width}
                y1={AXIS_H + i * ROW_H}
                y2={AXIS_H + i * ROW_H}
                className="stroke-yorha-border"
                strokeWidth={1}
              />
            ))}
            {alignedTicks(startMs, endMs, scale).map((ms, i) => {
              const x = ((ms - startMs) / unit) * px;
              const [l1, l2] = tickLines(ms, i);
              return (
                <g key={ms} data-part="tick" aria-hidden="true">
                  <line x1={x} x2={x} y1={AXIS_H - 8} y2={height} className="stroke-yorha-border" strokeWidth={1} strokeDasharray="2 4" />
                  <text x={x + 4} y={16} className="fill-yorha-fg-soft text-yorha-xs">
                    {l1}
                  </text>
                  {l2 ? (
                    <text x={x + 4} y={32} className="fill-yorha-fg-soft text-yorha-xs">
                      {l2}
                    </text>
                  ) : null}
                </g>
              );
            })}
            {arrows.map(({ key, src, target }) => (
              <path
                key={key}
                data-part="dependency"
                aria-hidden="true"
                d={arrowPath(src, target)}
                fill="none"
                className="stroke-yorha-fg-soft"
                strokeWidth={1.5}
                markerEnd={`url(#${markerId})`}
              />
            ))}
            {ordered.map((item) => {
              const g = geometry(item);
              return (
                <g
                  key={item.id}
                  ref={(el) => {
                    if (el) itemRefs.current.set(item.id, el);
                    else itemRefs.current.delete(item.id);
                  }}
                  role="button"
                  tabIndex={item.id === tabbableId ? 0 : -1}
                  aria-label={itemLabel(item)}
                  data-item-id={item.id}
                  data-title={item.title}
                  data-lane={item.lane}
                  style={{ "--yorha-stagger-index": laneIndex.get(item.lane) ?? 0 } as React.CSSProperties}
                  className="yorha-stagger group/item cursor-pointer outline-none focus-visible:outline-none"
                  onFocus={() => setActiveId(item.id)}
                  onClick={() => onItemSelect?.(item)}
                  onKeyDown={(e) => {
                    const idx = ordered.indexOf(item);
                    const target: Record<string, number> = {
                      ArrowRight: idx + 1,
                      ArrowDown: idx + 1,
                      ArrowLeft: idx - 1,
                      ArrowUp: idx - 1,
                      Home: 0,
                      End: ordered.length - 1,
                    };
                    if (e.key in target) {
                      e.preventDefault();
                      move(target[e.key]!);
                    } else if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onItemSelect?.(item);
                    }
                  }}
                >
                  <rect
                    x={g.left - 3}
                    y={g.cy - (g.instant ? MARKER_R : BAR_H / 2) - 3}
                    width={g.w + 6}
                    height={(g.instant ? MARKER_R * 2 : BAR_H) + 6}
                    className="fill-none stroke-yorha-ring opacity-0 group-focus-visible/item:opacity-100"
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                  {g.instant ? (
                    <>
                      <path
                        data-part="shape"
                        d={`M${g.x},${g.cy - MARKER_R} L${g.x + MARKER_R},${g.cy} L${g.x},${g.cy + MARKER_R} L${g.x - MARKER_R},${g.cy} Z`}
                        className="fill-yorha-ink stroke-yorha-bg"
                        strokeWidth={1.5}
                      />
                      <text aria-hidden="true" x={g.x + MARKER_R + 6} y={g.cy + 4} className="fill-yorha-fg text-yorha-xs">
                        {item.title}
                      </text>
                    </>
                  ) : (
                    <>
                      <rect data-part="shape" x={g.x} y={g.cy - BAR_H / 2} width={g.w} height={BAR_H} className="fill-yorha-ink" />
                      <svg x={g.x} y={g.cy - BAR_H / 2} width={g.w} height={BAR_H} aria-hidden="true" className="overflow-hidden">
                        <text x={6} y={BAR_H / 2 + 4} className="fill-yorha-on-ink text-yorha-xs">
                          {item.title}
                        </text>
                      </svg>
                    </>
                  )}
                </g>
              );
            })}
            {showNow ? (
              <g aria-hidden="true">
                <line data-part="now" x1={nowX} x2={nowX} y1={0} y2={height} className="stroke-yorha-alert-ui" strokeWidth={2} />
                <text x={nowX + 4} y={AXIS_H - 14} className="fill-yorha-fg-strong text-yorha-xs font-yorha-bold">
                  {t.now}
                </text>
              </g>
            ) : null}
          </svg>
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

const dotClass: Record<TimelineStatus | "none", string> = {
  none: "size-3 rounded-full border-2 border-yorha-border bg-yorha-panel",
  info: "size-3 rounded-full bg-yorha-ink",
  success: "size-3 rounded-full border-2 border-yorha-ink bg-yorha-panel",
  warn: "size-3 rotate-45 bg-yorha-ink",
  danger: "size-3 bg-yorha-alert-ui",
};

/** Vertical event list for logs and history: dot, time, title, body. Entry uses yorha-stagger. */
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
            <span aria-hidden="true" className="absolute top-3 bottom-0 left-3 w-px -translate-x-1/2 bg-yorha-border group-last:hidden" />
            <span aria-hidden="true" className="relative z-1 flex h-6 items-center justify-center">
              <span className={dotClass[item.status ?? "none"]} />
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
