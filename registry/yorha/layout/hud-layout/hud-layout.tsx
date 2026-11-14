import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type HudCorner = "top-start" | "top-end" | "bottom-start" | "bottom-end";

export interface HudLayoutProps {
  /** Accessible name of the whole HUD group. */
  label?: string;
  /** Hides the HUD from the screen and the accessibility tree. */
  hidden?: boolean;
  /** `fixed` covers the viewport (default); `absolute` fills the nearest positioned ancestor. */
  position?: "fixed" | "absolute";
  className?: string;
  children?: ReactNode;
}

export interface HudRegionProps {
  corner: HudCorner;
  /** Required: the region landmark's accessible name. */
  label: string;
  className?: string;
  children?: ReactNode;
}

const CORNER: Record<HudCorner, string> = {
  "top-start": "top-0 start-0 items-start",
  "top-end": "top-0 end-0 items-end text-end",
  "bottom-start": "bottom-0 start-0 items-start",
  "bottom-end": "bottom-0 end-0 items-end text-end",
};

/**
 * Overlay frame for in-game style status. It ignores the pointer so the content below stays usable;
 * interactive children inside a region opt back in.
 */
export function HudLayout({ label = "HUD", hidden = false, position = "fixed", className, children }: HudLayoutProps) {
  return (
    <div
      role="group"
      aria-label={label}
      hidden={hidden}
      data-slot="hud-layout"
      className={cn("pointer-events-none inset-0 z-(--yorha-z-overlay)", position, className)}
    >
      {children}
    </div>
  );
}

/** One corner of the HUD, a labelled region. Buttons and links inside receive pointer events. */
export function HudRegion({ corner, label, className, children }: HudRegionProps) {
  return (
    <section
      aria-label={label}
      data-slot="hud-region"
      data-corner={corner}
      className={cn(
        "pointer-events-none absolute flex max-w-[min(24rem,50%)] flex-col gap-2 p-4 font-yorha text-yorha-sm tracking-yorha-body text-yorha-fg",
        "[&_a]:pointer-events-auto [&_button]:pointer-events-auto [&_input]:pointer-events-auto",
        CORNER[corner],
        className,
      )}
    >
      {children}
    </section>
  );
}
