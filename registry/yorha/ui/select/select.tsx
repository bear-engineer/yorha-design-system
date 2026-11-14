import type { ComponentProps } from "react";
import { Select as SelectPrimitive } from "@base-ui/react/select";
import { cnState } from "@/lib/utils";

/** Root: re-export of the Base UI Select root (value, items, onValueChange, disabled, ...). */
const Select = SelectPrimitive.Root;

/** Fixed-size chevron (down). Square caps, currentColor; the trigger rotates it 180deg while open. */
function ChevronGlyph({ up = false }: { up?: boolean }) {
  return (
    <svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true" focusable="false" className="block shrink-0">
      <path d={up ? "M2 8 L6 4 L10 8" : "M2 4 L6 8 L10 4"} />
    </svg>
  );
}

type TriggerProps = ComponentProps<typeof SelectPrimitive.Trigger>;

/** Square-edged field-like button; chevron is an inline svg glyph. */
function SelectTrigger({ className, children, ...props }: TriggerProps) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cnState(
        [
          "group/trigger flex w-full min-w-40 items-center justify-between gap-3 rounded-yorha border border-yorha-border bg-yorha-panel px-3 py-2",
          "font-yorha text-yorha-sm tracking-yorha-body text-yorha-fg",
          "focus-visible:yorha-focus",
          "data-[popup-open]:bg-yorha-control data-[popup-open]:text-yorha-on-control",
          "data-[disabled]:cursor-not-allowed data-[disabled]:text-yorha-fg-muted",
        ],
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon
        aria-hidden="true"
        className="inline-flex size-3 shrink-0 items-center justify-center transition-transform duration-(--motion-select) ease-yorha group-data-[popup-open]/trigger:rotate-180"
      >
        <ChevronGlyph />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

type ValueProps = ComponentProps<typeof SelectPrimitive.Value>;

function SelectValue({ className, ...props }: ValueProps) {
  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      className={cnState("truncate text-left data-[placeholder]:text-yorha-fg-soft group-data-[popup-open]/trigger:data-[placeholder]:text-yorha-on-control", className)}
      {...props}
    />
  );
}

type PositionerProps = ComponentProps<typeof SelectPrimitive.Positioner>;
type ContentProps = ComponentProps<typeof SelectPrimitive.Popup> &
  Pick<PositionerProps, "side" | "align" | "sideOffset" | "alignOffset" | "alignItemWithTrigger"> & {
    /** Portal mount node; defaults to document.body. */
    container?: ComponentProps<typeof SelectPrimitive.Portal>["container"];
    /** Render a SelectBackdrop (scrim) behind the popup. */
    backdrop?: boolean;
    /** Render a SelectArrow pointing at the trigger (not shown while `alignItemWithTrigger` overlaps it). */
    arrow?: boolean;
  };

/** Popup in a portal. Panel with thin border; rows wipe in dark on highlight. */
function SelectContent({
  className,
  children,
  side = "bottom",
  align = "start",
  sideOffset = 4,
  alignOffset,
  alignItemWithTrigger = false,
  container,
  backdrop = false,
  arrow = false,
  ...props
}: ContentProps) {
  return (
    <SelectPrimitive.Portal container={container}>
      {backdrop ? <SelectBackdrop /> : null}
      <SelectPrimitive.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        alignItemWithTrigger={alignItemWithTrigger}
        className="z-(--yorha-z-popover) outline-none"
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          data-yorha-select-popup=""
          className={cnState(
            [
              "relative flex max-h-(--available-height) min-w-(--anchor-width) flex-col overflow-hidden rounded-yorha border border-yorha-border bg-yorha-panel py-1 shadow-yorha-md",
              "font-yorha text-yorha-sm text-yorha-fg",
              "yorha-pop",
            ],
            className,
          )}
          {...props}
        >
          <SelectScrollUpArrow />
          <SelectPrimitive.List data-slot="select-list" className="min-h-0 flex-1 overflow-y-auto">
            {children}
          </SelectPrimitive.List>
          <SelectScrollDownArrow />
        </SelectPrimitive.Popup>
        {arrow ? <SelectArrow /> : null}
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

type ItemProps = ComponentProps<typeof SelectPrimitive.Item>;

/**
 * Row. Highlight (keyboard or pointer) wipes a dark fill left→right, flips text to on-ink,
 * shows the arrow cursor and the thin rules above/below. The square bullet is hollow normally
 * and filled when the item is the selected value; it uses currentColor so it inverts with the row.
 */
function SelectItem({ className, children, ...props }: ItemProps) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cnState(
        [
          "group/item relative mx-1 flex cursor-default items-center gap-3 py-2 pr-3 pl-7 select-none",
          // dark fill wipe: grows left→right via background-size
          "bg-[linear-gradient(var(--yorha-ink),var(--yorha-ink))] bg-left bg-no-repeat [background-size:0%_calc(100%_-_4px)]",
          "transition-[background-size,color] duration-(--motion-select) ease-yorha-out",
          "data-[highlighted]:text-yorha-on-ink data-[highlighted]:[background-size:100%_calc(100%_-_4px)]",
          // thin rules above/below the highlighted row (token --menu-rule)
          "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-(--menu-rule) before:bg-yorha-ink before:opacity-0 before:content-['']",
          "after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-(--menu-rule) after:bg-yorha-ink after:opacity-0 after:content-['']",
          "data-[highlighted]:before:opacity-100 data-[highlighted]:after:opacity-100",
          "data-[disabled]:cursor-not-allowed data-[disabled]:text-yorha-fg-muted",
          "focus-visible:yorha-focus",
        ],
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        data-yorha-cursor=""
        className="pointer-events-none absolute top-1/2 left-1 size-0 -translate-y-1/2 border-y-[0.3125rem] border-l-[0.4375rem] border-y-transparent border-l-current opacity-0 transition-opacity duration-(--motion-select) group-data-[highlighted]/item:opacity-100"
      />
      <span
        aria-hidden="true"
        data-yorha-bullet=""
        className="inline-block size-2 shrink-0 border border-current"
      >
        <SelectItemIndicator className="m-0 block size-full bg-current" />
      </span>
      <SelectPrimitive.ItemText className="flex-1 truncate">{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

const ARROW =
  "relative block h-1.5 w-3 overflow-clip " +
  "data-[side=bottom]:top-[-6px] data-[side=top]:bottom-[-6px] data-[side=top]:rotate-180 " +
  "data-[side=left]:right-[-9px] data-[side=left]:rotate-90 data-[side=right]:left-[-9px] data-[side=right]:-rotate-90 " +
  "before:absolute before:bottom-0 before:left-1/2 before:size-[calc(6px*1.4142)] before:border before:border-yorha-border " +
  "before:bg-yorha-panel before:content-[''] before:[transform:translate(-50%,50%)_rotate(45deg)]";

/** Pointer from the popup to the trigger. Not shown while the popup aligns over the trigger (`alignItemWithTrigger`). */
function SelectArrow({ className, ...props }: ComponentProps<typeof SelectPrimitive.Arrow>) {
  return <SelectPrimitive.Arrow data-slot="select-arrow" className={cnState(ARROW, className)} {...props} />;
}

/** Scrim behind the popup. Fades with `yorha-fade`. */
function SelectBackdrop({ className, ...props }: ComponentProps<typeof SelectPrimitive.Backdrop>) {
  return (
    <SelectPrimitive.Backdrop
      data-slot="select-backdrop"
      className={cnState("yorha-fade fixed inset-0 z-(--yorha-z-overlay) bg-yorha-scrim", className)}
      {...props}
    />
  );
}

/** Label for the whole select (names the trigger). Pair with `<Select>`; not the same as a group label. */
function SelectLabel({ className, ...props }: ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cnState("font-yorha-bold text-yorha-xs tracking-yorha-heading text-yorha-fg-soft uppercase", className)}
      {...props}
    />
  );
}

const SCROLL_ARROW =
  "absolute inset-x-0 z-1 flex h-5 w-full cursor-default items-center justify-center bg-yorha-panel text-yorha-fg " +
  "data-[direction=up]:top-0 data-[direction=down]:bottom-0 " +
  "[&:not([data-visible])]:hidden";

/** Appears at the top of a clipped list; hovering scrolls up. Decorative, keyboard navigation scrolls too. */
function SelectScrollUpArrow({ className, ...props }: ComponentProps<typeof SelectPrimitive.ScrollUpArrow>) {
  return (
    <SelectPrimitive.ScrollUpArrow aria-hidden="true" data-slot="select-scroll-up-arrow" className={cnState(SCROLL_ARROW, className)} {...props}>
      <ChevronGlyph up />
    </SelectPrimitive.ScrollUpArrow>
  );
}

/** Appears at the bottom of a clipped list; hovering scrolls down. */
function SelectScrollDownArrow({ className, ...props }: ComponentProps<typeof SelectPrimitive.ScrollDownArrow>) {
  return (
    <SelectPrimitive.ScrollDownArrow aria-hidden="true" data-slot="select-scroll-down-arrow" className={cnState(SCROLL_ARROW, className)} {...props}>
      <ChevronGlyph />
    </SelectPrimitive.ScrollDownArrow>
  );
}

/** Check mark slot of the selected item. SelectItem renders it itself; exported for custom rows. */
function SelectItemIndicator({ className, ...props }: ComponentProps<typeof SelectPrimitive.ItemIndicator>) {
  return (
    <SelectPrimitive.ItemIndicator
      data-slot="select-item-indicator"
      className={cnState("ml-auto text-current", className)}
      {...props}
    />
  );
}

function SelectGroup(props: ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />;
}

function SelectGroupLabel({ className, ...props }: ComponentProps<typeof SelectPrimitive.GroupLabel>) {
  return (
    <SelectPrimitive.GroupLabel
      data-slot="select-group-label"
      className={cnState(
        "mx-1 border-b border-yorha-separator px-3 py-1.5 text-yorha-xs font-yorha-bold tracking-yorha-heading text-yorha-fg-soft uppercase",
        className,
      )}
      {...props}
    />
  );
}

function SelectSeparator({ className, ...props }: ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cnState("mx-1 my-1 h-px bg-yorha-separator", className)}
      {...props}
    />
  );
}

export {
  Select,
  SelectArrow,
  SelectBackdrop,
  SelectItemIndicator,
  SelectLabel,
  SelectScrollDownArrow,
  SelectScrollUpArrow,
  SelectContent, SelectGroup, SelectGroupLabel, SelectItem, SelectSeparator, SelectTrigger, SelectValue };
