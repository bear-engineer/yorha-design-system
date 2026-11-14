import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SortDirection = "none" | "ascending" | "descending";
export type DataTableDensity = "dense" | "comfortable";

/** Root: semantic table with a required caption. Zebra rows and density are CSS-driven via data attributes. */
export function DataTable({
  caption,
  density = "comfortable",
  zebra = true,
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"table"> & {
  caption: ReactNode;
  density?: DataTableDensity;
  zebra?: boolean;
}) {
  return (
    <div data-slot="data-table-wrapper" className="w-full overflow-x-auto">
      <table
        data-slot="data-table"
        data-density={density}
        data-zebra={zebra ? "true" : "false"}
        className={cn("group/table w-full border-collapse font-yorha text-yorha-sm text-yorha-fg", className)}
        {...props}
      >
        <caption className="mb-2 text-left font-yorha-bold text-yorha-base uppercase tracking-yorha-heading text-yorha-fg-strong">
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
        "group-data-[zebra=true]/table:[&>tr:nth-child(even)]:[background-image:repeating-linear-gradient(135deg,var(--yorha-grid)_0_1px,transparent_1px_6px)]",
        className,
      )}
      {...props}
    />
  );
}

export function DataTableRow({ className, ...props }: ComponentPropsWithoutRef<"tr">) {
  return <tr className={cn(className)} {...props} />;
}

/**
 * Header cell with scope="col". When `sortable`, the label is a button and `aria-sort` reflects `sortDirection`.
 * Each activation toggles ascending <-> descending (from "none" it goes ascending).
 */
export function DataTableHeadCell({
  sortable = false,
  sortDirection = "none",
  onSortChange,
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"th"> & {
  sortable?: boolean;
  sortDirection?: SortDirection;
  onSortChange?: (next: SortDirection) => void;
}) {
  const glyph = sortDirection === "ascending" ? "▲" : sortDirection === "descending" ? "▼" : "◇";
  return (
    <th
      scope="col"
      aria-sort={sortable ? sortDirection : undefined}
      className={cn(
        "px-3 py-2 text-left font-yorha-bold text-yorha-sm uppercase tracking-yorha-wide",
        className,
      )}
      {...props}
    >
      {sortable ? (
        <button
          type="button"
          onClick={() => onSortChange?.(sortDirection === "ascending" ? "descending" : "ascending")}
          className="inline-flex min-h-[24px] items-center gap-2 rounded-yorha font-inherit text-inherit focus-visible:yorha-focus"
        >
          {children}
          <span aria-hidden="true" className="text-yorha-alert-ui">
            {glyph}
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
        numeric ? "text-right tabular-nums" : "text-left",
        className,
      )}
      {...props}
    />
  );
}
