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

const SWEEP_SHARE = 35; // indicator width (% of track) for the indeterminate sweep
const SWEEP_PASSES = 3; // 3 x 1.4 s = 4.2 s, under the 5 s pause threshold, then rests

/**
 * Indeterminate sweep runs as a Web Animation (no keyframes in kit CSS). Only
 * `data-motion="full"` on <html> animates; reduced/off, or no attribute with reduced-motion
 * preferred, stays at the static start position.
 */
function useSweep(ref: React.RefObject<HTMLDivElement | null>, active: boolean) {
  React.useEffect(() => {
    const el = ref.current;
    if (!el || !active) return;
    const html = document.documentElement;
    const motionOf = () =>
      html.dataset.motion ?? (window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "reduced" : "full");
    let anim: Animation | undefined;
    const sync = () => {
      anim?.cancel();
      anim = undefined;
      if (motionOf() !== "full" || typeof el.animate !== "function") return;
      // indicator is SWEEP_SHARE% of the track wide: starts fully left of it, ends fully right of it
      anim = el.animate(
        [{ transform: "translateX(-100%)" }, { transform: `translateX(${Math.round(100 / (SWEEP_SHARE / 100))}%)` }],
        { duration: 1400, iterations: SWEEP_PASSES, easing: "linear" },
      );
    };
    const observer = new MutationObserver(sync);
    observer.observe(html, { attributes: true, attributeFilter: ["data-motion"] });
    sync();
    return () => {
      observer.disconnect();
      anim?.cancel();
    };
  }, [ref, active]);
}

/**
 * Segmented YoRHa gauge on Base UI Progress. Determinate shows the percentage; indeterminate
 * removes aria-valuenow and sweeps a block across the track.
 */
export function Progress({ value = null, max = 100, label, segments = 10, className, ...props }: ProgressProps) {
  const indeterminate = value === null;
  const indicatorRef = React.useRef<HTMLDivElement>(null);
  useSweep(indicatorRef, indeterminate);
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
          className={cn("h-full bg-yorha-ink", indeterminate && "absolute inset-y-0 left-0 w-[35%]")}
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
