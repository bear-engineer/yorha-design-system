import type { ComponentProps } from "react";
import { Select as SelectPrimitive } from "@base-ui/react/select";
import { cnState } from "@/lib/utils";

/** Root: re-export of the Base UI Select root (value, items, onValueChange, disabled, ...). */
const Select = SelectPrimitive.Root;

type TriggerProps = ComponentProps<typeof SelectPrimitive.Trigger>;

/** Square-edged field-like button; chevron is a CSS-drawn decorative glyph. */
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
        className="inline-block size-2 shrink-0 -translate-y-px rotate-45 border-r-2 border-b-2 border-current transition-transform duration-(--motion-select) group-data-[popup-open]/trigger:translate-y-px group-data-[popup-open]/trigger:rotate-[225deg]"
      />
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
  ...props
}: ContentProps) {
  return (
    <SelectPrimitive.Portal container={container}>
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
              "max-h-(--available-height) min-w-(--anchor-width) overflow-y-auto rounded-yorha border border-yorha-border bg-yorha-panel py-1 shadow-yorha-md",
              "font-yorha text-yorha-sm text-yorha-fg",
              "origin-top transition-[opacity,translate] duration-(--motion-select) ease-yorha-out",
              "data-[starting-style]:-translate-y-1 data-[starting-style]:opacity-0",
              "data-[ending-style]:translate-y-0 data-[ending-style]:opacity-0 data-[ending-style]:duration-(--motion-select-exit) data-[ending-style]:ease-yorha-in",
            ],
            className,
          )}
          {...props}
        >
          <SelectPrimitive.List data-slot="select-list">{children}</SelectPrimitive.List>
        </SelectPrimitive.Popup>
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
        className="inline-block size-2 shrink-0 border border-current group-data-[selected]/item:bg-current"
      />
      <SelectPrimitive.ItemText className="flex-1 truncate">{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
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

export { Select, SelectContent, SelectGroup, SelectGroupLabel, SelectItem, SelectSeparator, SelectTrigger, SelectValue };
