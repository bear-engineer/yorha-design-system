import { Glyph, type GlyphProps } from "@/components/ui/glyph";

/**
 * YoRHa icon set, v4: thin wrappers over `Glyph` (ui/glyph). The geometry is the same whole-pixel coordinates the
 * v3 stroke icons used, rasterised without anti-aliasing into merged integer rects (`crispEdges`, `currentColor`),
 * so every icon is two-colour at integer DPR. Names, props and sizes are unchanged; `strokeWidth`, `stroke` and
 * `solid` no longer exist (there is no stroke). Decorative (`aria-hidden`), `shrink-0`, no margin: the parent box
 * centres it with `grid place-items-center`. Enforced by icons.test.ts and stability-v4-pixel.test.tsx.
 */
export type IconProps = Omit<GlyphProps, "name" | "box" | "scale">;
export type Dir = "up" | "down" | "left" | "right";
export const ICON_SIZES = [12, 16, 20] as const;
export type IconSize = (typeof ICON_SIZES)[number];

export function ChevronIcon({ dir = "down", size = 12, ...props }: IconProps & { dir?: Dir; size?: 12 | 16 }) {
  return <Glyph name={`chevron-${dir}`} box={size} {...props} />;
}

export function CheckIcon(props: IconProps) {
  return <Glyph name="check" {...props} />;
}

export function CrossIcon(props: IconProps) {
  return <Glyph name="cross" {...props} />;
}

export function PlusIcon(props: IconProps) {
  return <Glyph name="plus" {...props} />;
}

export function MinusIcon(props: IconProps) {
  return <Glyph name="minus" {...props} />;
}

/** Solid 6x10 (10x6 for up/down) pointer in a 12 box. */
export function TriangleIcon({ dir = "right", ...props }: IconProps & { dir?: Dir }) {
  return <Glyph name={`triangle-${dir}`} {...props} />;
}

export function SortIcon(props: IconProps) {
  return <Glyph name="sort" {...props} />;
}

/** 2 columns x 3 rows of 2px dots. */
export function GripIcon(props: IconProps) {
  return <Glyph name="grip" {...props} />;
}

export function CalendarIcon(props: IconProps) {
  return <Glyph name="calendar" {...props} />;
}

export function ClockIcon(props: IconProps) {
  return <Glyph name="clock" {...props} />;
}

export function EyeIcon(props: IconProps) {
  return <Glyph name="eye" {...props} />;
}

export function EyeOffIcon(props: IconProps) {
  return <Glyph name="eye-off" {...props} />;
}

export function SearchIcon(props: IconProps) {
  return <Glyph name="search" {...props} />;
}
