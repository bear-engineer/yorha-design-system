import type { ComponentProps } from "react";
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
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
          "flex min-h-8 w-full min-w-40 items-stretch rounded-yorha border border-yorha-border bg-yorha-panel font-yorha text-yorha-sm text-yorha-fg",
          "focus-within:yorha-focus",
          "data-[popup-open]:border-yorha-ink",
          "data-[invalid]:border-(length:--yorha-border-width-strong) data-[invalid]:border-yorha-alert-ui",
          "data-[disabled]:cursor-not-allowed data-[disabled]:text-yorha-fg-muted",
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
          "min-w-0 flex-1 rounded-none border-0 bg-transparent px-3 py-1.5 font-yorha text-yorha-sm tracking-yorha-body text-yorha-fg",
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
          "group/trigger grid min-w-[24px] place-items-center border-l border-yorha-border px-2 text-yorha-fg",
          "focus-visible:yorha-focus data-[popup-open]:bg-yorha-control data-[popup-open]:text-yorha-on-control",
          "data-[disabled]:cursor-not-allowed data-[disabled]:text-yorha-fg-muted",
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
        "inline-block size-2 shrink-0 -translate-y-px rotate-45 border-r-2 border-b-2 border-current group-data-[popup-open]/trigger:translate-y-px group-data-[popup-open]/trigger:rotate-[225deg]",
        className,
      )}
      {...props}
    />
  );
}

/** Clear button; Base UI keeps it unmounted until the field has a value. */
function ComboboxClear({ className, children, ...props }: ComponentProps<typeof ComboboxPrimitive.Clear>) {
  return (
    <ComboboxPrimitive.Clear
      data-slot="combobox-clear"
      aria-label="지우기"
      className={cnState(
        "grid min-w-[24px] place-items-center px-2 text-yorha-fg focus-visible:yorha-focus data-[disabled]:cursor-not-allowed data-[disabled]:text-yorha-fg-muted",
        className,
      )}
      {...props}
    >
      {children ?? <span aria-hidden="true">×</span>}
    </ComboboxPrimitive.Clear>
  );
}

function ComboboxValue(props: ComponentProps<typeof ComboboxPrimitive.Value>) {
  return <ComboboxPrimitive.Value data-slot="combobox-value" {...props} />;
}

/** Optional dim layer behind a modal popup. */
function ComboboxBackdrop({ className, ...props }: ComponentProps<typeof ComboboxPrimitive.Backdrop>) {
  return (
    <ComboboxPrimitive.Backdrop
      data-slot="combobox-backdrop"
      className={cnState("yorha-fade fixed inset-0 z-(--yorha-z-popover) bg-yorha-overlay", className)}
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
  sideOffset = 4,
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
              "yorha-pop max-h-(--available-height) min-w-(--anchor-width) overflow-y-auto rounded-yorha border border-yorha-border bg-yorha-panel py-1 shadow-yorha-md",
              "font-yorha text-yorha-sm text-yorha-fg",
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
      className={cnState("mx-1 px-3 py-2 text-yorha-fg-soft empty:p-0", className)}
      {...props}
    />
  );
}

/** Polite live region, e.g. "3 results" or "loading". */
function ComboboxStatus({ className, ...props }: ComponentProps<typeof ComboboxPrimitive.Status>) {
  return (
    <ComboboxPrimitive.Status
      data-slot="combobox-status"
      className={cnState("mx-1 px-3 py-1 text-yorha-xs text-yorha-fg-soft empty:p-0", className)}
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
 * Row. Highlight (keyboard or pointer) wipes a dark fill left→right, flips text to on-ink,
 * shows the arrow cursor and the thin rules above/below, like Select and Menu.
 * The square bullet is hollow normally; ItemIndicator draws the filled square inside it only
 * for selected rows, so selection is shape, not colour. It inverts with the row via currentColor.
 */
function ComboboxItem({ className, children, ...props }: ComponentProps<typeof ComboboxPrimitive.Item>) {
  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      className={cnState(
        [
          "group/item relative mx-1 flex cursor-default items-center gap-3 py-2 pr-3 pl-7 select-none",
          "bg-[linear-gradient(var(--yorha-ink),var(--yorha-ink))] bg-left bg-no-repeat [background-size:0%_calc(100%_-_4px)]",
          "transition-[background-size,color] duration-(--motion-popover) ease-yorha-decelerate",
          "data-[highlighted]:text-yorha-on-ink data-[highlighted]:[background-size:100%_calc(100%_-_4px)]",
          "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-(--menu-rule) before:bg-yorha-ink before:opacity-0 before:content-['']",
          "after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-(--menu-rule) after:bg-yorha-ink after:opacity-0 after:content-['']",
          "data-[highlighted]:before:opacity-100 data-[highlighted]:after:opacity-100",
          "data-[disabled]:cursor-not-allowed data-[disabled]:text-yorha-fg-muted",
        ],
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        data-yorha-cursor=""
        className="pointer-events-none absolute top-1/2 left-1 size-0 -translate-y-1/2 border-y-[0.3125rem] border-l-[0.4375rem] border-y-transparent border-l-current opacity-0 group-data-[highlighted]/item:opacity-100"
      />
      <span aria-hidden="true" data-yorha-bullet="" className="inline-block size-2 shrink-0 border border-current">
        <ComboboxItemIndicator />
      </span>
      <span className="flex-1 truncate">{children}</span>
    </ComboboxPrimitive.Item>
  );
}

/** Filled square for the selected row; Base UI mounts it only while the item is selected. */
function ComboboxItemIndicator({ className, ...props }: ComponentProps<typeof ComboboxPrimitive.ItemIndicator>) {
  return (
    <ComboboxPrimitive.ItemIndicator
      data-slot="combobox-item-indicator"
      data-yorha-indicator=""
      className={cnState("block size-full bg-current", className)}
      {...props}
    />
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
      className={cnState("flex min-w-0 flex-1 flex-wrap items-center gap-1 px-2 py-1", className)}
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
          "group/chip inline-flex min-h-6 items-center gap-1 rounded-yorha border border-yorha-border bg-yorha-bg pl-2 font-yorha text-yorha-sm text-yorha-fg",
          "focus-visible:yorha-focus data-[highlighted]:bg-yorha-ink data-[highlighted]:text-yorha-on-ink",
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
        "grid size-6 min-h-[24px] min-w-[24px] shrink-0 place-items-center border-l border-yorha-border text-current focus-visible:yorha-focus",
        className,
      )}
      {...props}
    >
      {children ?? <span aria-hidden="true">×</span>}
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
        "mx-1 border-b border-yorha-separator px-3 py-1.5 text-yorha-xs font-yorha-bold tracking-yorha-heading text-yorha-fg-soft uppercase",
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
      className={cnState("mx-1 my-1 h-px bg-yorha-separator", className)}
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
