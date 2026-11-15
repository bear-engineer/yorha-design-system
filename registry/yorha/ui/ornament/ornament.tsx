import type { CSSProperties, HTMLAttributes } from "react";
import { Glyph } from "@/components/ui/glyph";
import { cn } from "@/lib/utils";

export type OrnamentVariant = "band" | "separator" | "dot-rule";

export interface OrnamentProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * `band`: full-width rule with a centre diamond. `separator`: short dashed rule.
   * `dot-rule`: 2 px dotted rule between two end diamonds.
   */
  variant?: OrnamentVariant;
}

const LINE = "var(--yorha-line-deco)";

// Box is 12px tall (fixed px, not rem). Rules sit on whole pixel rows around the glyph's centre line (rows 5-6), and
// every diamond is a `diamond` glyph (integer rects), so nothing is rotated or anti-aliased.
const DASHED: CSSProperties = {
  backgroundImage: `repeating-linear-gradient(to right, ${LINE} 0 8px, transparent 8px 12px)`,
  backgroundSize: "100% 1px",
  backgroundPosition: "0 6px",
  backgroundRepeat: "no-repeat",
};
const DOTTED: CSSProperties = {
  backgroundImage: `repeating-linear-gradient(to right, ${LINE} 0 2px, transparent 2px 4px)`,
  backgroundSize: "100% 2px",
  backgroundPosition: "0 5px",
  backgroundRepeat: "no-repeat",
};
const RULE = "mt-[6px] h-px bg-(--yorha-line-deco)";
const MARK = "[color:var(--yorha-line-deco)]";

/** Decorative only: hidden from assistive tech and never receives pointer events. */
export function Ornament({ variant = "band", className, style, ...rest }: OrnamentProps) {
  return (
    <div
      {...rest}
      data-slot="ornament"
      data-variant={variant}
      aria-hidden="true"
      className={cn("pointer-events-none block h-[12px] w-full", variant !== "separator" && "flex", className)}
      style={{ ...(variant === "separator" ? DASHED : null), ...style }}
    >
      {variant === "band" ? (
        <>
          {/* half of the free width, rounded down so the glyph lands on a whole pixel */}
          <span className={cn("flex-none", RULE)} style={{ width: "round(down, calc((100% - 20px) / 2), 1px)" }} />
          <Glyph name="diamond" className={cn("mx-[4px]", MARK)} />
          <span className={cn("flex-1", RULE)} />
        </>
      ) : null}
      {variant === "dot-rule" ? (
        <>
          <Glyph name="diamond" className={MARK} />
          <span className="mx-[4px] mt-[5px] h-[2px] flex-1" style={DOTTED} />
          <Glyph name="diamond" className={MARK} />
        </>
      ) : null}
    </div>
  );
}
