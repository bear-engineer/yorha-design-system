import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Decorative curved-monitor edge darkening (inset shadow + radial falloff, colour --yorha-scrim).
 * `scanline` adds a static stripe pattern (no animation, so it is the same under reduced motion).
 * Hidden from AT, click-through, not focusable. Paints behind content (`z-(--yorha-z-decor)` = -1): the host must be `relative isolate`.
 */
export function Vignette({
  scanline = false,
  className,
  style,
  ...props
}: ComponentPropsWithoutRef<"div"> & { scanline?: boolean }) {
  const radial = "radial-gradient(ellipse at center, transparent 60%, var(--yorha-scrim) 100%)";
  const stripes = "repeating-linear-gradient(to bottom, transparent 0 3px, var(--yorha-grid) 3px 4px)";
  return (
    <div
      aria-hidden="true"
      data-slot="vignette"
      data-scanline={scanline ? "true" : undefined}
      className={cn("pointer-events-none absolute inset-0 z-(--yorha-z-decor)", className)}
      style={{
        boxShadow: "inset 0 0 6rem 1rem var(--yorha-scrim)",
        backgroundImage: scanline ? `${radial}, ${stripes}` : radial,
        ...style,
      }}
      {...props}
    />
  );
}
