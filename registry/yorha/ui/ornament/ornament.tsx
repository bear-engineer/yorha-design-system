import type { CSSProperties, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type OrnamentVariant = "band" | "separator";

export interface OrnamentProps extends HTMLAttributes<HTMLDivElement> {
  /** `band`: full-width rule with a centre dot. `separator`: short dashed rule. */
  variant?: OrnamentVariant;
}

export interface SeparatorProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
}

const LINE = "var(--yorha-line-deco)";

const STYLE: Record<OrnamentVariant, CSSProperties> = {
  // Box is 12px tall (fixed px, not rem). The rule sits on pixel row 6 (6px..7px) and the dot is drawn
  // in a 12px tile centred on the same row, so neither straddles two pixels at 1x.
  band: {
    backgroundImage: `linear-gradient(${LINE}, ${LINE}), radial-gradient(circle at 6px 6.5px, ${LINE} 2px, transparent 2.5px)`,
    backgroundSize: "100% 1px, 12px 12px",
    backgroundPosition: "0 6px, center 0",
    backgroundRepeat: "no-repeat",
  },
  separator: {
    backgroundImage: `repeating-linear-gradient(to right, ${LINE} 0 0.5rem, transparent 0.5rem 0.75rem)`,
    backgroundSize: "100% 1px",
    backgroundPosition: "0 6px",
    backgroundRepeat: "no-repeat",
  },
};

/** Decorative only: hidden from assistive tech and never receives pointer events. */
export function Ornament({ variant = "band", className, style, ...rest }: OrnamentProps) {
  return (
    <div
      {...rest}
      data-slot="ornament"
      aria-hidden="true"
      className={cn("pointer-events-none block h-[12px] w-full", className)}
      style={{ ...STYLE[variant], ...style }}
    />
  );
}

/** Meaningful divider between content groups. Exposed as role=separator. */
export function Separator({ orientation = "horizontal", className, ...rest }: SeparatorProps) {
  return (
    <div
      {...rest}
      role="separator"
      aria-orientation={orientation}
      className={cn(
        "bg-yorha-separator",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px self-stretch",
        className,
      )}
    />
  );
}
