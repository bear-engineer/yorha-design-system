import * as React from "react";
import { Progress as BaseProgress } from "@base-ui/react/progress";
import { cn, cnState } from "@/lib/utils";

export type GaugeSize = "sm" | "md";
export type GaugeStatus = "active" | "paused" | "error";

export interface ProgressProps extends Omit<React.ComponentProps<typeof BaseProgress.Root>, "children" | "value"> {
  /** Current value 0..max. `null` is indeterminate: no aria-valuenow is rendered. */
  value?: number | null;
  /** Visible and accessible name. */
  label: string;
  /** `md` (default): 6 px cells on an 8 px pitch, 14 px track. `sm`: 4 px cells on a 6 px pitch, 10 px track. */
  size?: GaugeSize;
  /** `paused` draws half-height cells in the soft colour; `error` uses the alert colour. The box never changes. */
  status?: GaugeStatus;
  /** Notches at 25 / 50 / 75 % in the frame padding, snapped to cell boundaries. */
  ticks?: boolean;
  /** Text for `aria-valuetext` and the visible value; default `40%` / `진행 중`. */
  formatValue?: (value: number | null) => string;
}

/* ---- motion (smooth, never stepped): the cell look is a static mask, only the fill behind it moves ---- */

type MotionMode = "full" | "reduced" | "off";

const ADVANCE_MS = 240;
const SWEEP_MS = 1400;

function readMode(): MotionMode {
  const mode = document.documentElement.dataset.motion;
  if (mode === "full" || mode === "reduced" || mode === "off") return mode;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "reduced" : "full";
}

function useMotionMode(): MotionMode {
  const [mode, setMode] = React.useState<MotionMode>("full");
  React.useLayoutEffect(() => {
    const sync = () => setMode(readMode());
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion"] });
    sync();
    return () => observer.disconnect();
  }, []);
  return mode;
}

/** Pixel width of an element, kept in state so cell counts and clip insets are whole pixels. */
function useWidth(ref: React.RefObject<HTMLElement | null>): number {
  const [width, setWidth] = React.useState(0);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const sync = () => setWidth(Math.round(el.getBoundingClientRect().width));
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    sync();
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

const PITCH: Record<GaugeSize, number> = { md: 8, sm: 6 };
const CELL: Record<GaugeSize, number> = { md: 6, sm: 4 };
const HEIGHT: Record<GaugeSize, number> = { md: 8, sm: 4 };
/** Frame (1 px x 2) + inset (2 px x 2) around the cells. */
const CHROME = 6;

const cellMask = (size: GaugeSize) => `linear-gradient(to right, black 0 ${CELL[size]}px, transparent ${CELL[size]}px ${PITCH[size]}px)`;

function maskStyle(size: GaugeSize, band?: string): React.CSSProperties {
  const image = band ? `${cellMask(size)}, ${band}` : cellMask(size);
  const tile = band ? `${PITCH[size]}px 100%, 100% 100%` : `${PITCH[size]}px 100%`;
  const repeat = band ? "repeat-x, no-repeat" : "repeat-x";
  return {
    maskImage: image,
    WebkitMaskImage: image,
    maskSize: tile,
    WebkitMaskSize: tile,
    maskRepeat: repeat,
    WebkitMaskRepeat: repeat,
    maskComposite: band ? "intersect" : undefined,
    WebkitMaskComposite: band ? "source-in" : undefined,
  };
}

export interface GaugeProps {
  /** Rendered as the track: BaseProgress.Track or BaseMeter.Track. */
  Track: React.ElementType;
  /** data-slot prefix: progress | meter. */
  slot: string;
  size: GaugeSize;
  /** 0..100, or null for the indeterminate sweep. */
  pct: number | null;
  status?: GaugeStatus;
  /** `alert` paints the fill with the alert colour (error, critical). */
  tone?: "ink" | "alert";
  ticks?: boolean;
  /** Threshold marks: % positions (ink) or `{ at, tone }`. Painted 2 px ticks in a cell gap, crossing the bottom frame. */
  notches?: Array<number | { at: number; tone: "ink" | "alert" }>;
  trackProps?: Record<string, unknown>;
}

/** Whole-cell clip: 0 cells when pct is 0, at least 1 when pct > 0, `round(pct)` cells otherwise. */
export function filledCells(pct: number, cells: number): number {
  return pct <= 0 ? 0 : Math.max(1, Math.round((pct / 100) * cells));
}

/**
 * The shared gauge body (also used by Meter): 14 px (md) / 10 px (sm) framed track, 2 px inset, cells drawn by a static
 * mask over a fill that moves smoothly (clip-path on increase, a linear translateX sweep when indeterminate).
 * Empty cells are 2 px hairline ticks (ghost), filled cells are solid blocks: shape, not two greys.
 */
export function Gauge({ Track, slot, size, pct, status = "active", tone = "ink", ticks, notches, trackProps }: GaugeProps) {
  const mode = useMotionMode();
  const cellsRef = React.useRef<HTMLDivElement>(null);
  const fillRef = React.useRef<HTMLDivElement>(null);
  const sweepRef = React.useRef<HTMLSpanElement>(null);
  const width = useWidth(cellsRef);
  const pitch = PITCH[size];
  const cells = Math.floor(width / pitch);
  const indeterminate = pct === null;
  const n = indeterminate ? cells : filledCells(pct, cells);
  const right = Math.max(0, width - n * pitch);
  const sweepWidth = Math.max(pitch, Math.round((width * 0.3) / pitch) * pitch);

  // determinate increase: clip-path eased by the --yorha-ease-out token (a strong ease-out), 240 ms; decreases and reduced/off are instant
  const previous = React.useRef<{ n: number; width: number } | null>(null);
  React.useEffect(() => {
    const was = previous.current;
    previous.current = { n, width };
    const el = fillRef.current;
    if (!el || indeterminate || !was || was.width !== width || n <= was.n || mode !== "full" || typeof el.animate !== "function") return;
    const anim = el.animate(
      [{ clipPath: `inset(0px ${width - was.n * pitch}px 0px 0px)` }, { clipPath: `inset(0px ${right}px 0px 0px)` }],
      { duration: ADVANCE_MS, easing: getComputedStyle(document.documentElement).getPropertyValue("--yorha-ease-out").trim() || "ease-out" },
    );
    return () => anim.cancel();
  }, [n, width, right, pitch, indeterminate, mode]);

  // indeterminate: smooth linear sweep (full), opacity pulse (reduced), static alternate cells (off)
  React.useEffect(() => {
    const el = sweepRef.current;
    if (!el || !indeterminate || mode === "off" || width <= 0 || typeof el.animate !== "function") return;
    const anim =
      mode === "reduced"
        ? el.animate([{ opacity: 0.35 }, { opacity: 1 }, { opacity: 0.35 }], { duration: SWEEP_MS * 2, iterations: Infinity, easing: "ease-in-out" })
        : el.animate([{ transform: `translateX(${-sweepWidth}px)` }, { transform: `translateX(${width}px)` }], {
            duration: SWEEP_MS,
            iterations: Infinity,
            easing: "linear",
          });
    return () => anim.cancel();
  }, [indeterminate, mode, width, sweepWidth]);

  const color = tone === "alert" || status === "error" ? "bg-yorha-alert-ui" : status === "paused" ? "bg-yorha-fg-soft" : "bg-yorha-ink";
  const keep = "[forced-color-adjust:none]";
  const half = HEIGHT[size] / 2;
  // paused: the mask is intersected with a vertical band, so the fill box (and every rect) stays identical
  const band = `linear-gradient(to bottom, transparent 0 ${half / 2}px, black ${half / 2}px ${half / 2 + half}px, transparent ${half / 2 + half}px)`;
  const cellStyle = status === "paused" ? maskStyle(size, band) : maskStyle(size);
  const alternate = `repeating-linear-gradient(to right, currentColor 0 ${pitch}px, transparent ${pitch}px ${pitch * 2}px)`;
  const tickAt = (p: number) => Math.round((p / 100) * cells) * pitch - 2;

  return (
    <Track
      data-slot={`${slot}-track`}
      data-status={status}
      className={cn(
        "relative border border-yorha-border bg-yorha-bg p-[2px] data-[low]:border-yorha-alert-ui data-[status=error]:border-yorha-alert-ui",
        size === "md" ? "h-[14px]" : "h-[10px]",
      )}
      {...trackProps}
    >
      <div className="relative w-full" style={{ height: HEIGHT[size] }}>
        <div
          aria-hidden="true"
          data-slot={`${slot}-ghost`}
          className={cn("absolute inset-x-0 h-[2px] bg-yorha-border forced-colors:bg-[GrayText]", keep)}
          style={{ top: half - 1, ...maskStyle(size) }}
        />
        <div ref={cellsRef} aria-hidden="true" data-slot={`${slot}-cells`} className="absolute inset-0 overflow-hidden" style={cellStyle}>
          <div
            ref={fillRef}
            data-slot={`${slot}-fill`}
            className={cn("absolute inset-0 text-yorha-ink forced-colors:text-[CanvasText]", indeterminate ? "bg-transparent" : cn(color, keep, "forced-colors:bg-[CanvasText]"))}
            style={{ clipPath: `inset(0px ${indeterminate ? 0 : right}px 0px 0px)` }}
          >
            {indeterminate ? (
              <span
                ref={sweepRef}
                data-slot={`${slot}-sweep`}
                className={cn("absolute inset-y-0 left-0 block", keep, mode === "full" ? cn(color, "forced-colors:bg-[CanvasText]") : "bg-transparent")}
                style={mode === "full" ? { width: sweepWidth, transform: `translateX(${-sweepWidth}px)` } : { width: "100%", backgroundImage: alternate }}
              />
            ) : null}
          </div>
        </div>
        {ticks
          ? [25, 50, 75].map((p) => (
              <span
                key={p}
                aria-hidden="true"
                data-slot={`${slot}-tick`}
                className="absolute top-[-2px] h-[2px] w-[2px] bg-yorha-border forced-colors:bg-[CanvasText]"
                style={{ left: tickAt(p) }}
              />
            ))
          : null}
        {(notches ?? []).map((n, i) => {
          const { at, tone: nt } = typeof n === "number" ? { at: n, tone: "ink" as const } : n;
          return (
            <span
              key={i}
              aria-hidden="true"
              data-slot={`${slot}-notch`}
              data-tone={nt}
              className={cn(
                "absolute bottom-[-6px] h-[9px] w-[2px] forced-colors:bg-[CanvasText]",
                nt === "alert" ? "bg-yorha-alert-ui" : "bg-yorha-ink",
              )}
              style={{ left: tickAt(at) }}
            />
          );
        })}
      </div>
    </Track>
  );
}

/** Snaps the whole gauge (label row included) to a whole number of cells, so the right edge is a cell edge. */
export const gaugeWidth = (size: GaugeSize): React.CSSProperties => ({
  width: `calc(round(down, 100% - ${CHROME}px, ${PITCH[size]}px) + ${CHROME}px)`,
});

export const gaugeRoot = "flex max-w-full flex-col gap-[6px] font-yorha text-yorha-fg";
export const gaugeRow = "flex h-4 items-baseline justify-between gap-3";
export const gaugeLabel = "min-w-0 truncate text-yorha-sm leading-4 uppercase tracking-yorha-wide text-yorha-fg-soft";
export const gaugeValue = "yorha-tabular shrink-0 whitespace-nowrap text-yorha-sm leading-4 text-yorha-fg";

/**
 * YoRHa gauge on Base UI Progress: framed track, solid ink cells over hairline ticks, value in tabular numerals.
 * Indeterminate removes aria-valuenow and sweeps a block smoothly across the cells.
 */
export function Progress({ value = null, max = 100, label, size = "md", status = "active", ticks, formatValue, className, style, ...props }: ProgressProps) {
  const pct = value === null ? null : max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const text = formatValue ?? ((v: number | null) => (v === null ? "진행 중" : `${v}%`));
  return (
    <BaseProgress.Root
      value={value}
      max={max}
      getAriaValueText={(_formatted, v) => text(v ?? null)}
      data-status={status}
      data-complete={pct === 100 ? "" : undefined}
      className={cnState(cn(gaugeRoot), className)}
      style={{ ...gaugeWidth(size), ...(style as React.CSSProperties) }}
      {...props}
    >
      <div data-slot="progress-row" className={gaugeRow}>
        <BaseProgress.Label data-slot="progress-label" title={label} className={gaugeLabel}>
          {label}
        </BaseProgress.Label>
        <BaseProgress.Value data-slot="progress-value" className={cn(gaugeValue, status === "error" && "text-yorha-alert")}>
          {(_formatted, v) => text(v ?? null)}
        </BaseProgress.Value>
      </div>
      <Gauge Track={BaseProgress.Track} slot="progress" size={size} pct={pct} status={status} ticks={ticks} />
    </BaseProgress.Root>
  );
}
