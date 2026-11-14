import * as React from "react";
import { cn } from "@/lib/utils";

export interface SpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Accessible name announced for the loading status. */
  label?: string;
}

const DOTS = 3;
// off mode is static, so the dots step down in opacity: a still row reads as "busy", not "done"
const STATIC_STEPS = ["opacity-100", "opacity-60", "opacity-30"];

/**
 * Loading dots run as Web Animations (no keyframes in kit CSS) for as long as the spinner is
 * mounted: one `--motion-loop` cycle per pass, staggered by --motion-stagger, eased with
 * --yorha-ease-emphasized. full = three staggered dot pulses; reduced (data-motion, or no
 * attribute with reduced-motion preferred) = a single slow opacity pulse on the whole spinner
 * (--motion-loop is 2400ms there); off = no animation.
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
      const mode = motionOf();
      if (mode === "off" || typeof root.animate !== "function") return;
      const css = getComputedStyle(html);
      const loop = parseFloat(css.getPropertyValue("--motion-loop")) || 0;
      if (loop <= 0) return;
      const easing = css.getPropertyValue("--yorha-ease-emphasized").trim() || "linear";
      if (mode === "reduced") {
        anims.push(
          root.animate([{ opacity: 0.35 }, { opacity: 1 }, { opacity: 0.35 }], { duration: loop, iterations: Infinity, easing }),
        );
        return;
      }
      const stagger = parseFloat(css.getPropertyValue("--motion-stagger")) || 0;
      root.querySelectorAll<HTMLElement>("[data-yorha-dot]").forEach((dot, i) => {
        anims.push(
          dot.animate([{ opacity: 0.15 }, { opacity: 1 }, { opacity: 0.15 }], {
            duration: loop,
            delay: i * stagger,
            fill: "backwards",
            iterations: Infinity,
            easing,
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
        <span key={i} data-yorha-dot="" aria-hidden="true" className={cn("size-2 bg-yorha-ink", STATIC_STEPS[i] ?? "opacity-30")} />
      ))}
      <span className="sr-only">{label}</span>
    </span>
  );
}
