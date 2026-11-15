import { createContext, useContext, type ComponentProps } from "react";
import { Autocomplete as AutocompletePrimitive } from "@base-ui/react/autocomplete";
import { ChevronIcon, CrossIcon, TriangleIcon } from "@/components/ui/icons";
import { Glyph } from "@/components/ui/glyph";
import { Spinner } from "@/components/ui/spinner";
import { cnState } from "@/lib/utils";

const AutocompleteContext = createContext({ loading: false });

/**
 * Root: Base UI Autocomplete root (items, mode, value, onValueChange, autoHighlight, ...) plus `loading`: async
 * suggestions in flight. A Spinner replaces the chevron in the trigger cell (same 12px box, the field never resizes),
 * the list keeps its previous rows at 60 % opacity with `aria-busy`, and `AutocompleteStatus` reads "불러오는 중"
 * unless it has its own text.
 */
function Autocomplete<ItemValue>({
  loading = false,
  ...props
}: AutocompletePrimitive.Root.Props<ItemValue> & { loading?: boolean }) {
  return (
    <AutocompleteContext value={{ loading }}>
      <AutocompletePrimitive.Root {...(props as object)} />
    </AutocompleteContext>
  );
}

/** Filter hook from Base UI (locale-aware contains/startsWith/endsWith matchers). */
const useAutocompleteFilter = AutocompletePrimitive.useFilter;

/** Bordered, square field shell that holds the input and its Clear / Trigger buttons. */
function AutocompleteInputGroup({ className, ...props }: ComponentProps<typeof AutocompletePrimitive.InputGroup>) {
  return (
    <AutocompletePrimitive.InputGroup
      data-slot="autocomplete-input-group"
      className={cnState(
        [
          "flex min-h-control-md w-full min-w-40 items-stretch rounded-yorha border border-yorha-border bg-yorha-bg font-yorha text-yorha-base text-yorha-fg",
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
 * Text input. Enter / Backspace that belong to an IME composition (isComposing or the
 * legacy keyCode 229) never reach Base UI, so confirming a Hangul syllable cannot commit a row.
 */
function AutocompleteInput({ className, onKeyDown, ...props }: ComponentProps<typeof AutocompletePrimitive.Input>) {
  return (
    <AutocompletePrimitive.Input
      data-slot="autocomplete-input"
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
function AutocompleteTrigger({ className, children, ...props }: ComponentProps<typeof AutocompletePrimitive.Trigger>) {
  return (
    <AutocompletePrimitive.Trigger
      data-slot="autocomplete-trigger"
      aria-label="목록 열기"
      className={cnState(
        [
          "group/trigger grid aspect-square h-[calc(var(--yorha-control-md)-2px)] shrink-0 self-start place-items-center border-l border-yorha-border text-yorha-fg [&>*]:col-start-1 [&>*]:row-start-1",
          "focus-visible:yorha-focus-inset data-[popup-open]:bg-yorha-control data-[popup-open]:text-yorha-on-control",
          "yorha-disabled data-[disabled]:border-yorha-disabled",
        ],
        className,
      )}
      {...props}
    >
      {children ?? (
        <>
          <AutocompleteIcon />
          <AutocompleteBusy />
        </>
      )}
    </AutocompletePrimitive.Trigger>
  );
}

/** Spinner that takes the chevron's place in the trigger cell while `loading` (same 12px box; nothing resizes). */
function AutocompleteBusy() {
  const { loading } = useContext(AutocompleteContext);
  if (!loading) return null;
  return (
    <span aria-hidden="true" data-slot="autocomplete-busy" className="grid size-icon-sm place-items-center">
      <Spinner size="sm" label="불러오는 중" className="text-current [&_[data-yorha-dot]]:bg-current" />
    </span>
  );
}

function AutocompleteIcon({ className, ...props }: ComponentProps<typeof AutocompletePrimitive.Icon>) {
  const { loading } = useContext(AutocompleteContext);
  return (
    <AutocompletePrimitive.Icon
      data-slot="autocomplete-icon"
      aria-hidden="true"
      data-loading={loading ? "" : undefined}
      className={cnState(
        "grid size-icon-sm shrink-0 place-items-center data-[loading]:opacity-0 transition-transform duration-(--motion-select) ease-yorha group-data-[popup-open]/trigger:rotate-180",
        className,
      )}
      {...props}
    >
      <ChevronIcon dir="down" />
    </AutocompletePrimitive.Icon>
  );
}

/** Clear button; always mounted so its slot is reserved (the input never resizes), fades in once the field has a value. */
function AutocompleteClear({ className, children, ...props }: ComponentProps<typeof AutocompletePrimitive.Clear>) {
  return (
    <AutocompletePrimitive.Clear
      data-slot="autocomplete-clear"
      aria-label="지우기"
      keepMounted
      className={cnState(
        "invisible grid aspect-square h-[calc(var(--yorha-control-md)-2px)] shrink-0 self-start place-items-center text-yorha-fg opacity-0 transition-[opacity,visibility] duration-(--motion-select) ease-yorha focus-visible:yorha-focus-inset yorha-disabled data-[visible]:visible data-[visible]:opacity-100",
        className,
      )}
      {...props}
    >
      {children ?? <CrossIcon />}
    </AutocompletePrimitive.Clear>
  );
}

function AutocompleteValue(props: ComponentProps<typeof AutocompletePrimitive.Value>) {
  return <AutocompletePrimitive.Value data-slot="autocomplete-value" {...props} />;
}

// Popup scrims fade with the popover tokens (not the 400ms panel ones); `pointer-events-none` while ending so a click
// right after Esc reaches what is underneath instead of the fading scrim.
const SCRIM =
  "fixed inset-0 z-(--yorha-z-popover) bg-yorha-overlay " +
  "[transition-property:opacity] [transition-duration:max(var(--motion-popover),var(--motion-reduced-fade))] [transition-timing-function:var(--yorha-ease-decelerate)] data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 data-[ending-style]:pointer-events-none data-[ending-style]:[transition-duration:max(var(--motion-popover-exit),var(--motion-reduced-fade))] data-[ending-style]:[transition-timing-function:var(--yorha-ease-in)]";

/** Optional dim layer behind a modal popup. */
function AutocompleteBackdrop({ className, ...props }: ComponentProps<typeof AutocompletePrimitive.Backdrop>) {
  return (
    <AutocompletePrimitive.Backdrop
      data-slot="autocomplete-backdrop"
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
function AutocompleteArrow({ className, ...props }: ComponentProps<typeof AutocompletePrimitive.Arrow>) {
  return (
    <AutocompletePrimitive.Arrow
      data-slot="autocomplete-arrow"
      className={cnState(
        "group/arrow block size-3 text-yorha-border data-[side=bottom]:top-[-8px] data-[side=top]:bottom-[-8px] data-[side=left]:right-[-8px] data-[side=right]:left-[-8px]",
        className,
      )}
      {...props}
    >
      <ArrowGlyphs />
    </AutocompletePrimitive.Arrow>
  );
}

type PositionerProps = ComponentProps<typeof AutocompletePrimitive.Positioner>;
type ContentProps = ComponentProps<typeof AutocompletePrimitive.Popup> &
  Pick<PositionerProps, "side" | "align" | "sideOffset" | "alignOffset"> & {
    /** Portal mount node; defaults to document.body. */
    container?: ComponentProps<typeof AutocompletePrimitive.Portal>["container"];
  };

/** Portal + positioner + popup. Put AutocompleteEmpty and AutocompleteList inside. */
function AutocompleteContent({
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
    <AutocompletePrimitive.Portal container={container}>
      <AutocompletePrimitive.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        className="z-(--yorha-z-popover) outline-none"
      >
        <AutocompletePrimitive.Popup
          data-slot="autocomplete-content"
          data-yorha-autocomplete-popup=""
          className={cnState(
            [
              "yorha-pop yorha-scroll max-h-(--available-height) min-w-(--anchor-width) rounded-yorha border border-yorha-border bg-yorha-panel py-1 shadow-yorha-md",
              "font-yorha text-yorha-sm text-yorha-fg",
              // A popup with no results shows the message only: no rule under it.
              "[&:has([data-empty])_[data-slot=autocomplete-separator]]:hidden",
            ],
            className,
          )}
          {...props}
        >
          {children}
        </AutocompletePrimitive.Popup>
      </AutocompletePrimitive.Positioner>
    </AutocompletePrimitive.Portal>
  );
}

function AutocompleteList({ className, ...props }: ComponentProps<typeof AutocompletePrimitive.List>) {
  const { loading } = useContext(AutocompleteContext);
  return (
    <AutocompletePrimitive.List
      data-slot="autocomplete-list"
      aria-busy={loading || undefined}
      data-loading={loading ? "" : undefined}
      className={cnState("outline-none data-[empty]:hidden data-[loading]:opacity-60", className)}
      {...props}
    />
  );
}

/** Empty state. The element stays mounted so screen readers announce changes; padding only applies with content. */
function AutocompleteEmpty({ className, ...props }: ComponentProps<typeof AutocompletePrimitive.Empty>) {
  return (
    <AutocompletePrimitive.Empty
      data-slot="autocomplete-empty"
      className={cnState("px-3 py-3 text-center text-pretty text-yorha-fg-soft empty:p-0", className)}
      {...props}
    />
  );
}

/** Polite live region, e.g. "3 results" or "loading". */
function AutocompleteStatus({ className, children, ...props }: ComponentProps<typeof AutocompletePrimitive.Status>) {
  const { loading } = useContext(AutocompleteContext);
  return (
    <AutocompletePrimitive.Status
      data-slot="autocomplete-status"
      className={cnState("px-3 py-1 text-yorha-xs text-yorha-fg-soft empty:p-0", className)}
      {...props}
    >
      {children ?? (loading ? "불러오는 중" : null)}
    </AutocompletePrimitive.Status>
  );
}

function AutocompleteCollection(props: ComponentProps<typeof AutocompletePrimitive.Collection>) {
  return <AutocompletePrimitive.Collection {...props} />;
}

/** Row wrapper for grid layouts (`grid` prop on the root). */
function AutocompleteRow({ className, ...props }: ComponentProps<typeof AutocompletePrimitive.Row>) {
  return <AutocompletePrimitive.Row data-slot="autocomplete-row" className={cnState("flex", className)} {...props} />;
}

/**
 * Row (`yorha-row`, G8): full-bleed ink fill wipes in on highlight and drops at once, no ring. Autocomplete has no
 * selected state (the typed text is the value), so the row has a cursor gutter and a label, no indicator slot.
 */
function AutocompleteItem({ className, children, ...props }: ComponentProps<typeof AutocompletePrimitive.Item>) {
  return (
    <AutocompletePrimitive.Item
      data-slot="autocomplete-item"
      className={cnState(["group/item yorha-row cursor-default text-yorha-sm tracking-yorha-body"], className)}
      {...props}
    >
      <TriangleIcon data-yorha-cursor="" className="size-icon-sm opacity-0 group-data-[highlighted]/item:opacity-100" />
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </AutocompletePrimitive.Item>
  );
}

function AutocompleteGroup({ className, ...props }: ComponentProps<typeof AutocompletePrimitive.Group>) {
  return <AutocompletePrimitive.Group data-slot="autocomplete-group" className={cnState("", className)} {...props} />;
}

function AutocompleteGroupLabel({ className, ...props }: ComponentProps<typeof AutocompletePrimitive.GroupLabel>) {
  return (
    <AutocompletePrimitive.GroupLabel
      data-slot="autocomplete-group-label"
      className={cnState(
        "px-2 py-1.5 text-yorha-xs font-yorha-bold tracking-yorha-heading text-yorha-fg-soft uppercase",
        className,
      )}
      {...props}
    />
  );
}

function AutocompleteSeparator({ className, ...props }: ComponentProps<typeof AutocompletePrimitive.Separator>) {
  return (
    <AutocompletePrimitive.Separator
      data-slot="autocomplete-separator"
      className={cnState("my-1 h-px bg-yorha-separator", className)}
      {...props}
    />
  );
}

export {
  Autocomplete,
  AutocompleteArrow,
  AutocompleteBackdrop,
  AutocompleteClear,
  AutocompleteCollection,
  AutocompleteContent,
  AutocompleteEmpty,
  AutocompleteGroup,
  AutocompleteGroupLabel,
  AutocompleteIcon,
  AutocompleteInput,
  AutocompleteInputGroup,
  AutocompleteItem,
  AutocompleteList,
  AutocompleteRow,
  AutocompleteSeparator,
  AutocompleteStatus,
  AutocompleteTrigger,
  AutocompleteValue,
  useAutocompleteFilter,
};
