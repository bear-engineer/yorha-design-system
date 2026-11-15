import * as React from "react";
import { Progress as BaseProgress } from "@base-ui/react/progress";
import { cn, cnState } from "@/lib/utils";

export interface ProgressProps extends Omit<React.ComponentProps<typeof BaseProgress.Root>, "children" | "value"> {
  /** Current value 0..max. `null` is indeterminate: no aria-valuenow is rendered. */
  value?: number | null;
  /** Visible and accessible name. */
  label: string;
  /** Number of gauge segments, drawn as seams over the bar (`variant="segments"`). */
  segments?: number;
  /** `segments` (default): ink fill with seams. `dots`: three rows of 2 px dots on a 4 px pitch, filled in whole columns. */
  variant?: "segments" | "dots";
  /** Text for `aria-valuetext` and the visible value; default `40%` / `진행 중`. */
  formatValue?: (value: number | null) => string;
}

const SWEEP_SHARE = 35; // width (% of track) of the moving segment in full motion

type MotionMode = "full" | "reduced" | "off";

function readMode(): MotionMode {
  const html = document.documentElement;
  const mode = html.dataset.motion;
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

/**
 * Indeterminate loop as a Web Animation (no keyframes in kit CSS), running for as long as the bar
 * is mounted, one `--motion-loop` cycle per pass. full = a SWEEP_SHARE% segment hops across the track in
 * `--yorha-step-loop` steps; reduced = the striped full-width
 * indicator pulses in opacity (eased with --yorha-ease-emphasized; --motion-loop is 2400ms there); off = it rests as stripes.
 */
function useSweep(ref: React.RefObject<HTMLDivElement | null>, active: boolean, mode: MotionMode) {
  React.useEffect(() => {
    const el = ref.current;
    if (!el || !active || mode === "off" || typeof el.animate !== "function") return;
    const css = getComputedStyle(document.documentElement);
    const loop = parseFloat(css.getPropertyValue("--motion-loop")) || 0;
    if (loop <= 0) return;
    const easing = css.getPropertyValue("--yorha-ease-emphasized").trim() || "linear";
    const steps = css.getPropertyValue("--yorha-step-loop").trim() || "linear";
    const anim =
      mode === "reduced"
        ? el.animate([{ opacity: 0.35 }, { opacity: 1 }, { opacity: 0.35 }], { duration: loop, iterations: Infinity, easing })
        : // the segment is SWEEP_SHARE% of the track wide: starts fully left of it, ends fully right of it
          el.animate(
            [{ transform: "translateX(-100%)" }, { transform: `translateX(${Math.round(100 / (SWEEP_SHARE / 100))}%)` }],
            { duration: loop, iterations: Infinity, easing: steps },
          );
    return () => anim.cancel();
  }, [ref, active, mode]);
}

const DOT_PITCH = 4;

/**
 * Determinate advance: when the value grows, the fill is revealed from its old edge to the new one by a stepped
 * clip-path (compositor-only, `--yorha-step-reveal`, one `--motion-select`). Shrinking is instant. Reduced and off: no clip.
 */
function useAdvance(ref: React.RefObject<HTMLElement | null>, pct: number | null, mode: MotionMode) {
  const previous = React.useRef<number | null>(null);
  React.useEffect(() => {
    const was = previous.current;
    previous.current = pct;
    const el = ref.current;
    if (!el || pct === null || was === null || pct <= was || mode !== "full" || typeof el.animate !== "function") return;
    const css = getComputedStyle(document.documentElement);
    const duration = parseFloat(css.getPropertyValue("--motion-select")) || 0;
    if (duration <= 0) return;
    const easing = css.getPropertyValue("--yorha-step-reveal").trim() || "linear";
    const hidden = (1 - was / pct) * 100;
    const anim = el.animate([{ clipPath: `inset(0 ${hidden}% 0 0)` }, { clipPath: "inset(0 0 0 0)" }], { duration, easing });
    return () => anim.cancel();
  }, [ref, pct, mode]);
}

/**
 * Segmented YoRHa gauge on Base UI Progress. Determinate shows the percentage; indeterminate
 * removes aria-valuenow and loops a moving segment (striped when motion is reduced/off).
 */
export function Progress({ value = null, max = 100, label, segments = 10, variant = "segments", formatValue, className, ...props }: ProgressProps) {
  const indeterminate = value === null;
  const indicatorRef = React.useRef<HTMLDivElement>(null);
  const mode = useMotionMode();
  useSweep(indicatorRef, indeterminate, mode);
  const dots = variant === "dots";
  const pct = value === null ? null : max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const fillRef = React.useRef<HTMLSpanElement>(null);
  useAdvance(dots ? fillRef : indicatorRef, pct, mode);
  const text = formatValue ?? ((v: number | null) => (v === null ? "진행 중" : `${v}%`));
  const step = 100 / Math.max(1, segments);
  const seams = `repeating-linear-gradient(to right, transparent 0 calc(${step}% - 2px), var(--yorha-panel) calc(${step}% - 2px) ${step}%)`;

  return (
    <BaseProgress.Root
      value={value}
      max={max}
      getAriaValueText={(_formatted, v) => text(v ?? null)}
      className={cnState(cn("flex w-full flex-col gap-1 font-yorha text-yorha-fg"), className)}
      {...props}
    >
      <div className="flex items-baseline justify-between gap-3">
        <BaseProgress.Label title={label} className="min-w-0 truncate text-yorha-sm uppercase tracking-yorha-wide text-yorha-fg-soft">
          {label}
        </BaseProgress.Label>
        <BaseProgress.Value className="yorha-tabular shrink-0 whitespace-nowrap text-yorha-sm text-yorha-fg">
          {(_formatted, v) => text(v ?? null)}
        </BaseProgress.Value>
      </div>
      <BaseProgress.Track className="relative h-4 overflow-hidden rounded-yorha border border-yorha-border bg-yorha-bg">
        <BaseProgress.Indicator
          ref={indicatorRef}
          data-yorha-sweep={indeterminate ? "" : undefined}
          className={cn(
            dots ? (indeterminate ? "yorha-dots absolute top-[2px] left-0 h-[10px] text-yorha-ink" : "h-full bg-transparent") : "h-full bg-yorha-ink",
            indeterminate && !dots && "absolute inset-y-0 left-0",
            indeterminate && mode === "full" && (dots ? "w-[round(down,35%,4px)]" : "w-[35%]"),
            // dots, reduced/off: whole columns across the track
            indeterminate && dots && mode !== "full" && "w-[round(down,100%,4px)]",
            // reduced/off: no moving segment, so a full-width striped fill (never a lone % block) reads as "busy"
            indeterminate &&
              !dots &&
              mode !== "full" &&
              "w-full bg-transparent bg-[repeating-linear-gradient(135deg,var(--yorha-ink)_0_0.25rem,transparent_0.25rem_0.5rem)]",
          )}
        />
        {dots ? (
          <>
            <span
              aria-hidden="true"
              data-slot="dots-ghost"
              className="yorha-dots absolute top-[2px] left-0 h-[10px] text-yorha-border"
              style={{ width: `round(down, 100%, ${DOT_PITCH}px)` }}
            />
            {pct === null ? null : (
              <span
                ref={fillRef}
                aria-hidden="true"
                data-slot="dots-fill"
                data-pitch={DOT_PITCH}
                className="yorha-dots absolute top-[2px] left-0 h-[10px] text-yorha-ink"
                style={{ width: `round(down, ${pct}%, ${DOT_PITCH}px)` }}
              />
            )}
          </>
        ) : (
          <span aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ backgroundImage: seams }} />
        )}
      </BaseProgress.Track>
    </BaseProgress.Root>
  );
}
