import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { SortIcon, TriangleIcon } from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type SortDirection = "none" | "ascending" | "descending";
export type DataTableDensity = "dense" | "comfortable";

const SORT_WORDS: Record<SortDirection, string> = { ascending: "오름차순 정렬", descending: "내림차순 정렬", none: "정렬 해제" };
const defaultSortStatus = (column: string, direction: SortDirection) => `${column}: ${SORT_WORDS[direction]}`;

interface TableContext {
  announce: (message: string) => void;
  sortStatus: (column: string, direction: SortDirection) => string;
}
const Ctx = createContext<TableContext>({ announce: () => {}, sortStatus: defaultSortStatus });

/**
 * Root: semantic table with a required caption. Zebra rows and density are CSS-driven via data attributes.
 * The scroll wrapper becomes a labelled, focusable `role=region` only while the table overflows it (keyboard users can
 * scroll it, and no extra tab stop appears when everything fits). A visually hidden polite status announces sorting and loading.
 */
export function DataTable({
  caption,
  density = "comfortable",
  zebra = true,
  hideCaption = false,
  stickyHeader = false,
  resizable = false,
  sortStatus = defaultSortStatus,
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"table"> & {
  caption: ReactNode;
  density?: DataTableDensity;
  zebra?: boolean;
  /** Keep the caption as the table's accessible name but hide it visually (when a surrounding heading already names it). */
  hideCaption?: boolean;
  /** Pins the header row while the body scrolls: the wrapper gets a max height (`--yorha-table-max-height`, default 24rem). */
  stickyHeader?: boolean;
  /** Fixed table layout so widths on `<DataTableCol>` are honoured (pair with `DataTableHeadCell resizable`). */
  resizable?: boolean;
  /** Text of the sort announcement; default Korean "열: 오름차순 정렬". */
  sortStatus?: (column: string, direction: SortDirection) => string;
}) {
  const captionId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  const [message, setMessage] = useState("");

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    const table = tableRef.current;
    if (!wrapper || !table) return;
    const measure = () => setOverflowing(wrapper.scrollWidth > wrapper.clientWidth || wrapper.scrollHeight > wrapper.clientHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(wrapper);
    observer.observe(table);
    return () => observer.disconnect();
  }, []);

  const announce = useCallback((next: string) => setMessage(next), []);

  return (
    <Ctx.Provider value={{ announce, sortStatus }}>
      <div
        ref={wrapperRef}
        data-slot="data-table-wrapper"
        role={overflowing ? "region" : undefined}
        tabIndex={overflowing ? 0 : undefined}
        aria-labelledby={overflowing ? captionId : undefined}
        className={cn(
          "yorha-scroll yorha-scroll-cue-x w-full focus-visible:yorha-focus-inset",
          stickyHeader ? "max-h-(--yorha-table-max-height,24rem) overflow-y-auto [&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:z-10" : "overflow-y-hidden",
        )}
      >
        <table
          ref={tableRef}
          data-slot="data-table"
          data-density={density}
          data-zebra={zebra ? "true" : "false"}
          className={cn("group/table w-full border-collapse font-yorha text-yorha-sm text-yorha-fg", resizable && "table-fixed", className)}
          {...props}
        >
          <caption
            id={captionId}
            className={hideCaption ? "sr-only" : "mb-2 text-left font-yorha-bold text-yorha-base uppercase tracking-yorha-heading text-yorha-fg-strong"}
          >
            {caption}
          </caption>
          {children}
        </table>
      </div>
      <div data-slot="data-table-status" role="status" aria-live="polite" className="sr-only">
        {message}
      </div>
    </Ctx.Provider>
  );
}

/** Column group for resizable tables: one `<DataTableCol style={{ width }}>` per column, in order. */
export function DataTableColgroup(props: ComponentPropsWithoutRef<"colgroup">) {
  return <colgroup {...props} />;
}

export function DataTableCol(props: ComponentPropsWithoutRef<"col">) {
  return <col {...props} />;
}

export function DataTableHeader({ className, ...props }: ComponentPropsWithoutRef<"thead">) {
  return <thead className={cn("bg-yorha-ink text-yorha-on-ink", className)} {...props} />;
}

// Stagger index per row (capped at --motion-stagger-max by the utility); rows past the 6th share the last step.
const STAGGER = [1, 2, 3, 4, 5]
  .map((n) => `[&>tr:nth-child(${n + 1})]:[--yorha-stagger-index:${n}]`)
  .concat("[&>tr:nth-child(n+7)]:[--yorha-stagger-index:6]")
  .join(" ");
// Per-cell stream: a clip-path reveal on the cells, so a row never changes size (clip-path on <tr> is not relied on).
const STREAM = `[&>tr>td]:yorha-stream [&>tr>th]:yorha-stream ${STAGGER}`;

/**
 * Zebra: even rows get a hatch pattern (a shape cue), not only a colour change (selected rows stay solid ink). Rows keep a thin rule.
 * `stream` (default on) reveals the rows in a stepped stagger on first render; change `streamKey` (page number, query)
 * to replay it for new data (the body remounts). `loading` swaps the rows for skeleton rows of the loaded row height.
 */
export function DataTableBody({
  stream = true,
  streamKey,
  loading = false,
  loadingRows = 5,
  loadingColumns = 3,
  loadingSelect = false,
  loadingLabel = "불러오는 중",
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"tbody"> & {
  stream?: boolean;
  streamKey?: string | number;
  loading?: boolean;
  loadingRows?: number;
  /** Data columns of the skeleton rows. */
  loadingColumns?: number;
  /** Adds a 24 px skeleton first column matching `DataTableSelectCell`. */
  loadingSelect?: boolean;
  loadingLabel?: string;
}) {
  const { announce } = useContext(Ctx);
  useEffect(() => {
    if (!loading) return;
    announce(loadingLabel);
    return () => announce("");
  }, [loading, loadingLabel, announce]);

  return (
    <tbody
      key={streamKey}
      aria-busy={loading ? "true" : undefined}
      className={cn(
        "[&>tr]:border-b [&>tr]:border-yorha-border",
        "group-data-[zebra=true]/table:[&>tr:nth-child(even):not([data-selected])]:[background-image:repeating-linear-gradient(135deg,var(--yorha-grid)_0_1px,transparent_1px_8px)]",
        stream && !loading && STREAM,
        className,
      )}
      {...props}
    >
      {loading
        ? Array.from({ length: loadingRows }, (_, row) => (
            <tr key={row} data-loading="">
              {loadingSelect ? (
                <td className="w-12 px-3 align-top group-data-[density=dense]/table:py-1 group-data-[density=comfortable]/table:py-3">
                  <Skeleton className="size-6" />
                </td>
              ) : null}
              {Array.from({ length: loadingColumns }, (_, col) => (
                <td key={col} className="px-3 align-top group-data-[density=dense]/table:py-1 group-data-[density=comfortable]/table:py-3">
                  <Skeleton className="h-[1lh] w-full" />
                </td>
              ))}
            </tr>
          ))
        : children}
    </tbody>
  );
}

/** Message row spanning the table (`colSpan` = column count, including a select column). */
export function DataTableEmpty({ colSpan, className, children, ...props }: Omit<ComponentPropsWithoutRef<"td">, "colSpan"> & { colSpan: number }) {
  return (
    <tr data-slot="data-table-empty">
      <td
        colSpan={colSpan}
        className={cn("px-3 text-center text-yorha-fg-soft group-data-[density=dense]/table:py-3 group-data-[density=comfortable]/table:py-6", className)}
        {...props}
      >
        {children}
      </td>
    </tr>
  );
}

/**
 * Body row. Hover tints (fine pointers); `data-selected` inverts the row to ink. Colour only, so a row never changes
 * size. (No `aria-selected`: it is invalid on a row outside a grid; name the selection with the row's checkbox.)
 */
export function DataTableRow({ className, ...props }: ComponentPropsWithoutRef<"tr">) {
  return (
    <tr
      className={cn(
        "transition-colors duration-(--motion-select) ease-yorha-out",
        "[tbody>&]:yorha-tint [tbody>&]:data-[selected]:bg-yorha-ink [tbody>&]:data-[selected]:text-yorha-on-ink",
        "[tbody>&[data-selected]>td]:text-yorha-on-ink [tbody>&[data-selected]>th]:text-yorha-on-ink",
        className,
      )}
      {...props}
    />
  );
}

// Sort indicator layer: always mounted in a fixed cell; only opacity and rotate animate (reduced: opacity only).
const SORT_GLYPH =
  "col-start-1 row-start-1 opacity-0 transition-[opacity,rotate] [transition-duration:max(var(--motion-select),var(--motion-reduced-fade)),calc(var(--motion-select)*var(--motion-spatial))] ease-yorha";

const nextDirection = (current: SortDirection, three: boolean): SortDirection =>
  current === "none" ? "ascending" : current === "ascending" ? "descending" : three ? "none" : "ascending";

/**
 * Header cell with scope="col". When `sortable`, the label is a button and `aria-sort` reflects `sortDirection`.
 * Each activation cycles none -> ascending -> descending (-> none with `sortCycle="three"`, else back to ascending); the
 * change is announced in the table's status. The sorted header carries a static 2 px under-rule (a shape cue).
 * `resizable` adds a window-splitter on the right edge that writes the width to the column's `<col>`.
 */
export function DataTableHeadCell({
  sortable = false,
  sortDirection = "none",
  sortCycle = "two",
  onSortChange,
  numeric = false,
  resizable = false,
  minWidth = 48,
  maxWidth = 640,
  onResize,
  resizeLabel = "열 너비",
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"th"> & {
  /** Right-aligns the header over a numeric column (pair with `<DataTableCell numeric>`); tabular figures. */
  numeric?: boolean;
  sortable?: boolean;
  sortDirection?: SortDirection;
  /** `two`: ascending <-> descending. `three`: the third activation clears the sort. */
  sortCycle?: "two" | "three";
  onSortChange?: (next: SortDirection) => void;
  resizable?: boolean;
  minWidth?: number;
  maxWidth?: number;
  onResize?: (width: number) => void;
  resizeLabel?: string;
}) {
  const ref = useRef<HTMLTableCellElement>(null);
  const { announce, sortStatus } = useContext(Ctx);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const th = ref.current;
    if (!th || !resizable) return;
    const measure = () => setWidth(Math.round(th.getBoundingClientRect().width));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(th);
    return () => observer.disconnect();
  }, [resizable]);

  const commit = (next: number) => {
    const th = ref.current;
    if (!th) return;
    const w = Math.round(Math.min(maxWidth, Math.max(minWidth, next)));
    const col = th.closest("table")?.querySelectorAll<HTMLElement>(":scope > colgroup > col")[th.cellIndex];
    if (col) col.style.width = `${w}px`;
    setWidth(w);
    onResize?.(w);
  };

  const onKeyDown = (event: ReactKeyboardEvent) => {
    const step = event.shiftKey ? 32 : 8;
    const current = Math.round(ref.current!.getBoundingClientRect().width);
    const handled = { ArrowRight: current + step, ArrowLeft: current - step, Home: minWidth, End: maxWidth }[event.key];
    if (handled === undefined) return;
    event.preventDefault();
    commit(handled);
  };

  const drag = useRef<{ x: number; width: number } | null>(null);
  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, width: ref.current!.getBoundingClientRect().width };
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (drag.current) commit(drag.current.width + event.clientX - drag.current.x);
  };

  return (
    <th
      ref={ref}
      scope="col"
      aria-sort={sortable ? sortDirection : undefined}
      className={cn(
        "px-3 py-2 font-yorha-bold text-yorha-sm uppercase tracking-yorha-wide",
        (sortable || resizable) && "relative",
        "aria-[sort=ascending]:shadow-[inset_0_-2px_0_var(--yorha-alert-on-ink)] aria-[sort=descending]:shadow-[inset_0_-2px_0_var(--yorha-alert-on-ink)]",
        numeric ? "yorha-tabular text-right" : "text-left",
        className,
      )}
      {...props}
    >
      {sortable ? (
        <button
          type="button"
          data-sorted={sortDirection !== "none"}
          onClick={() => {
            const next = nextDirection(sortDirection, sortCycle === "three");
            onSortChange?.(next);
            announce(sortStatus(ref.current?.textContent?.trim() ?? "", next));
          }}
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
      {resizable ? (
        <span
          role="separator"
          tabIndex={0}
          aria-orientation="vertical"
          aria-label={resizeLabel}
          aria-valuenow={width}
          aria-valuemin={minWidth}
          aria-valuemax={maxWidth}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
          className={cn(
            "absolute inset-y-0 -right-3 z-10 w-6 cursor-col-resize touch-none outline-none",
            "after:absolute after:inset-y-1 after:left-[11px] after:w-0.5 after:bg-yorha-on-ink/40 after:content-['']",
            "hover:after:bg-yorha-on-ink focus-visible:after:bg-yorha-alert-on-ink focus-visible:yorha-focus-inset",
          )}
        />
      ) : null}
    </th>
  );
}

const CELL_PAD = "group-data-[density=dense]/table:py-1 group-data-[density=comfortable]/table:py-3";

/** Body cell. `truncate` clips to one line with an ellipsis (max width `--yorha-cell-max`, default 16rem); a string child becomes the `title`. */
export function DataTableCell({
  numeric = false,
  truncate = false,
  className,
  children,
  title,
  ...props
}: ComponentPropsWithoutRef<"td"> & { numeric?: boolean; truncate?: boolean }) {
  return (
    <td
      title={title ?? (truncate && typeof children === "string" ? children : undefined)}
      className={cn(
        "px-3 align-top text-yorha-fg",
        CELL_PAD,
        numeric ? "yorha-tabular text-right" : "text-left",
        truncate && "max-w-(--yorha-cell-max,16rem) overflow-hidden text-ellipsis whitespace-nowrap",
        className,
      )}
      {...props}
    >
      {children}
    </td>
  );
}

/** Row header cell (`<th scope="row">`): the cell that names the row for screen-reader table navigation. */
export function DataTableRowHeader({ numeric = false, className, ...props }: ComponentPropsWithoutRef<"th"> & { numeric?: boolean }) {
  return (
    <th
      scope="row"
      className={cn("px-3 align-top font-yorha-bold text-yorha-fg-strong", CELL_PAD, numeric ? "yorha-tabular text-right" : "text-left", className)}
      {...props}
    />
  );
}

interface SelectProps {
  /** Accessible name (visually hidden), e.g. "Select Alpha". */
  label: string;
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

/** Fixed 48 px first column holding a kit Checkbox. Host-controlled: mirror `checked` on the row as `data-selected`. */
export function DataTableSelectCell({ label, checked, onCheckedChange, disabled, className }: SelectProps) {
  return (
    // The kit Checkbox row is one text line tall; pin it to the 24 px box so the row height is the same loading and loaded.
    <td className={cn("w-12 px-3 align-top [&>label>span:first-child]:h-6 [tr[data-selected]>&]:bg-yorha-bg [tr[data-selected]>&]:text-yorha-fg", CELL_PAD, className)}>
      <Checkbox checked={checked} disabled={disabled} onCheckedChange={(next) => onCheckedChange?.(next)}>
        <span className="sr-only">{label}</span>
      </Checkbox>
    </td>
  );
}

/** Header select-all box: `indeterminate` when some rows are selected. Sits on a light surface so the box keeps its contrast on the ink header. */
export function DataTableSelectAll({ label, checked, indeterminate = false, onCheckedChange, disabled, className }: SelectProps & { indeterminate?: boolean }) {
  return (
    <th scope="col" className={cn("w-12 bg-yorha-bg px-3 py-2 text-yorha-fg", className)}>
      <Checkbox checked={checked} indeterminate={indeterminate} disabled={disabled} onCheckedChange={(next) => onCheckedChange?.(next)}>
        <span className="sr-only">{label}</span>
      </Checkbox>
    </th>
  );
}
