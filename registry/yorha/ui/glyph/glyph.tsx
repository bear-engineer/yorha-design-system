import type { SVGProps } from "react";
import { cn } from "@/lib/utils";
import { glyphPath, nativeBox, type GlyphName } from "./glyphs";
import type { GlyphBox } from "./glyph-core";

export { GLYPH_NAMES, glyphPath, type GlyphName } from "./glyphs";
export { rasterize, type GlyphBox, type GlyphSpec } from "./glyph-core";

export interface GlyphProps extends Omit<SVGProps<SVGSVGElement>, "width" | "height" | "viewBox" | "children" | "name"> {
  name: GlyphName;
  /** Box in CSS px. Default: the glyph's native box (12 unless noted). */
  box?: GlyphBox;
  /** Integer scale only: 1 or 2. */
  scale?: 1 | 2;
}

/**
 * Dot glyph: a bitmap drawn as merged integer rects (`shape-rendering: crispEdges`, `currentColor`), so it is
 * two-colour at every integer DPR. Always decorative: the accessible name belongs to the control around it.
 * Scale by whole numbers only (`scale`), never with a CSS transform.
 */
export function Glyph({ name, box, scale = 1, className, ...props }: GlyphProps) {
  const b = box ?? nativeBox(name);
  return (
    <svg
      data-slot="glyph"
      data-glyph={name}
      width={b * scale}
      height={b * scale}
      viewBox={`0 0 ${b} ${b}`}
      shapeRendering="crispEdges"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={cn("block shrink-0", className)}
      {...props}
    >
      <path d={glyphPath(name, b)} />
    </svg>
  );
}
