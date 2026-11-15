import { createContext, useContext, useEffect, useRef, useState, type ComponentProps } from "react";
import { Select as SelectPrimitive } from "@base-ui/react/select";
import { ChevronIcon, TriangleIcon } from "@/components/ui/icons";
import { Glyph } from "@/components/ui/glyph";
import { cnState } from "@/lib/utils";

const SelectContext = createContext<{ clearable: boolean; required: boolean; clear: () => void; reset: () => void }>({
  clearable: false,
  required: false,
  clear: () => {},
  reset: () => {},
});

/**
 * Root: Base UI Select root (value, items, onValueChange, disabled, name, required, ...) plus:
 * - `clearable`: Backspace / Delete on the closed trigger sets the value to null (`[]` with `multiple`); ignored when `required`.
 * - Form reset: an uncontrolled select goes back to its `defaultValue` when the owning form resets (Base UI alone leaves the chosen value).
 */
function Select<Value, Multiple extends boolean | undefined = false>({
  clearable = false,
  value: valueProp,
  defaultValue,
  onValueChange,
  ...props
}: SelectPrimitive.Root.Props<Value, Multiple> & { clearable?: boolean }) {
  const empty = (props.multiple ? [] : null) as unknown;
  const [inner, setInner] = useState<unknown>(defaultValue ?? empty);
  const value = valueProp !== undefined ? valueProp : inner;
  const change = (next: unknown, details?: never) => {
    setInner(next);
    (onValueChange as ((v: unknown, d?: never) => void) | undefined)?.(next, details);
  };
  const ctx = {
    clearable,
    required: Boolean(props.required),
    clear: () => change(empty),
    // Controlled selects (`value` prop) are reset by their owner's state, not here.
    reset: () => valueProp === undefined && setInner(defaultValue ?? empty),
  };
  return (
    <SelectContext value={ctx}>
      <SelectPrimitive.Root {...(props as object)} value={value as never} onValueChange={change as never} />
    </SelectContext>
  );
}

type TriggerProps = ComponentProps<typeof SelectPrimitive.Trigger>;

/**
 * Square-edged field-like button; chevron is an inline svg glyph.
 * Migration (C2-302/303): the trigger is a field, not a button: inset field fill (`bg-yorha-bg`, same as Input)
 * and body-size text (`text-yorha-base`, same as Input) instead of the raised panel fill and 14px. The open state
 * still inverts to the control fill. Pass `className` to restore the old look.
 */
function SelectTrigger({ className, children, onKeyDown, ref, ...props }: TriggerProps) {
  const { clearable, required, clear, reset } = useContext(SelectContext);
  const own = useRef<HTMLButtonElement | null>(null);
  const resetRef = useRef(reset);
  resetRef.current = reset;
  useEffect(() => {
    const form = own.current?.closest("form");
    if (!form) return;
    const onReset = () => resetRef.current();
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, []);
  return (
    <SelectPrimitive.Trigger
      ref={(el: HTMLButtonElement | null) => {
        own.current = el;
        if (typeof ref === "function") ref(el);
        else if (ref) (ref as { current: HTMLButtonElement | null }).current = el;
      }}
      onKeyDown={(event) => {
        if (clearable && !required && (event.key === "Backspace" || event.key === "Delete") && event.currentTarget.getAttribute("aria-expanded") !== "true") {
          event.preventBaseUIHandler();
          event.preventDefault();
          clear();
          return;
        }
        onKeyDown?.(event);
      }}
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

// Pixel arrow: one 12px triangle glyph per side (crispEdges, no rotation), stacked in one 12px box and shown by the Base UI arrow's `data-side`.
const ARROW =
  "group/arrow block size-3 text-yorha-border data-[side=bottom]:top-[-8px] data-[side=top]:bottom-[-8px] data-[side=left]:right-[-8px] data-[side=right]:left-[-8px]";

/** Pointer from the popup to the trigger (pixel triangle per side, never rotated). Not shown while the popup aligns over the trigger (`alignItemWithTrigger`). */
function SelectArrow({ className, ...props }: ComponentProps<typeof SelectPrimitive.Arrow>) {
  return (
    <SelectPrimitive.Arrow data-slot="select-arrow" className={cnState(ARROW, className)} {...props}>
      <Glyph name="triangle-up" className="absolute inset-0 opacity-0 group-data-[side=bottom]/arrow:opacity-100" />
      <Glyph name="triangle-down" className="absolute inset-0 opacity-0 group-data-[side=top]/arrow:opacity-100" />
      <Glyph name="triangle-right" className="absolute inset-0 opacity-0 group-data-[side=left]/arrow:opacity-100" />
      <Glyph name="triangle-left" className="absolute inset-0 opacity-0 group-data-[side=right]/arrow:opacity-100" />
    </SelectPrimitive.Arrow>
  );
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
