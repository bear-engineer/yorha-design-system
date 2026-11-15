import { createContext, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { ChevronIcon, CrossIcon, TriangleIcon } from "@/components/ui/icons";
import { Glyph } from "@/components/ui/glyph";
import { Spinner } from "@/components/ui/spinner";
import { cnState } from "@/lib/utils";

const INPUT_MIN = 48; // typing area kept beside the chips (min-w-12)
const MORE_W = 36; // room reserved for the "+N" chip

type CreateSpec = { onCreate: (text: string) => void; label?: ReactNode | ((text: string) => ReactNode) };
type Ctx = {
  loading: boolean;
  text: string;
  open: boolean;
  requestOpen: () => void;
  requestClose: () => void;
  /** Latest props of the mounted ComboboxCreate; the root appends one create token to flat `items` while it applies. */
  create: { current: CreateSpec | null };
  setCreateActive: (active: boolean) => void;
};
const ComboboxContext = createContext<Ctx>({
  loading: false,
  text: "",
  open: false,
  requestOpen: () => {},
  requestClose: () => {},
  create: { current: null },
  setCreateActive: () => {},
});

/** A `ComboboxCreate` row is a selectable item whose value is this token; the root turns picking it into `onCreate(text)`. */
type CreateToken = { __yorhaCreate: true; value: string; label: string; onCreate: (text: string) => void };
const isCreateToken = (v: unknown): v is CreateToken => typeof v === "object" && v !== null && "__yorhaCreate" in v;

type RootProps<Value, Multiple extends boolean | undefined> = ComboboxPrimitive.Root.Props<Value, Multiple> & {
  /**
   * Async search in flight: a Spinner replaces the chevron in the trigger cell (same box, the field never resizes), the
   * list keeps its previous rows at 60 % opacity with `aria-busy`, and `ComboboxStatus` reads "불러오는 중" unless it has its own text.
   */
  loading?: boolean;
};

/**
 * Root: Base UI Combobox root (items, value, onValueChange, multiple, ...) plus `loading`. It owns `open` (unless you pass
 * it) so the `+N` chip and `ComboboxCreate` can open / close the popup.
 */
function Combobox<Value, Multiple extends boolean | undefined = false>({
  loading = false,
  onInputValueChange,
  onValueChange,
  onOpenChange,
  open: openProp,
  defaultOpen = false,
  ...props
}: RootProps<Value, Multiple>) {
  const [text, setText] = useState<string>(String(props.inputValue ?? props.defaultInputValue ?? ""));
  const [openState, setOpenState] = useState(defaultOpen);
  const open = openProp ?? openState;
  const createSpec = useRef<CreateSpec | null>(null);
  const [createActive, setCreateActive] = useState(false);
  const changeOpen = (next: boolean, details?: never) => {
    if (openProp === undefined) setOpenState(next);
    (onOpenChange as ((o: boolean, d?: never) => void) | undefined)?.(next, details);
  };
  const ctx = useMemo<Ctx>(
    () => ({
      loading,
      text: props.inputValue === undefined ? text : String(props.inputValue),
      open,
      requestOpen: () => changeOpen(true),
      requestClose: () => changeOpen(false),
      create: createSpec,
      setCreateActive,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loading, props.inputValue, text, open],
  );
  // One create option rides at the end of a flat `items` array, so the list's own keyboard model reaches it.
  const trimmed = ctx.text.trim();
  const items = props.items as readonly unknown[] | undefined;
  const flat = Array.isArray(items) && !items.some((i) => typeof i === "object" && i !== null && "items" in i);
  const withCreate =
    createActive && trimmed && flat
      ? [...(items as unknown[]), { __yorhaCreate: true, value: trimmed, label: trimmed, onCreate: (t: string) => createSpec.current?.onCreate(t) } satisfies CreateToken]
      : items;
  return (
    <ComboboxContext value={ctx}>
      <ComboboxPrimitive.Root
        {...(props as object)}
        items={withCreate as never}
        open={open}
        onOpenChange={changeOpen as never}
        onInputValueChange={((v: string, d: never) => {
          setText(v);
          (onInputValueChange as ((v: string, d: never) => void) | undefined)?.(v, d);
        }) as never}
        onValueChange={((v: unknown, d: never) => {
          const token = Array.isArray(v) ? v.find(isCreateToken) : v;
          if (isCreateToken(token)) return token.onCreate(token.value);
          (onValueChange as ((v: unknown, d: never) => void) | undefined)?.(v, d);
        }) as never}
      />
    </ComboboxContext>
  );
}

/** Filter hook from Base UI (locale-aware contains/startsWith/endsWith matchers). */
const useComboboxFilter = ComboboxPrimitive.useFilter;

/** Bordered, square field shell that holds the input and its Clear / Trigger buttons. */
function ComboboxInputGroup({ className, ...props }: ComponentProps<typeof ComboboxPrimitive.InputGroup>) {
  return (
    <ComboboxPrimitive.InputGroup
      data-slot="combobox-input-group"
      className={cnState(
        [
          "relative flex min-h-control-md w-full min-w-40 items-stretch rounded-yorha border border-yorha-border bg-yorha-bg font-yorha text-yorha-base text-yorha-fg",
          // One ring on the frame; an open popup adds no second darkened border (G6 b).
          "focus-within:yorha-focus",
          "data-[invalid]:border-(length:--yorha-border-width-strong) data-[invalid]:border-yorha-alert-ui",
          "yorha-disabled data-[disabled]:border-yorha-disabled",
        ],
        className,
      )}
      {...props}
    />
  );
}

/**
 * Text input (the search field; the selected value is shown by the input in single mode, by chips in multiple mode). Enter / Backspace that belong to an IME composition (isComposing or the
 * legacy keyCode 229) never reach Base UI, so confirming a Hangul syllable cannot commit a row.
 */
function ComboboxInput({ className, onKeyDown, ...props }: ComponentProps<typeof ComboboxPrimitive.Input>) {
  return (
    <ComboboxPrimitive.Input
      data-slot="combobox-input"
      className={cnState(
        [
          "min-w-0 flex-1 self-stretch rounded-none border-0 bg-transparent px-pad-md py-0 font-yorha text-yorha-base tracking-yorha-body text-yorha-fg",
          "placeholder:text-yorha-fg-soft focus-visible:outline-none disabled:cursor-not-allowed",
        ],
        className,
      )}
      onKeyDown={(event) => {
        const native = event.nativeEvent as KeyboardEvent;
        if (native.isComposing || native.keyCode === 229) {
          event.preventBaseUIHandler();
          return;
        }
        // Esc with the popup closed: text in the field is cleared first (no bubbling); an empty field lets Esc through (dialogs, drawers).
        const el = event.currentTarget;
        if (event.key === "Escape" && el.getAttribute("aria-expanded") !== "true" && el.value !== "") {
          event.preventBaseUIHandler();
          event.preventDefault();
          event.stopPropagation();
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(el, "");
          el.dispatchEvent(new Event("input", { bubbles: true }));
          return;
        }
        onKeyDown?.(event);
      }}
      {...props}
    />
  );
}

/** Chevron button that toggles the popup. The glyph is a CSS-drawn square-cornered corner. */
function ComboboxTrigger({ className, children, ...props }: ComponentProps<typeof ComboboxPrimitive.Trigger>) {
  return (
    <ComboboxPrimitive.Trigger
      data-slot="combobox-trigger"
      aria-label="목록 열기"
      className={cnState(
        [
          "group/trigger grid w-[calc(var(--yorha-control-md)-2px)] shrink-0 self-stretch place-items-center text-yorha-fg [&>*]:col-start-1 [&>*]:row-start-1",
          // Divider spans the whole frame: an absolute pseudo with no left offset sits at the cell's static position, inset-y-0 against the relative frame.
          "before:absolute before:inset-y-0 before:justify-self-start before:w-px before:bg-yorha-border data-[disabled]:before:bg-yorha-disabled",
          "focus-visible:outline-none focus-visible:bg-yorha-control focus-visible:text-yorha-on-control data-[popup-open]:bg-yorha-control data-[popup-open]:text-yorha-on-control",
          "yorha-disabled",
        ],
        className,
      )}
      {...props}
    >
      {children ?? (
        <>
          <ComboboxIcon />
          <ComboboxBusy />
        </>
      )}
    </ComboboxPrimitive.Trigger>
  );
}

/** Spinner that takes the chevron's place in the trigger cell while `loading` (same 12px box; nothing resizes). */
function ComboboxBusy() {
  const { loading } = useContext(ComboboxContext);
  if (!loading) return null;
  return (
    <span aria-hidden="true" data-slot="combobox-busy" className="grid size-icon-sm place-items-center">
      <Spinner label="불러오는 중" className="text-current [&_[data-yorha-dot]]:bg-current" />
    </span>
  );
}

function ComboboxIcon({ className, ...props }: ComponentProps<typeof ComboboxPrimitive.Icon>) {
  const { loading } = useContext(ComboboxContext);
  return (
    <ComboboxPrimitive.Icon
      data-slot="combobox-icon"
      aria-hidden="true"
      data-loading={loading ? "" : undefined}
      className={cnState(
        "grid size-icon-sm shrink-0 place-items-center data-[loading]:opacity-0 transition-transform duration-(--motion-select) ease-yorha group-data-[popup-open]/trigger:rotate-180",
        className,
      )}
      {...props}
    >
      <ChevronIcon dir="down" />
    </ComboboxPrimitive.Icon>
  );
}

/** Clear button; Base UI keeps it unmounted until the field has a value. */
function ComboboxClear({ className, children, ...props }: ComponentProps<typeof ComboboxPrimitive.Clear>) {
  return (
    <ComboboxPrimitive.Clear
      data-slot="combobox-clear"
      aria-label="지우기"
      className={cnState(
        [
          "grid w-[calc(var(--yorha-control-md)-2px)] shrink-0 self-stretch place-items-center text-yorha-fg yorha-disabled",
          // Same divider as the chevron cell, so clear and chevron read as two equal cells; the frame carries the only focus ring.
          "before:absolute before:inset-y-0 before:justify-self-start before:w-px before:bg-yorha-border data-[disabled]:before:bg-yorha-disabled",
          "focus-visible:outline-none focus-visible:bg-yorha-control focus-visible:text-yorha-on-control",
        ],
        className,
      )}
      {...props}
    >
      {children ?? <CrossIcon />}
    </ComboboxPrimitive.Clear>
  );
}

function ComboboxValue(props: ComponentProps<typeof ComboboxPrimitive.Value>) {
  return <ComboboxPrimitive.Value data-slot="combobox-value" {...props} />;
}

// Popup scrims fade with the popover tokens (not the 400ms panel ones); `pointer-events-none` while ending so a click
// right after Esc reaches what is underneath instead of the fading scrim.
const SCRIM =
  "fixed inset-0 z-(--yorha-z-popover) bg-yorha-overlay " +
  "[transition-property:opacity] [transition-duration:max(var(--motion-popover),var(--motion-reduced-fade))] [transition-timing-function:var(--yorha-ease-decelerate)] data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 data-[ending-style]:pointer-events-none data-[ending-style]:[transition-duration:max(var(--motion-popover-exit),var(--motion-reduced-fade))] data-[ending-style]:[transition-timing-function:var(--yorha-ease-in)]";

/** Optional dim layer behind a modal popup. */
function ComboboxBackdrop({ className, ...props }: ComponentProps<typeof ComboboxPrimitive.Backdrop>) {
  return (
    <ComboboxPrimitive.Backdrop
      data-slot="combobox-backdrop"
      className={cnState(SCRIM, className)}
      {...props}
    />
  );
}

// Pixel arrow: one 12px triangle glyph per side (crispEdges, no rotation), stacked in one 12px box and shown by the Base UI arrow's `data-side`.
function ArrowGlyphs() {
  return (
    <>
      <Glyph name="triangle-up" className="absolute inset-0 opacity-0 group-data-[side=bottom]/arrow:opacity-100" />
      <Glyph name="triangle-down" className="absolute inset-0 opacity-0 group-data-[side=top]/arrow:opacity-100" />
      <Glyph name="triangle-right" className="absolute inset-0 opacity-0 group-data-[side=left]/arrow:opacity-100" />
      <Glyph name="triangle-left" className="absolute inset-0 opacity-0 group-data-[side=right]/arrow:opacity-100" />
    </>
  );
}

/** Optional pointer arrow for the popup; a pixel triangle per side, swapped by `data-side` (never rotated). */
function ComboboxArrow({ className, ...props }: ComponentProps<typeof ComboboxPrimitive.Arrow>) {
  return (
    <ComboboxPrimitive.Arrow
      data-slot="combobox-arrow"
      className={cnState(
        "group/arrow block size-3 text-yorha-border data-[side=bottom]:top-[-8px] data-[side=top]:bottom-[-8px] data-[side=left]:right-[-8px] data-[side=right]:left-[-8px]",
        className,
      )}
      {...props}
    >
      <ArrowGlyphs />
    </ComboboxPrimitive.Arrow>
  );
}

type PositionerProps = ComponentProps<typeof ComboboxPrimitive.Positioner>;
type ContentProps = ComponentProps<typeof ComboboxPrimitive.Popup> &
  Pick<PositionerProps, "side" | "align" | "sideOffset" | "alignOffset"> & {
    /** Portal mount node; defaults to document.body. */
    container?: ComponentProps<typeof ComboboxPrimitive.Portal>["container"];
  };

/** Portal + positioner + popup. Put ComboboxEmpty and ComboboxList inside. */
function ComboboxContent({
  className,
  children,
  side = "bottom",
  align = "start",
  sideOffset = 8,
  alignOffset,
  container,
  ...props
}: ContentProps) {
  return (
    <ComboboxPrimitive.Portal container={container}>
      <ComboboxPrimitive.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        className="z-(--yorha-z-popover) outline-none"
      >
        <ComboboxPrimitive.Popup
          data-slot="combobox-content"
          data-yorha-combobox-popup=""
          className={cnState(
            [
              "yorha-pop yorha-scroll max-h-(--available-height) min-w-(--anchor-width) rounded-yorha border border-yorha-border bg-yorha-panel py-1 shadow-yorha-md",
              "font-yorha text-yorha-sm text-yorha-fg",
              // A popup with no results shows the message only: no rule under it.
              "[&:has([data-empty])_[data-slot=combobox-separator]]:hidden",
            ],
            className,
          )}
          {...props}
        >
          {children}
        </ComboboxPrimitive.Popup>
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  );
}

function ComboboxList({ className, ...props }: ComponentProps<typeof ComboboxPrimitive.List>) {
  const { loading } = useContext(ComboboxContext);
  // A function child is routed through our ComboboxCollection so the create option never reaches the caller's render function.
  const resolved = typeof props.children === "function" ? <ComboboxCollection>{props.children}</ComboboxCollection> : props.children;
  return (
    <ComboboxPrimitive.List
      data-slot="combobox-list"
      aria-busy={loading || undefined}
      data-loading={loading ? "" : undefined}
      className={cnState("outline-none data-[empty]:hidden data-[loading]:opacity-60", className)}
      {...props}
    >
      {resolved}
    </ComboboxPrimitive.List>
  );
}

/** Empty state. The element stays mounted so screen readers announce changes; padding only applies with content. */
function ComboboxEmpty({ className, ...props }: ComponentProps<typeof ComboboxPrimitive.Empty>) {
  return (
    <ComboboxPrimitive.Empty
      data-slot="combobox-empty"
      className={cnState("px-3 py-3 text-center text-pretty text-yorha-fg-soft empty:p-0", className)}
      {...props}
    />
  );
}

/** Polite live region, e.g. "3 results" or "loading". While the root is `loading` it reads "불러오는 중" unless you pass children. */
function ComboboxStatus({ className, children, ...props }: ComponentProps<typeof ComboboxPrimitive.Status>) {
  const { loading } = useContext(ComboboxContext);
  return (
    <ComboboxPrimitive.Status
      data-slot="combobox-status"
      className={cnState("px-3 py-1 text-yorha-xs text-yorha-fg-soft empty:p-0", className)}
      {...props}
    >
      {children ?? (loading ? "불러오는 중" : null)}
    </ComboboxPrimitive.Status>
  );
}

/** Renders the list rows from the root's `items`; the create option that `ComboboxCreate` adds is drawn here too. */
function ComboboxCollection({ children, ...props }: ComponentProps<typeof ComboboxPrimitive.Collection>) {
  return (
    <ComboboxPrimitive.Collection {...props}>
      {typeof children === "function"
        ? (item: unknown, index: number) => (isCreateToken(item) ? <ComboboxCreateRow key="__create" token={item} /> : (children as (i: unknown, n: number) => ReactNode)(item, index))
        : children}
    </ComboboxPrimitive.Collection>
  );
}

/** Row wrapper for grid layouts (`grid` prop on the root). */
function ComboboxRow({ className, ...props }: ComponentProps<typeof ComboboxPrimitive.Row>) {
  return <ComboboxPrimitive.Row data-slot="combobox-row" className={cnState("flex", className)} {...props} />;
}

/**
 * Row (`yorha-row`, G8): full-bleed ink fill wipes in on highlight and drops at once, no ring. The indicator slot
 * holds a hollow bullet; ItemIndicator draws the filled square inside it only for selected rows (shape, not colour).
 */
function ComboboxItem({ className, children, ...props }: ComponentProps<typeof ComboboxPrimitive.Item>) {
  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      className={cnState(["group/item yorha-row cursor-default text-yorha-sm tracking-yorha-body"], className)}
      {...props}
    >
      <TriangleIcon data-yorha-cursor="" className="size-icon-sm opacity-0 group-data-[highlighted]/item:opacity-100" />
      <span data-slot="row-indicator" className="grid size-indicator shrink-0 place-items-center">
        <span aria-hidden="true" data-yorha-bullet="" className="block size-bullet overflow-clip border border-current">
          <ComboboxItemIndicator />
        </span>
      </span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </ComboboxPrimitive.Item>
  );
}

type CreateProps = {
  /** Called with the trimmed input text when the option is picked (click or Enter). The popup closes; the value is not touched. */
  onCreate: (text: string) => void;
  /** Hide the option because the text already matches an existing option. */
  exists?: boolean;
  /** Option label; defaults to `"text" 만들기`. */
  children?: ReactNode | ((text: string) => ReactNode);
};

/**
 * "Create this value" option. Mount it once anywhere inside the root (e.g. in ComboboxContent); while the input has text
 * and `exists` is false the root appends one real option at the end of the flat `items`, drawn by ComboboxCollection,
 * so ArrowDown + Enter reach it and the "no results" message gives way to it. Picking it calls `onCreate(text)` and closes
 * the popup; add the item / set the value yourself. Grouped `items` are not supported (no create option is added).
 */
function ComboboxCreate({ onCreate, exists = false, children }: CreateProps) {
  const ctx = useContext(ComboboxContext);
  ctx.create.current = { onCreate, label: children };
  const { setCreateActive } = ctx;
  useEffect(() => {
    setCreateActive(!exists);
    return () => setCreateActive(false);
  }, [exists, setCreateActive]);
  return null;
}

function ComboboxCreateRow({ token }: { token: CreateToken }) {
  const { create, requestClose } = useContext(ComboboxContext);
  const label = create.current?.label;
  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-create"
      value={token}
      className="group/item yorha-row cursor-default text-yorha-sm tracking-yorha-body"
      onClick={(event) => {
        event.preventBaseUIHandler();
        token.onCreate(token.value);
        requestClose();
      }}
    >
      <TriangleIcon data-yorha-cursor="" className="size-icon-sm opacity-0 group-data-[highlighted]/item:opacity-100" />
      <span data-slot="row-indicator" className="grid size-indicator shrink-0 place-items-center">
        <Glyph name="plus" box={12} />
      </span>
      <span className="min-w-0 flex-1 truncate">{typeof label === "function" ? label(token.value) : (label ?? `"${token.value}" 만들기`)}</span>
    </ComboboxPrimitive.Item>
  );
}

/** Filled square for the selected row; Base UI mounts it only while the item is selected. Carries no text (no emoji check). */
function ComboboxItemIndicator({ className, children = null, ...props }: ComponentProps<typeof ComboboxPrimitive.ItemIndicator>) {
  return (
    <ComboboxPrimitive.ItemIndicator
      data-slot="combobox-item-indicator"
      data-yorha-indicator=""
      className={cnState("block size-full bg-current", className)}
      {...props}
    >
      {children}
    </ComboboxPrimitive.ItemIndicator>
  );
}

/** Visible label wired to the input by Base UI (no htmlFor needed inside the root). */
function ComboboxLabel({ className, ...props }: ComponentProps<typeof ComboboxPrimitive.Label>) {
  return (
    <ComboboxPrimitive.Label
      data-slot="combobox-label"
      className={cnState("font-yorha text-yorha-sm font-yorha-bold tracking-yorha-heading text-yorha-fg", className)}
      {...props}
    />
  );
}

/**
 * Chip container for `multiple`; put ComboboxChip children and the ComboboxInput inside it.
 *
 * The row is one line at `h-control-md` and never grows. Chips that do not fit (the input keeps 3rem) collapse into a
 * "+N" count chip named "외 N개 선택됨"; the hidden chips stay in the DOM (`data-overflow`), the popup lists every
 * selected row with its filled bullet. Migration: the row no longer wraps and `max-h-32` is gone, so anything that
 * relied on the field growing (taller frames, a second chip row) now sees the count chip instead.
 */
function ComboboxChips({ className, children, ...props }: ComponentProps<typeof ComboboxPrimitive.Chips>) {
  const ref = useRef<HTMLDivElement | null>(null);
  const { open, requestOpen } = useContext(ComboboxContext);
  const moreId = useId();
  const [hidden, setHidden] = useState(0);
  // Runs after every render (chips come and go) and on resize; the guard on setHidden ends the loop.
  const measure = () => {
    const el = ref.current;
    if (!el) return;
    const chips = [...el.querySelectorAll<HTMLElement>("[data-slot=combobox-chip]")];
    for (const c of chips) c.removeAttribute("data-overflow");
    const cs = getComputedStyle(el);
    const gap = parseFloat(cs.columnGap) || 0;
    const room = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - INPUT_MIN - gap;
    const widths = chips.map((c) => c.offsetWidth);
    const total = widths.reduce((a, w) => a + w + gap, 0);
    let count = 0;
    if (total > room) {
      const limit = room - MORE_W - gap;
      let used = 0;
      let fit = 0;
      for (const w of widths) {
        if (used + w + gap > limit) break;
        used += w + gap;
        fit += 1;
      }
      count = chips.length - fit;
      chips.slice(fit).forEach((c) => c.setAttribute("data-overflow", ""));
    }
    setHidden(count);
  };
  useLayoutEffect(measure);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <ComboboxPrimitive.Chips
      ref={ref}
      data-slot="combobox-chips"
      className={cnState("flex min-w-0 flex-1 flex-nowrap items-center gap-1 self-stretch overflow-hidden px-1 [&_[data-slot=combobox-input]]:order-2 [&_[data-slot=combobox-input]]:h-6 [&_[data-slot=combobox-input]]:min-w-12 [&_[data-slot=combobox-input]]:px-1", className)}
      {...props}
    >
      {children}
      {hidden > 0 && (
        <>
        {/* Name = visible "+N" plus the count in words (label-in-name); the aria-label attribute stays as the plain fallback. */}
        <span id={moreId} hidden>
          +{hidden} 외 {hidden}개 선택됨
        </span>
        <button
          type="button"
          data-slot="combobox-chips-more"
          aria-label={`외 ${hidden}개 선택됨`}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-labelledby={moreId}
          onClick={(event) => {
            requestOpen();
            ref.current?.querySelector<HTMLInputElement>("[data-slot=combobox-input]")?.focus();
            event.stopPropagation();
          }}
          className="order-1 inline-flex h-6 min-w-6 shrink-0 cursor-default items-center justify-center rounded-yorha border border-yorha-border bg-yorha-bg px-2 font-yorha text-yorha-sm text-yorha-fg focus-visible:outline-none focus-visible:bg-yorha-ink focus-visible:text-yorha-on-ink data-[popup-open]:bg-yorha-ink"
        >
          +{hidden}
        </button>
        </>
      )}
    </ComboboxPrimitive.Chips>
  );
}

/** Square tag for one selected value. Focus it with ArrowLeft from the empty input; Backspace/Delete removes it. */
function ComboboxChip({ className, children, ...props }: ComponentProps<typeof ComboboxPrimitive.Chip>) {
  return (
    <ComboboxPrimitive.Chip
      data-slot="combobox-chip"
      data-yorha-chip=""
      aria-description="Backspace 또는 Delete 키로 제거"
      className={cnState(
        [
          "group/chip inline-flex h-6 shrink-0 data-[overflow]:hidden items-center gap-1 rounded-yorha border border-yorha-border bg-yorha-bg pl-2 font-yorha text-yorha-sm text-yorha-fg",
          "focus-visible:outline-none data-[highlighted]:bg-yorha-ink data-[highlighted]:text-yorha-on-ink",
        ],
        className,
      )}
      {...props}
    >
      {children}
    </ComboboxPrimitive.Chip>
  );
}

/** Remove button inside a chip. Pass `aria-label` naming the value, e.g. "Archive 제거". */
function ComboboxChipRemove({ className, children, ...props }: ComponentProps<typeof ComboboxPrimitive.ChipRemove>) {
  return (
    <ComboboxPrimitive.ChipRemove
      data-slot="combobox-chip-remove"
      aria-label="제거"
      className={cnState(
        "grid -my-px -mr-px size-6 shrink-0 place-items-center border-l border-yorha-border text-current focus-visible:outline-none focus-visible:bg-yorha-ink focus-visible:text-yorha-on-ink",
        className,
      )}
      {...props}
    >
      {children ?? <CrossIcon />}
    </ComboboxPrimitive.ChipRemove>
  );
}

function ComboboxGroup({ className, ...props }: ComponentProps<typeof ComboboxPrimitive.Group>) {
  return <ComboboxPrimitive.Group data-slot="combobox-group" className={cnState("", className)} {...props} />;
}

function ComboboxGroupLabel({ className, ...props }: ComponentProps<typeof ComboboxPrimitive.GroupLabel>) {
  return (
    <ComboboxPrimitive.GroupLabel
      data-slot="combobox-group-label"
      className={cnState(
        "px-2 py-1.5 text-yorha-xs font-yorha-bold tracking-yorha-heading text-yorha-fg-soft uppercase",
        className,
      )}
      {...props}
    />
  );
}

function ComboboxSeparator({ className, ...props }: ComponentProps<typeof ComboboxPrimitive.Separator>) {
  return (
    <ComboboxPrimitive.Separator
      data-slot="combobox-separator"
      className={cnState("my-1 h-px bg-yorha-separator", className)}
      {...props}
    />
  );
}

export {
  Combobox,
  ComboboxArrow,
  ComboboxBackdrop,
  ComboboxClear,
  ComboboxCollection,
  ComboboxContent,
  ComboboxCreate,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxGroupLabel,
  ComboboxChip,
  ComboboxChipRemove,
  ComboboxChips,
  ComboboxIcon,
  ComboboxItemIndicator,
  ComboboxLabel,
  ComboboxInput,
  ComboboxInputGroup,
  ComboboxItem,
  ComboboxList,
  ComboboxRow,
  ComboboxSeparator,
  ComboboxStatus,
  ComboboxTrigger,
  ComboboxValue,
  useComboboxFilter,
};
