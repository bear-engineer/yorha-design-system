import * as React from "react";
import { Progress as BaseProgress } from "@base-ui/react/progress";
import { cn, cnState } from "@/lib/utils";

export interface ProgressProps extends Omit<React.ComponentProps<typeof BaseProgress.Root>, "children" | "value"> {
  /** Current value 0..max. `null` is indeterminate: no aria-valuenow is rendered. */
  value?: number | null;
  /** Visible and accessible name. */
  label: string;
  /** Number of gauge segments, drawn as seams over the bar. */
  segments?: number;
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
 * is mounted, one `--motion-loop` cycle per pass, eased with --yorha-ease-emphasized.
 * full = a SWEEP_SHARE% segment travels across the track; reduced = the striped full-width
 * indicator pulses in opacity (--motion-loop is 2400ms there); off = it rests as stripes.
 */
function useSweep(ref: React.RefObject<HTMLDivElement | null>, active: boolean, mode: MotionMode) {
  React.useEffect(() => {
    const el = ref.current;
    if (!el || !active || mode === "off" || typeof el.animate !== "function") return;
    const css = getComputedStyle(document.documentElement);
    const loop = parseFloat(css.getPropertyValue("--motion-loop")) || 0;
    if (loop <= 0) return;
    const easing = css.getPropertyValue("--yorha-ease-emphasized").trim() || "linear";
    const anim =
      mode === "reduced"
        ? el.animate([{ opacity: 0.35 }, { opacity: 1 }, { opacity: 0.35 }], { duration: loop, iterations: Infinity, easing })
        : // the segment is SWEEP_SHARE% of the track wide: starts fully left of it, ends fully right of it
          el.animate(
            [{ transform: "translateX(-100%)" }, { transform: `translateX(${Math.round(100 / (SWEEP_SHARE / 100))}%)` }],
            { duration: loop, iterations: Infinity, easing },
          );
    return () => anim.cancel();
  }, [ref, active, mode]);
}

/**
 * Segmented YoRHa gauge on Base UI Progress. Determinate shows the percentage; indeterminate
 * removes aria-valuenow and loops a moving segment (striped when motion is reduced/off).
 */
export function Progress({ value = null, max = 100, label, segments = 10, className, ...props }: ProgressProps) {
  const indeterminate = value === null;
  const indicatorRef = React.useRef<HTMLDivElement>(null);
  const mode = useMotionMode();
  useSweep(indicatorRef, indeterminate, mode);
  const step = 100 / Math.max(1, segments);
  const seams = `repeating-linear-gradient(to right, transparent 0 calc(${step}% - 2px), var(--yorha-panel) calc(${step}% - 2px) ${step}%)`;

  return (
    <BaseProgress.Root
      value={value}
      max={max}
      getAriaValueText={(_formatted, v) => (v === null || v === undefined ? "진행 중" : `${v}%`)}
      className={cnState(cn("flex w-full flex-col gap-1 font-yorha text-yorha-fg"), className)}
      {...props}
    >
      <div className="flex items-baseline justify-between gap-3">
        <BaseProgress.Label className="text-yorha-sm uppercase tracking-yorha-wide text-yorha-fg-soft">
          {label}
        </BaseProgress.Label>
        <BaseProgress.Value className="text-yorha-sm tabular-nums text-yorha-fg">
          {(_formatted, v) => (v === null || v === undefined ? "진행 중" : `${v}%`)}
        </BaseProgress.Value>
      </div>
      <BaseProgress.Track className="relative h-4 overflow-hidden rounded-yorha border border-yorha-border bg-yorha-bg">
        <BaseProgress.Indicator
          ref={indicatorRef}
          data-yorha-sweep={indeterminate ? "" : undefined}
          className={cn(
            "h-full bg-yorha-ink",
            indeterminate && "absolute inset-y-0 left-0",
            indeterminate && mode === "full" && "w-[35%]",
            // reduced/off: no moving segment, so a full-width striped fill (never a lone % block) reads as "busy"
            indeterminate &&
              mode !== "full" &&
              "w-full bg-transparent bg-[repeating-linear-gradient(135deg,var(--yorha-ink)_0_0.25rem,transparent_0.25rem_0.5rem)]",
          )}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: seams }}
        />
      </BaseProgress.Track>
    </BaseProgress.Root>
  );
}
