import { cn } from "@/lib/utils";
import { Children, cloneElement, isValidElement } from "react";
import type { CSSProperties, ComponentPropsWithoutRef, ReactElement, ReactNode } from "react";

export type BentoCols = 2 | 4 | 6 | 12;
export type BentoGap = 2 | 3 | 4 | 6;
/** Row height in spacing steps (scales with [data-density]). */
export type BentoRowHeight = "sm" | "md" | "lg";
export type BentoPreset = "dashboard" | "feature" | "profile";
export type BentoSize = "1x1" | "2x1" | "1x2" | "2x2" | "wide" | "tall";

export interface BentoOwnProps {
  /** Column count at the widest container tier. Below @md the grid is one column with auto rows. */
  cols?: BentoCols;
  gap?: BentoGap;
  rowHeight?: BentoRowHeight;
  /** Named grid-template-areas layout (4 columns from @3xl). Tiles pick their cell with `area`. */
  preset?: BentoPreset;
  /** Stagger tiles in on mount (yorha-stagger). */
  stagger?: boolean;
  children?: ReactNode;
  className?: string;
}

export type BentoProps = BentoOwnProps & Omit<ComponentPropsWithoutRef<"div">, keyof BentoOwnProps>;

// Container tiers: @md = 28rem (2 columns), @3xl = 48rem (full count), so 360px is one column.
// Full class names so Tailwind generates them. `--bento-span-N` is how many grid columns an N-unit tile covers.
const COLS: Record<BentoCols, string> = {
  2: "@md:grid-cols-2",
  4: "@md:grid-cols-2 @3xl:grid-cols-4",
  6: "@md:grid-cols-2 @3xl:grid-cols-6 @3xl:[--bento-span-1:2] @3xl:[--bento-span-2:4]",
  12: "@md:grid-cols-2 @3xl:grid-cols-12 @3xl:[--bento-span-1:3] @3xl:[--bento-span-2:6]",
};

const GAP: Record<BentoGap, string> = { 2: "gap-2", 3: "gap-3", 4: "gap-4", 6: "gap-6" };

const ROW: Record<BentoRowHeight, string> = {
  sm: "[--bento-row:calc(var(--spacing)*24)]",
  md: "[--bento-row:calc(var(--spacing)*32)]",
  lg: "[--bento-row:calc(var(--spacing)*48)]",
};

/** Areas are written row-major in DOM order, so the desktop layout never reorders tab order. */
export const BENTO_AREAS: Record<BentoPreset, string[]> = {
  dashboard: ["hero hero a b", "hero hero chart chart", "list list chart chart"],
  feature: ["main main side side", "main main one two"],
  profile: ["avatar bio bio bio", "avatar stats stats links"],
};

const areasValue = (preset: BentoPreset) => BENTO_AREAS[preset].map((row) => `"${row}"`).join(" ");

/**
 * Bento grid. The outer frame is the query container, so tiers follow the width the grid is given, not the viewport.
 * No `grid-auto-flow: dense`: DOM order is mobile order and tab order.
 */
export function Bento({ cols = 4, gap = 3, rowHeight = "md", preset, stagger = true, className, style, children, ...rest }: BentoProps) {
  let index = 0;
  const items = Children.map(children, (child) => {
    if (!isValidElement(child) || child.type !== BentoTile) return child;
    const tile = child as ReactElement<BentoTileProps>;
    const current = index++;
    return stagger && tile.props.index === undefined ? cloneElement(tile, { index: current }) : tile;
  });
  const vars = { ...(preset ? { "--bento-areas": areasValue(preset) } : {}), ...style } as CSSProperties;
  return (
    <div data-slot="bento-frame" className="@container w-full min-w-0">
      <div
        data-slot="bento"
        data-preset={preset}
        style={vars}
        className={cn(
          "grid grid-cols-1 [--bento-span-1:1] [--bento-span-2:2]",
          "@md:auto-rows-[minmax(var(--bento-row),auto)]",
          preset ? "@md:grid-cols-2 @3xl:grid-cols-4 @3xl:[grid-template-areas:var(--bento-areas)]" : COLS[cols],
          GAP[gap],
          ROW[rowHeight],
          className,
        )}
        {...rest}
      >
        {items}
      </div>
    </div>
  );
}

export interface BentoTileOwnProps {
  /** Footprint in base cells; ignored when `area` is set (the preset's area decides). */
  size?: BentoSize;
  /** Named area of the Bento `preset`. */
  area?: string;
  /** Stretched link covering the whole tile. The tile then holds this one interactive target: put no other links or buttons inside. */
  href?: string;
  /** Accessible text of the stretched link (required with href). */
  label?: string;
  /** Stagger position; Bento fills it in from DOM order. */
  index?: number;
  children?: ReactNode;
  className?: string;
}

export type BentoTileProps = BentoTileOwnProps & Omit<ComponentPropsWithoutRef<"div">, keyof BentoTileOwnProps>;

const SIZE: Record<BentoSize, string> = {
  "1x1": "@md:col-span-(--bento-span-1)",
  "2x1": "@md:col-span-(--bento-span-2)",
  wide: "@md:col-span-(--bento-span-2)",
  "1x2": "@md:col-span-(--bento-span-1) @md:row-span-2",
  tall: "@md:col-span-(--bento-span-1) @md:row-span-2",
  "2x2": "@md:col-span-(--bento-span-2) @md:row-span-2",
};

/**
 * One radius token (--yorha-radius) outside; the body's radius is that minus the tile padding (never below 0).
 * The tile is a query container of its own, so the body switches layout with the tile's width.
 */
export function BentoTile({ size = "1x1", area, href, label, index, className, style, children, ...rest }: BentoTileProps) {
  const vars = {
    ...(area ? { "--bento-area": area } : {}),
    ...(index !== undefined ? { "--yorha-stagger-index": index } : {}),
    ...style,
  } as CSSProperties;
  const interactive = href !== undefined;
  return (
    <div
      data-slot="bento-tile"
      data-area={area}
      style={vars}
      className={cn(
        "@container relative min-w-0 [--bento-pad:calc(var(--spacing)*4)] p-(--bento-pad)",
        "rounded-yorha border border-yorha-border bg-yorha-panel text-yorha-fg",
        index !== undefined && "yorha-stagger",
        area ? "@3xl:[grid-area:var(--bento-area)]" : SIZE[size],
        // Hover lift: translate only, travel scales with --motion-spatial (0 when reduced or off).
        interactive && "transition-[translate] duration-(--motion-popover) ease-yorha-decelerate hover:[translate:0_calc(var(--motion-spatial)*-0.25rem)]",
        className,
      )}
      {...rest}
    >
      <div
        data-slot="bento-tile-body"
        className="flex h-full min-w-0 flex-col gap-2 rounded-[max(0px,calc(var(--yorha-radius)-var(--bento-pad)))] @sm:flex-row @sm:items-start @sm:gap-4"
      >
        {interactive ? (
          <a href={href} className="font-yorha-bold text-yorha-fg-strong outline-none after:absolute after:inset-0 after:content-[''] focus-visible:yorha-focus">
            {label}
          </a>
        ) : null}
        {children}
      </div>
    </div>
  );
}
