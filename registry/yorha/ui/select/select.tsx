import type { ComponentProps } from "react";
import { Select as SelectPrimitive } from "@base-ui/react/select";
import { ChevronIcon, TriangleIcon } from "@/components/ui/icons";
import { cnState } from "@/lib/utils";

/** Root: re-export of the Base UI Select root (value, items, onValueChange, disabled, ...). */
const Select = SelectPrimitive.Root;

type TriggerProps = ComponentProps<typeof SelectPrimitive.Trigger>;

/**
 * Square-edged field-like button; chevron is an inline svg glyph.
 * Migration (C2-302/303): the trigger is a field, not a button: inset field fill (`bg-yorha-bg`, same as Input)
 * and body-size text (`text-yorha-base`, same as Input) instead of the raised panel fill and 14px. The open state
 * still inverts to the control fill. Pass `className` to restore the old look.
 */
function SelectTrigger({ className, children, ...props }: TriggerProps) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cnState(
        [
          "group/trigger flex h-control-md w-full min-w-40 items-center justify-between gap-3 rounded-yorha border border-yorha-border bg-yorha-bg px-pad-md",
          "font-yorha text-yorha-base tracking-yorha-body text-yorha-fg-strong",
          "focus-visible:yorha-focus",
          "data-[popup-open]:bg-yorha-control data-[popup-open]:text-yorha-on-control",
          "yorha-disabled",
        ],
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon
        aria-hidden="true"
        className="grid size-icon-sm shrink-0 place-items-center transition-transform duration-(--motion-select) ease-yorha group-data-[popup-open]/trigger:rotate-180"
      >
        <ChevronIcon dir="down" />
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
  sideOffset = 8,
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
          <SelectPrimitive.List data-slot="select-list" className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
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
 * Row (`yorha-row`, G8): full-bleed ink fill wipes in on highlight and drops at once, no ring. Cursor gutter, a
 * 20px indicator slot holding the hollow bullet (filled square for the selected value), then the label.
 */
function SelectItem({ className, children, ...props }: ItemProps) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cnState(["group/item yorha-row cursor-default text-yorha-sm tracking-yorha-body"], className)}
      {...props}
    >
      <TriangleIcon data-yorha-cursor="" className="size-icon-sm opacity-0 group-data-[highlighted]/item:opacity-100" />
      <span data-slot="row-indicator" className="grid size-indicator shrink-0 place-items-center">
        <span aria-hidden="true" data-yorha-bullet="" className="block size-bullet overflow-clip border border-current">
          <SelectItemIndicator className="m-0 block size-full bg-current" />
        </span>
      </span>
      <SelectPrimitive.ItemText className="min-w-0 flex-1 truncate">{children}</SelectPrimitive.ItemText>
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

// Popup scrims fade with the popover tokens (not the 400ms panel ones); `pointer-events-none` while ending so a click
// right after Esc reaches what is underneath instead of the fading scrim.
const SCRIM =
  "fixed inset-0 z-(--yorha-z-overlay) bg-yorha-scrim " +
  "[transition-property:opacity] [transition-duration:max(var(--motion-popover),var(--motion-reduced-fade))] [transition-timing-function:var(--yorha-ease-decelerate)] data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 data-[ending-style]:pointer-events-none data-[ending-style]:[transition-duration:max(var(--motion-popover-exit),var(--motion-reduced-fade))] data-[ending-style]:[transition-timing-function:var(--yorha-ease-in)]";

/** Scrim behind the popup. Fades with `yorha-fade`. */
function SelectBackdrop({ className, ...props }: ComponentProps<typeof SelectPrimitive.Backdrop>) {
  return (
    <SelectPrimitive.Backdrop
      data-slot="select-backdrop"
      className={cnState(SCRIM, className)}
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
      <ChevronIcon dir="up" />
    </SelectPrimitive.ScrollUpArrow>
  );
}

/** Appears at the bottom of a clipped list; hovering scrolls down. */
function SelectScrollDownArrow({ className, ...props }: ComponentProps<typeof SelectPrimitive.ScrollDownArrow>) {
  return (
    <SelectPrimitive.ScrollDownArrow aria-hidden="true" data-slot="select-scroll-down-arrow" className={cnState(SCROLL_ARROW, className)} {...props}>
      <ChevronIcon dir="down" />
    </SelectPrimitive.ScrollDownArrow>
  );
}

/** Check mark slot of the selected item. SelectItem renders it itself; exported for custom rows. */
function SelectItemIndicator({ className, children = null, ...props }: ComponentProps<typeof SelectPrimitive.ItemIndicator>) {
  // Base UI fills the indicator with an emoji check by default; the indicator is drawn by CSS only (B12).
  return (
    <SelectPrimitive.ItemIndicator data-slot="select-item-indicator" className={cnState("ml-auto text-current", className)} {...props}>
      {children}
    </SelectPrimitive.ItemIndicator>
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
        "px-2 py-1.5 text-yorha-xs font-yorha-bold tracking-yorha-heading text-yorha-fg-soft uppercase",
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
      className={cnState("my-1 h-px bg-yorha-separator", className)}
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
