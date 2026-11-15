import * as React from "react";
import { cn } from "@/lib/utils";

export interface SpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Accessible name announced for the loading status. */
  label?: string;
  /** Box size: sm 12 px, md 16 px (default), lg 24 px. The box never changes with motion mode. */
  size?: "sm" | "md" | "lg";
}

/**
 * Perimeter of a 3x3 grid, clockwise from the top-left: [col, row]. Integer geometry per size, dots centred:
 * box = 2*pitch + dot + 2*inset.
 *   sm: dot 2, pitch 4, inset 1 -> 2*4+2+2 = 12
 *   md: dot 4, pitch 6, inset 0 -> 2*6+4   = 16
 *   lg: dot 6, pitch 9, inset 0 -> 2*9+6   = 24
 */
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
const GEOMETRY = {
  sm: { box: 12, dot: 2, pitch: 4, inset: 1 },
  md: { box: 16, dot: 4, pitch: 6, inset: 0 },
  lg: { box: 24, dot: 6, pitch: 9, inset: 0 },
} as const;
/**
 * Ink floor of the empty ring (never below 0.3 so the ring never vanishes) and the lead + 2-dot trail. sm has 2 px dots
 * and reads as faint dust at the md values, so it rests higher and its trail is denser.
 */
const TONE = {
  sm: { rest: 0.5, trail: [1, 0.85, 0.65] },
  md: { rest: 0.4, trail: [1, 0.75, 0.52] },
  lg: { rest: 0.4, trail: [1, 0.75, 0.52] },
} as const;
/** Static (motion off) opacity of dot i: lead at dot 0, trail on the two dots behind it (counter-clockwise). */
const restOpacity = (i: number, tone: (typeof TONE)[keyof typeof TONE]) => {
  const behind = (RING.length - i) % RING.length;
  return behind < tone.trail.length ? tone.trail[behind]! : tone.rest;
};

/**
 * Trail: each dot rises linearly to full ink as the head arrives, then falls through 0.75 / 0.52 to the 0.4 resting
 * ink over the next three dot-slots (lap/8 each) and holds, staggered clockwise by lap/8, so a smooth tail follows
 * the head (no steps), as Web Animations (no keyframes in kit CSS) while mounted. reduced (data-motion, or no
 * attribute with reduced-motion preferred) = the whole spinner pulses 0.7-1; off = no animation, the ring rests
 * with a lead dot and its two-dot trail so a still spinner still reads as "busy".
 */
function useTrail(ref: React.RefObject<HTMLSpanElement | null>, size: keyof typeof TONE) {
  const { rest: REST, trail: TRAIL } = TONE[size];
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
        anims.push(root.animate([{ opacity: 0.7 }, { opacity: 1 }, { opacity: 0.7 }], { duration: loop, iterations: Infinity, easing: "ease-in-out" }));
        return;
      }
      const slot = 1 / RING.length;
      root.querySelectorAll<HTMLElement>("[data-yorha-dot]").forEach((dot, i) => {
        anims.push(
          dot.animate(
            [
              { opacity: REST, offset: 0 },
              { opacity: TRAIL[0], offset: 0.04 },
              { opacity: TRAIL[1], offset: 0.04 + slot },
              { opacity: TRAIL[2], offset: 0.04 + slot * 2 },
              { opacity: REST, offset: 0.04 + slot * 3 },
              { opacity: REST, offset: 1 },
            ],
            { duration: loop, delay: (loop / RING.length) * i, iterations: Infinity, easing: "linear" },
          ),
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
  }, [ref, REST, TRAIL]);
}

/** Loading trail in a fixed square box (`align-top` keeps the dots on whole pixels in running text; centre it with a flex/grid parent). role=status with an accessible name; the dots themselves are decorative. */
export function Spinner({ label = "로딩 중", size = "md", className, ...props }: SpinnerProps) {
  const ref = React.useRef<HTMLSpanElement>(null);
  useTrail(ref, size);
  const g = GEOMETRY[size];
  return (
    <span
      ref={ref}
      data-slot="spinner"
      data-size={size}
      role="status"
      aria-label={label}
      className={cn("relative inline-block shrink-0 align-top font-yorha text-yorha-fg", className)}
      style={{ width: g.box, height: g.box }}
      {...props}
    >
      {RING.map(([col, row], i) => (
        <span
          key={i}
          data-yorha-dot=""
          aria-hidden="true"
          className="absolute bg-yorha-ink"
          style={{
            width: g.dot,
            height: g.dot,
            left: g.inset + col * g.pitch,
            top: g.inset + row * g.pitch,
            opacity: restOpacity(i, TONE[size]),
          }}
        />
      ))}
      <span className="sr-only">{label}</span>
    </span>
  );
}
