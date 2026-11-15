import { cn } from "@/lib/utils";
import { Glyph, type GlyphName } from "@/components/ui/glyph";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { Children, cloneElement, isValidElement } from "react";
import type { CSSProperties, ComponentPropsWithoutRef, ReactElement, ReactNode } from "react";

export type BentoCols = 2 | 4 | 6 | 12;
export type BentoGap = 2 | 3 | 4 | 6;
/** Row height in 4px spacing steps (fixed in every density). */
export type BentoRowHeight = "sm" | "md" | "lg";
export type BentoPreset = "dashboard" | "feature" | "profile";
export type BentoTileState = "ready" | "loading" | "error";
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
  /** Title row text. Setting any of title/glyph/meta/footer/state switches the tile to the structured anatomy: title row, body, optional footer rule. With `href` the title is the stretched link (`label` overrides its text). */
  title?: ReactNode;
  /** Dot glyph at the start of the title row. */
  glyph?: GlyphName;
  /** Right-aligned note in the title row (unit, range, count). */
  meta?: ReactNode;
  /** Pinned to the bottom of the tile behind a 1px rule. */
  footer?: ReactNode;
  /** `loading` replaces the body with one status region of skeletons; `error` shows `errorText` as an alert. */
  state?: BentoTileState;
  loadingLabel?: string;
  errorText?: string;
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
 * The tile is a query container of its own. Plain tiles (children only) switch body layout with the tile's width;
 * structured tiles (title/glyph/meta/footer/state) are always a column: title row, content, footer.
 * Link tiles change only colour and an inset second frame line on hover (the box never moves), the focus ring is the
 * tile's own outline, drawn in the gap.
 */
export function BentoTile({ size = "1x1", area, href, label, index, title, glyph, meta, footer, state = "ready", loadingLabel = "불러오는 중", errorText = "불러오지 못했습니다", className, style, children, ...rest }: BentoTileProps) {
  const vars = {
    ...(area ? { "--bento-area": area } : {}),
    ...(index !== undefined ? { "--yorha-stagger-index": index } : {}),
    ...style,
  } as CSSProperties;
  const structured = title !== undefined || glyph !== undefined || meta !== undefined || footer !== undefined || state !== "ready";
  const interactive = href !== undefined && state === "ready";
  const linkClass = "outline-none after:absolute after:inset-0 after:content-['']";
  return (
    <div
      data-slot="bento-tile"
      data-area={area}
      data-size={area ? undefined : size}
      data-state={structured ? state : undefined}
      style={vars}
      className={cn(
        "@container group relative min-w-0 [--bento-pad:calc(var(--spacing)*4)] p-(--bento-pad)",
        "rounded-yorha border border-yorha-border bg-yorha-panel text-yorha-fg",
        state === "error" && "border-yorha-alert-ui",
        index !== undefined && "yorha-stagger",
        area ? "@3xl:[grid-area:var(--bento-area)]" : SIZE[size],
        // Hover changes colour only: the border goes to ink and an inset line doubles it (box-shadow draws no layout).
        interactive &&
          "transition-[color,background-color,border-color,box-shadow] duration-(--motion-select) ease-yorha-out hover:border-yorha-ink hover:shadow-[inset_0_0_0_1px_var(--yorha-ink)] has-[a:focus-visible]:yorha-focus",
        className,
      )}
      {...rest}
    >
      {structured ? (
        <div data-slot="bento-tile-body" className="flex h-full min-w-0 flex-col gap-3 rounded-[max(0px,calc(var(--yorha-radius)-var(--bento-pad)))]">
          <div data-slot="bento-tile-header" className="flex min-h-6 items-center gap-2">
            {glyph ? <Glyph data-slot="bento-tile-glyph" name={glyph} className="text-yorha-fg-soft" /> : null}
            <span data-slot="bento-tile-title" className="min-w-0 flex-1 truncate font-yorha-bold text-yorha-sm uppercase tracking-yorha-wide text-yorha-fg-strong">
              {interactive ? (
                <a href={href} className={linkClass}>
                  {label ?? title}
                </a>
              ) : (
                title
              )}
            </span>
            {meta !== undefined ? (
              <span data-slot="bento-tile-meta" className="shrink-0 yorha-tabular text-yorha-xs text-yorha-fg-soft">
                {meta}
              </span>
            ) : null}
            {interactive ? <Glyph data-slot="bento-tile-go" name="triangle-right" className="text-yorha-fg-soft opacity-60 transition-opacity duration-(--motion-select) ease-yorha-out group-hover:opacity-100" /> : null}
          </div>
          <div data-slot="bento-tile-content" className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
            {state === "loading" ? (
              <SkeletonGroup label={loadingLabel} className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="min-h-6 w-full flex-1" />
              </SkeletonGroup>
            ) : state === "error" ? (
              <p role="alert" className="m-0 flex items-start gap-2 text-yorha-sm text-yorha-alert">
                <Glyph name="alert" className="mt-[2px]" />
                <span>{errorText}</span>
              </p>
            ) : (
              children
            )}
          </div>
          {footer !== undefined && state === "ready" ? (
            <div data-slot="bento-tile-footer" className="mt-auto border-t border-yorha-separator pt-3 text-yorha-xs text-yorha-fg-soft">
              {footer}
            </div>
          ) : null}
        </div>
      ) : (
        <div
          data-slot="bento-tile-body"
          className="flex h-full min-w-0 flex-col gap-2 rounded-[max(0px,calc(var(--yorha-radius)-var(--bento-pad)))] @sm:flex-row @sm:items-start @sm:gap-4"
        >
          {interactive ? (
            <a href={href} className={cn(linkClass, "font-yorha-bold text-yorha-fg-strong")}>
              {label}
            </a>
          ) : null}
          {children}
        </div>
      )}
    </div>
  );
}
