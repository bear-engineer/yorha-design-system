import { useEffect, useRef, type HTMLAttributes, type RefObject } from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** Accessible name announced for the loading region. */
  label?: string;
}

/**
 * Shimmer runs as a Web Animation (no keyframes in the kit CSS) for as long as the skeleton is
 * mounted: one `--motion-loop` cycle per scan, eased with --yorha-ease-emphasized. full = the
 * grid scans down; reduced (data-motion, or no attribute with reduced-motion preferred) = one
 * opacity pulse of the grid; off = the grid rests still (the grid plus aria-busy mark it as loading).
 */
function useScan(ref: RefObject<HTMLSpanElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const html = document.documentElement;
    const motionOf = () =>
      html.dataset.motion ?? (window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "reduced" : "full");
    let anim: Animation | undefined;
    const sync = () => {
      anim?.cancel();
      anim = undefined;
      const mode = motionOf();
      if (mode === "off" || typeof el.animate !== "function") return;
      const css = getComputedStyle(html);
      const loop = parseFloat(css.getPropertyValue("--motion-loop")) || 0;
      if (loop <= 0) return;
      const easing = css.getPropertyValue("--yorha-ease-emphasized").trim() || "linear";
      anim =
        mode === "reduced"
          ? el.animate([{ opacity: 0.3 }, { opacity: 1 }, { opacity: 0.3 }], { duration: loop, iterations: Infinity, easing })
          : el.animate([{ transform: "translateY(-100%)" }, { transform: "translateY(100%)" }], {
              duration: loop,
              iterations: Infinity,
              easing,
            });
    };
    const observer = new MutationObserver(sync);
    observer.observe(html, { attributes: true, attributeFilter: ["data-motion"] });
    sync();
    return () => {
      observer.disconnect();
      anim?.cancel();
    };
  }, [ref]);
}

/** Loading placeholder: faint 0.3rem grid scan inside a live region named by `label`. */
function Skeleton({ label = "로딩 중", className, ...props }: SkeletonProps) {
  const scanRef = useRef<HTMLSpanElement>(null);
  useScan(scanRef);
  return (
    <div
      data-slot="skeleton"
      role="status"
      aria-label={label}
      aria-busy="true"
      className={cn("relative overflow-hidden rounded-yorha bg-yorha-separator/25", className)}
      {...props}
    >
      <span
        ref={scanRef}
        aria-hidden="true"
        data-yorha-shimmer=""
        className="pointer-events-none absolute inset-x-0 -top-full bottom-0 bg-[linear-gradient(to_right,var(--yorha-grid)_1px,transparent_1px),linear-gradient(to_bottom,var(--yorha-grid)_1px,transparent_1px)] [background-size:0.3rem_0.3rem]"
      />
    </div>
  );
}

export { Skeleton };
