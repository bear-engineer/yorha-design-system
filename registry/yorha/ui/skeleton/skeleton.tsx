import { createContext, useContext, useEffect, useRef, type HTMLAttributes, type RefObject } from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** Makes this skeleton its own named status (prefer SkeletonGroup around several). */
  label?: string;
}

/**
 * Shimmer runs as a Web Animation (no keyframes in the kit CSS) for as long as the skeleton is
 * mounted: one `--motion-loop` cycle per scan. full = the grid scans down in `--yorha-step-loop` hops
 * (16 steps); reduced is eased with --yorha-ease-emphasized; reduced (data-motion, or no attribute with reduced-motion preferred) = one
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
      const steps = css.getPropertyValue("--yorha-step-loop").trim() || "linear";
      anim =
        mode === "reduced"
          ? el.animate([{ opacity: 0.3 }, { opacity: 1 }, { opacity: 0.3 }], { duration: loop, iterations: Infinity, easing })
          : el.animate([{ transform: "translateY(-100%)" }, { transform: "translateY(100%)" }], {
              duration: loop,
              iterations: Infinity,
              easing: steps,
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

/**
 * Loading placeholder: faint grid scan (`--yorha-grid-size` cells, faded at both ends). By default it is
 * `role="presentation"`, so a loading screen with many skeletons announces nothing per block: wrap them in one
 * `SkeletonGroup label` (a single named status). A bare Skeleton with a `label` is its own status (v3 behaviour),
 * unless it sits inside a SkeletonGroup, where the label is ignored.
 */
const InGroup = createContext(false);

function Skeleton({ label, className, ...props }: SkeletonProps) {
  const scanRef = useRef<HTMLSpanElement>(null);
  useScan(scanRef);
  const grouped = useContext(InGroup);
  const named = label !== undefined && !grouped;
  return (
    <div
      data-slot="skeleton"
      role={named ? "status" : "presentation"}
      aria-label={named ? label : undefined}
      aria-busy={named ? "true" : undefined}
      className={cn("relative overflow-hidden rounded-yorha bg-yorha-separator/35", className)}
      {...props}
    >
      <span
        ref={scanRef}
        aria-hidden="true"
        data-yorha-shimmer=""
        className="pointer-events-none absolute inset-x-0 -top-full bottom-0 bg-[linear-gradient(to_right,var(--yorha-grid)_1px,transparent_1px),linear-gradient(to_bottom,var(--yorha-grid)_1px,transparent_1px)] [background-size:var(--yorha-grid-size)_var(--yorha-grid-size)] [mask-image:linear-gradient(transparent,#000_30%,#000_70%,transparent)]"
      />
    </div>
  );
}

export interface SkeletonGroupProps extends HTMLAttributes<HTMLDivElement> {
  /** Accessible name announced once for the whole loading region. */
  label?: string;
}

/** One named `role=status` live region for any number of Skeletons. */
function SkeletonGroup({ label = "로딩 중", className, children, ...props }: SkeletonGroupProps) {
  return (
    <div data-slot="skeleton-group" role="status" aria-label={label} aria-busy="true" className={className} {...props}>
      <InGroup.Provider value>{children}</InGroup.Provider>
    </div>
  );
}

export { Skeleton, SkeletonGroup };
