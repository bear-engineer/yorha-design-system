import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { SortIcon, TriangleIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export type SortDirection = "none" | "ascending" | "descending";
export type DataTableDensity = "dense" | "comfortable";

/** Root: semantic table with a required caption. Zebra rows and density are CSS-driven via data attributes. */
export function DataTable({
  caption,
  density = "comfortable",
  zebra = true,
  hideCaption = false,
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"table"> & {
  caption: ReactNode;
  density?: DataTableDensity;
  zebra?: boolean;
  /** Keep the caption as the table's accessible name but hide it visually (when a surrounding heading already names it). */
  hideCaption?: boolean;
}) {
  return (
    <div data-slot="data-table-wrapper" className="yorha-scroll yorha-scroll-cue-x w-full overflow-y-hidden">
      <table
        data-slot="data-table"
        data-density={density}
        data-zebra={zebra ? "true" : "false"}
        className={cn("group/table w-full border-collapse font-yorha text-yorha-sm text-yorha-fg", className)}
        {...props}
      >
        <caption className={hideCaption ? "sr-only" : "mb-2 text-left font-yorha-bold text-yorha-base uppercase tracking-yorha-heading text-yorha-fg-strong"}>
          {caption}
        </caption>
        {children}
      </table>
    </div>
  );
}

export function DataTableHeader({ className, ...props }: ComponentPropsWithoutRef<"thead">) {
  return <thead className={cn("bg-yorha-ink text-yorha-on-ink", className)} {...props} />;
}

/** Zebra: even rows get a hatch pattern (a shape cue), not only a colour change. Rows keep a thin rule. */
export function DataTableBody({ className, ...props }: ComponentPropsWithoutRef<"tbody">) {
  return (
    <tbody
      className={cn(
        "[&>tr]:border-b [&>tr]:border-yorha-border",
        "group-data-[zebra=true]/table:[&>tr:nth-child(even)]:[background-image:repeating-linear-gradient(135deg,var(--yorha-grid)_0_1px,transparent_1px_8px)]",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Body row. Hover tints (fine pointers); `aria-selected="true"` or `data-selected` inverts the row to ink. Colour only,
 * so a row never changes size.
 */
export function DataTableRow({ className, ...props }: ComponentPropsWithoutRef<"tr">) {
  return (
    <tr
      className={cn(
        "transition-colors duration-(--motion-select) ease-yorha-out",
        "[tbody>&]:yorha-tint [tbody>&]:aria-selected:bg-yorha-ink [tbody>&]:aria-selected:text-yorha-on-ink [tbody>&]:data-[selected]:bg-yorha-ink [tbody>&]:data-[selected]:text-yorha-on-ink",
        "[tbody>&[aria-selected=true]>td]:text-yorha-on-ink [tbody>&[data-selected]>td]:text-yorha-on-ink",
        className,
      )}
      {...props}
    />
  );
}

// Sort indicator layer: always mounted in a fixed cell; only opacity and rotate animate (reduced: opacity only).
const SORT_GLYPH =
  "col-start-1 row-start-1 opacity-0 transition-[opacity,rotate] [transition-duration:max(var(--motion-select),var(--motion-reduced-fade)),calc(var(--motion-select)*var(--motion-spatial))] ease-yorha";

/**
 * Header cell with scope="col". When `sortable`, the label is a button and `aria-sort` reflects `sortDirection`.
 * Each activation toggles ascending <-> descending (from "none" it goes ascending).
 */
export function DataTableHeadCell({
  sortable = false,
  sortDirection = "none",
  onSortChange,
  numeric = false,
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"th"> & {
  /** Right-aligns the header over a numeric column (pair with `<DataTableCell numeric>`); tabular figures. */
  numeric?: boolean;
  sortable?: boolean;
  sortDirection?: SortDirection;
  onSortChange?: (next: SortDirection) => void;
}) {
  return (
    <th
      scope="col"
      aria-sort={sortable ? sortDirection : undefined}
      className={cn(
        "px-3 py-2 font-yorha-bold text-yorha-sm uppercase tracking-yorha-wide",
        numeric ? "yorha-tabular text-right" : "text-left",
        className,
      )}
      {...props}
    >
      {sortable ? (
        <button
          type="button"
          data-sorted={sortDirection !== "none"}
          onClick={() => onSortChange?.(sortDirection === "ascending" ? "descending" : "ascending")}
          className={cn(
            "group/sortbtn inline-flex min-h-6 cursor-pointer items-center gap-2 rounded-yorha font-inherit text-inherit",
            "transition-[color,background-color,border-color] duration-(--motion-select) ease-yorha-out hover:bg-yorha-on-ink/10 focus-visible:yorha-focus-inset",
            numeric && "flex-row-reverse",
          )}
        >
          {children}
          <span
            aria-hidden="true"
            data-sort-indicator={sortDirection}
            className="group/sort grid size-3 shrink-0 place-items-center text-yorha-on-ink group-data-[sorted=true]/sortbtn:text-yorha-alert-on-ink"
          >
            {/* Fixed slot: the unsorted pair and the sorted triangle share one cell and cross-fade; the triangle flips by rotate. */}
            <SortIcon className={cn(SORT_GLYPH, "group-data-[sort-indicator=none]/sort:opacity-60")} />
            <TriangleIcon
              dir="up"
              className={cn(
                SORT_GLYPH,
                "group-data-[sort-indicator=ascending]/sort:opacity-100 group-data-[sort-indicator=descending]/sort:opacity-100 group-data-[sort-indicator=descending]/sort:rotate-180",
              )}
            />
          </span>
        </button>
      ) : (
        children
      )}
    </th>
  );
}

export function DataTableCell({ numeric = false, className, ...props }: ComponentPropsWithoutRef<"td"> & { numeric?: boolean }) {
  return (
    <td
      className={cn(
        "px-3 align-top text-yorha-fg",
        "group-data-[density=dense]/table:py-1 group-data-[density=comfortable]/table:py-3",
        numeric ? "yorha-tabular text-right" : "text-left",
        className,
      )}
      {...props}
    />
  );
}
