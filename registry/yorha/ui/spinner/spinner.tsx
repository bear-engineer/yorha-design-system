import * as React from "react";
import { cn } from "@/lib/utils";

export interface SpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Accessible name announced for the loading status. */
  label?: string;
}

const DOTS = 3;
const CYCLE_MS = 1200;
const CYCLES = 3; // 3 x 1.2 s = 3.6 s, under the 5 s pause threshold, then rests on solid dots

/**
 * Loading dots run as Web Animations (no keyframes in kit CSS), staggered 160 ms, for
 * CYCLES cycles then rest. Only `data-motion="full"` animates; reduced/off, or no attribute
 * with reduced-motion preferred, keeps the dots still.
 */
function useDots(ref: React.RefObject<HTMLSpanElement | null>) {
  React.useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const html = document.documentElement;
    const motionOf = () =>
      html.dataset.motion ?? (window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "reduced" : "full");
    let anims: Animation[] = [];
    const sync = () => {
      anims.forEach((a) => a.cancel());
      anims = [];
      if (motionOf() !== "full" || typeof root.animate !== "function") return;
      root.querySelectorAll<HTMLElement>("[data-yorha-dot]").forEach((dot, i) => {
        anims.push(
          dot.animate([{ opacity: 0.15 }, { opacity: 1 }, { opacity: 0.15 }], {
            duration: CYCLE_MS,
            delay: i * 160,
            iterations: CYCLES,
            easing: "ease-in-out",
          }),
        );
      });
    };
    const observer = new MutationObserver(sync);
    observer.observe(html, { attributes: true, attributeFilter: ["data-motion"] });
    sync();
    return () => {
      observer.disconnect();
      anims.forEach((a) => a.cancel());
    };
  }, [ref]);
}

/** Loading dots. role=status with an accessible name; the dots themselves are decorative. */
export function Spinner({ label = "로딩 중", className, ...props }: SpinnerProps) {
  const ref = React.useRef<HTMLSpanElement>(null);
  useDots(ref);
  return (
    <span
      ref={ref}
      data-slot="spinner"
      role="status"
      aria-label={label}
      className={cn("inline-flex items-center gap-1.5 font-yorha text-yorha-fg", className)}
      {...props}
    >
      {Array.from({ length: DOTS }, (_, i) => (
        <span key={i} data-yorha-dot="" aria-hidden="true" className="size-2 bg-yorha-ink" />
      ))}
      <span className="sr-only">{label}</span>
    </span>
  );
}
