import type { ComponentProps } from "react";
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { ChevronIcon, CrossIcon, TriangleIcon } from "@/components/ui/icons";
import { cnState } from "@/lib/utils";

/** Root: re-export of the Base UI Combobox root (items, value, onValueChange, multiple, ...). */
const Combobox = ComboboxPrimitive.Root;

/** Filter hook from Base UI (locale-aware contains/startsWith/endsWith matchers). */
const useComboboxFilter = ComboboxPrimitive.useFilter;

/** Bordered, square field shell that holds the input and its Clear / Trigger buttons. */
function ComboboxInputGroup({ className, ...props }: ComponentProps<typeof ComboboxPrimitive.InputGroup>) {
  return (
    <ComboboxPrimitive.InputGroup
      data-slot="combobox-input-group"
      className={cnState(
        [
          "relative flex min-h-control-md w-full min-w-40 items-stretch rounded-yorha border border-yorha-border bg-yorha-panel font-yorha text-yorha-sm text-yorha-fg",
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
          "min-w-0 flex-1 self-stretch rounded-none border-0 bg-transparent px-pad-md py-0 font-yorha text-yorha-sm tracking-yorha-body text-yorha-fg",
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
          "group/trigger grid aspect-square h-[calc(var(--yorha-control-md)-2px)] shrink-0 self-start place-items-center text-yorha-fg",
          // Divider spans the whole frame even when chips wrap to more rows (the button stays one control high, top-aligned):
          // an absolute pseudo with no left offset sits at the trigger's static position, inset-y-0 against the relative frame.
          "before:absolute before:inset-y-0 before:justify-self-start before:w-px before:bg-yorha-border data-[disabled]:before:bg-yorha-disabled",
          "focus-visible:yorha-focus-inset data-[popup-open]:bg-yorha-control data-[popup-open]:text-yorha-on-control",
          "yorha-disabled",
        ],
        className,
      )}
      {...props}
    >
      {children ?? <ComboboxIcon />}
    </ComboboxPrimitive.Trigger>
  );
}

function ComboboxIcon({ className, ...props }: ComponentProps<typeof ComboboxPrimitive.Icon>) {
  return (
    <ComboboxPrimitive.Icon
      data-slot="combobox-icon"
      aria-hidden="true"
      className={cnState(
        "grid size-icon-sm shrink-0 place-items-center transition-transform duration-(--motion-select) ease-yorha group-data-[popup-open]/trigger:rotate-180",
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
        "grid aspect-square h-[calc(var(--yorha-control-md)-2px)] shrink-0 self-start place-items-center text-yorha-fg focus-visible:yorha-focus-inset yorha-disabled",
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

/** Optional pointer arrow for the popup; rotates to the side the popup opens on. */
function ComboboxArrow({ className, ...props }: ComponentProps<typeof ComboboxPrimitive.Arrow>) {
  return (
    <ComboboxPrimitive.Arrow
      data-slot="combobox-arrow"
      className={cnState(
        [
          "size-2 rotate-45 border border-yorha-border bg-yorha-panel",
          "data-[side=bottom]:-top-1 data-[side=bottom]:border-r-0 data-[side=bottom]:border-b-0",
          "data-[side=top]:-bottom-1 data-[side=top]:border-t-0 data-[side=top]:border-l-0",
        ],
        className,
      )}
      {...props}
    />
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
  return (
    <ComboboxPrimitive.List
      data-slot="combobox-list"
      className={cnState("outline-none data-[empty]:hidden", className)}
      {...props}
    />
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

/** Polite live region, e.g. "3 results" or "loading". */
function ComboboxStatus({ className, ...props }: ComponentProps<typeof ComboboxPrimitive.Status>) {
  return (
    <ComboboxPrimitive.Status
      data-slot="combobox-status"
      className={cnState("px-3 py-1 text-yorha-xs text-yorha-fg-soft empty:p-0", className)}
      {...props}
    />
  );
}

function ComboboxCollection(props: ComponentProps<typeof ComboboxPrimitive.Collection>) {
  return <ComboboxPrimitive.Collection {...props} />;
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

/** Chip container for `multiple`; put ComboboxChip children and the ComboboxInput inside it. */
function ComboboxChips({ className, ...props }: ComponentProps<typeof ComboboxPrimitive.Chips>) {
  return (
    <ComboboxPrimitive.Chips
      data-slot="combobox-chips"
      className={cnState("yorha-scroll flex max-h-32 min-w-0 flex-1 flex-wrap content-start items-center gap-1 p-1 [&_[data-slot=combobox-input]]:h-6 [&_[data-slot=combobox-input]]:min-w-16 [&_[data-slot=combobox-input]]:px-1", className)}
      {...props}
    />
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
          "group/chip inline-flex h-6 shrink-0 items-center gap-1 rounded-yorha border border-yorha-border bg-yorha-bg pl-2 font-yorha text-yorha-sm text-yorha-fg",
          "focus-visible:yorha-focus-inset data-[highlighted]:bg-yorha-ink data-[highlighted]:text-yorha-on-ink",
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
        "grid -my-px -mr-px size-6 shrink-0 place-items-center border-l border-yorha-border text-current focus-visible:yorha-focus-inset",
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
