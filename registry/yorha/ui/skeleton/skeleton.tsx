import { createContext, useContext, useEffect, useRef, type HTMLAttributes, type RefObject } from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** Makes this skeleton its own named status (prefer SkeletonGroup around several). */
  label?: string;
}

/**
 * Shimmer runs as a Web Animation (no keyframes in the kit CSS) for as long as the skeleton is mounted: a soft band
 * translates left to right, linear, one pass per SHIMMER_MS. No steps. reduced (data-motion, or no attribute with
 * reduced-motion preferred) = the band rests mid-block and pulses in opacity; off = it rests still (the static grid
 * plus aria-busy mark it as loading).
 */
const SHIMMER_MS = 1600;

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
      el.style.left = mode === "full" ? "0px" : "30%";
      anim =
        mode === "reduced"
          ? el.animate([{ opacity: 0.3 }, { opacity: 1 }, { opacity: 0.3 }], { duration: SHIMMER_MS * 1.5, iterations: Infinity, easing: "ease-in-out" })
          : el.animate([{ transform: "translateX(-100%)" }, { transform: "translateX(250%)" }], {
              duration: SHIMMER_MS,
              iterations: Infinity,
              easing: "linear",
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
 * Loading placeholder: static grid (`--yorha-grid-size` cells) under a soft linear shimmer band. By default it is
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
      className={cn(
        "relative overflow-hidden rounded-yorha bg-yorha-separator/35 bg-[linear-gradient(to_right,var(--yorha-grid)_1px,transparent_1px),linear-gradient(to_bottom,var(--yorha-grid)_1px,transparent_1px)] [background-size:var(--yorha-grid-size)_var(--yorha-grid-size)]",
        className,
      )}
      {...props}
    >
      <span
        ref={scanRef}
        aria-hidden="true"
        data-yorha-shimmer=""
        className="pointer-events-none absolute inset-y-0 left-0 w-[40%] bg-[linear-gradient(to_right,transparent,color-mix(in_oklab,var(--yorha-ink)_14%,transparent),transparent)]"
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
