import type { ComponentProps } from "react";
import { Autocomplete as AutocompletePrimitive } from "@base-ui/react/autocomplete";
import { cnState } from "@/lib/utils";

/** Root: re-export of the Base UI Autocomplete root (items, mode, value, onValueChange, autoHighlight, ...). */
const Autocomplete = AutocompletePrimitive.Root;

/** Filter hook from Base UI (locale-aware contains/startsWith/endsWith matchers). */
const useAutocompleteFilter = AutocompletePrimitive.useFilter;

/** Bordered, square field shell that holds the input and its Clear / Trigger buttons. */
function AutocompleteInputGroup({ className, ...props }: ComponentProps<typeof AutocompletePrimitive.InputGroup>) {
  return (
    <AutocompletePrimitive.InputGroup
      data-slot="autocomplete-input-group"
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
 * Text input. Enter / Backspace that belong to an IME composition (isComposing or the
 * legacy keyCode 229) never reach Base UI, so confirming a Hangul syllable cannot commit a row.
 */
function AutocompleteInput({ className, onKeyDown, ...props }: ComponentProps<typeof AutocompletePrimitive.Input>) {
  return (
    <AutocompletePrimitive.Input
      data-slot="autocomplete-input"
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
function AutocompleteTrigger({ className, children, ...props }: ComponentProps<typeof AutocompletePrimitive.Trigger>) {
  return (
    <AutocompletePrimitive.Trigger
      data-slot="autocomplete-trigger"
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
      {children ?? <AutocompleteIcon />}
    </AutocompletePrimitive.Trigger>
  );
}

/** Fixed-size chevron (down). Square caps, currentColor; the trigger rotates it 180deg while open. */
function ChevronGlyph({ up = false }: { up?: boolean }) {
  return (
    <svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true" focusable="false" className="block shrink-0">
      <path d={up ? "M2 8 L6 4 L10 8" : "M2 4 L6 8 L10 4"} />
    </svg>
  );
}

function AutocompleteIcon({ className, ...props }: ComponentProps<typeof AutocompletePrimitive.Icon>) {
  return (
    <AutocompletePrimitive.Icon
      data-slot="autocomplete-icon"
      aria-hidden="true"
      className={cnState(
        "inline-flex size-3 shrink-0 items-center justify-center transition-transform duration-(--motion-select) ease-yorha group-data-[popup-open]/trigger:rotate-180",
        className,
      )}
      {...props}
    >
      <ChevronGlyph />
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
        "invisible grid min-w-[24px] place-items-center px-2 text-yorha-fg opacity-0 transition-[opacity,visibility] duration-(--motion-select) ease-yorha focus-visible:yorha-focus data-[disabled]:cursor-not-allowed data-[disabled]:text-yorha-fg-muted data-[visible]:visible data-[visible]:opacity-100",
        className,
      )}
      {...props}
    >
      {children ?? <span aria-hidden="true">×</span>}
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

/** Optional pointer arrow for the popup; rotates to the side the popup opens on. */
function AutocompleteArrow({ className, ...props }: ComponentProps<typeof AutocompletePrimitive.Arrow>) {
  return (
    <AutocompletePrimitive.Arrow
      data-slot="autocomplete-arrow"
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
  sideOffset = 4,
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
              "yorha-pop max-h-(--available-height) min-w-(--anchor-width) overflow-y-auto rounded-yorha border border-yorha-border bg-yorha-panel py-1 shadow-yorha-md",
              "font-yorha text-yorha-sm text-yorha-fg",
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
  return (
    <AutocompletePrimitive.List
      data-slot="autocomplete-list"
      className={cnState("outline-none data-[empty]:hidden", className)}
      {...props}
    />
  );
}

/** Empty state. The element stays mounted so screen readers announce changes; padding only applies with content. */
function AutocompleteEmpty({ className, ...props }: ComponentProps<typeof AutocompletePrimitive.Empty>) {
  return (
    <AutocompletePrimitive.Empty
      data-slot="autocomplete-empty"
      className={cnState("mx-1 px-3 py-2 text-yorha-fg-soft empty:p-0", className)}
      {...props}
    />
  );
}

/** Polite live region, e.g. "3 results" or "loading". */
function AutocompleteStatus({ className, ...props }: ComponentProps<typeof AutocompletePrimitive.Status>) {
  return (
    <AutocompletePrimitive.Status
      data-slot="autocomplete-status"
      className={cnState("mx-1 px-3 py-1 text-yorha-xs text-yorha-fg-soft empty:p-0", className)}
      {...props}
    />
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
 * Row. Highlight (keyboard or pointer) wipes a dark fill left→right, flips text to on-ink,
 * shows the arrow cursor and the thin rules above/below, like Select and Menu.
 * The square bullet stays hollow: Autocomplete has no selected state, the typed text is the value.
 */
function AutocompleteItem({ className, children, ...props }: ComponentProps<typeof AutocompletePrimitive.Item>) {
  return (
    <AutocompletePrimitive.Item
      data-slot="autocomplete-item"
      className={cnState(
        [
          "group/item relative mx-1 flex cursor-default items-center gap-3 py-2 pr-3 pl-7 select-none",
          "bg-[linear-gradient(var(--yorha-ink),var(--yorha-ink))] bg-left bg-no-repeat [background-size:0%_calc(100%_-_4px)]",
          "yorha-wipe",
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
      <span aria-hidden="true" data-yorha-bullet="" className="inline-block size-2 shrink-0 border border-current" />
      <span className="flex-1 truncate">{children}</span>
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
        "mx-1 border-b border-yorha-separator px-3 py-1.5 text-yorha-xs font-yorha-bold tracking-yorha-heading text-yorha-fg-soft uppercase",
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
      className={cnState("mx-1 my-1 h-px bg-yorha-separator", className)}
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
