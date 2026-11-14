import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Decorative faint grid (cell size = --yorha-grid-size, line colour = --yorha-grid).
 * Hidden from AT, click-through, not focusable. Place inside a `relative` parent.
 */
export function GridBackground({ className, style, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      aria-hidden="true"
      data-slot="grid-background"
      className={cn("pointer-events-none absolute inset-0 z-(--yorha-z-decor) opacity-40", className)}
      style={{
        backgroundImage:
          "linear-gradient(to right, var(--yorha-grid) 1px, transparent 1px), linear-gradient(to bottom, var(--yorha-grid) 1px, transparent 1px)",
        backgroundSize: "var(--yorha-grid-size) var(--yorha-grid-size)",
        ...style,
      }}
      {...props}
    />
  );
}
