import * as React from "react";
import { cn } from "@/lib/utils";

export interface SpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Accessible name announced for the loading status. */
  label?: string;
}

/** Perimeter of a 3x3 grid, clockwise from the top-left: [col, row]. Dots are 2 px on a 4 px pitch inside a 12 px box. */
const RING = [
  [0, 0],
  [1, 0],
  [2, 0],
  [2, 1],
  [2, 2],
  [1, 2],
  [0, 2],
  [0, 1],
] as const;
const ARC = 3;
const LIT = 1;
const DIM = 0.15;
const lit = (step: number, dot: number) => (step - dot + RING.length) % RING.length < ARC;

/**
 * Trail: each dot rises to 1 and fades linearly back to 0.15 over one `--motion-loop` lap, the dots staggered by
 * lap/8 clockwise, so a smooth tail follows the head around the ring (no steps, no discrete jumps), as Web
 * Animations (no keyframes in kit CSS) for as long as the spinner is mounted. reduced (data-motion, or no attribute
 * with reduced-motion preferred) = a single slow opacity pulse on the whole spinner;
 * off = no animation, the arc rests on the first three dots so a still spinner still reads as "busy".
 */
function useTrail(ref: React.RefObject<HTMLSpanElement | null>) {
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
      const mode = motionOf();
      if (mode === "off" || typeof root.animate !== "function") return;
      const css = getComputedStyle(html);
      const loop = parseFloat(css.getPropertyValue("--motion-loop")) || 0;
      if (loop <= 0) return;
      if (mode === "reduced") {
  anims.push(root.animate([{ opacity: 0.35 }, { opacity: 1 }, { opacity: 0.35 }], { duration: loop, iterations: Infinity, easing: "ease-in-out" }));
        return;
      }
      // smooth trail: linear rise as the head arrives, linear fade over the rest of the lap, staggered lap/8 per dot
      root.querySelectorAll<HTMLElement>("[data-yorha-dot]").forEach((dot, i) => {
        anims.push(
          dot.animate([{ opacity: DIM }, { opacity: LIT, offset: 0.06 }, { opacity: DIM }], {
            duration: loop,
            delay: (loop / RING.length) * i,
            iterations: Infinity,
            easing: "linear",
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

/** Loading trail in a fixed 12 px box (`align-top` keeps the dots on whole pixels in running text; centre it with a flex/grid parent). role=status with an accessible name; the dots themselves are decorative. */
export function Spinner({ label = "로딩 중", className, ...props }: SpinnerProps) {
  const ref = React.useRef<HTMLSpanElement>(null);
  useTrail(ref);
  return (
    <span
      ref={ref}
      data-slot="spinner"
      role="status"
      aria-label={label}
      className={cn("relative inline-block size-[12px] shrink-0 align-top font-yorha text-yorha-fg", className)}
      {...props}
    >
      {RING.map(([col, row], i) => (
        <span
          key={i}
          data-yorha-dot=""
          aria-hidden="true"
          className={cn("absolute size-[2px] bg-yorha-ink", lit(0, i) ? "opacity-100" : "opacity-15")}
          style={{ left: 1 + col * 4, top: 1 + row * 4 }}
        />
      ))}
      <span className="sr-only">{label}</span>
    </span>
  );
}
