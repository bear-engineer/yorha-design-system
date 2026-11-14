import type { ComponentProps } from "react";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { cnState } from "@/lib/utils";

/** Root: re-export of the Base UI Popover root (open, defaultOpen, onOpenChange, modal, ...). */
const Popover = PopoverPrimitive.Root;

type TriggerProps = ComponentProps<typeof PopoverPrimitive.Trigger>;

/** Button that toggles the popup. Keyboard: Enter/Space. Focus-visible ring is the YoRHa focus token. */
function PopoverTrigger({ className, ...props }: TriggerProps) {
  return (
    <PopoverPrimitive.Trigger
      data-slot="popover-trigger"
      className={cnState(
        [
          "cursor-pointer rounded-yorha border border-yorha-border bg-yorha-panel px-3 py-2",
          "font-yorha text-yorha-sm tracking-yorha-body text-yorha-fg",
          "focus-visible:yorha-focus",
          "data-[popup-open]:bg-yorha-control data-[popup-open]:text-yorha-on-control",
        ],
        className,
      )}
      {...props}
    />
  );
}

type PositionerProps = ComponentProps<typeof PopoverPrimitive.Positioner>;
type ContentProps = ComponentProps<typeof PopoverPrimitive.Popup> &
  Pick<PositionerProps, "side" | "align" | "sideOffset" | "alignOffset" | "collisionPadding"> & {
    /** Portal mount node; defaults to document.body. */
    container?: ComponentProps<typeof PopoverPrimitive.Portal>["container"];
  };

/**
 * Popup in a portal. Positioning is Base UI's (Positioner + floating-ui), not CSS anchor positioning.
 * Escape and outside press dismiss; focus returns to the trigger.
 */
function PopoverContent({
  className,
  side = "bottom",
  align = "start",
  sideOffset = 8,
  alignOffset,
  collisionPadding = 8,
  container,
  ...props
}: ContentProps) {
  return (
    <PopoverPrimitive.Portal container={container}>
      <PopoverPrimitive.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        collisionPadding={collisionPadding}
        className="z-(--yorha-z-popover) outline-none"
      >
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          className={cnState(
            [
              "max-w-80 min-w-56 rounded-yorha border border-yorha-border bg-yorha-panel p-4 text-yorha-fg shadow-yorha-md",
              "font-yorha text-yorha-sm tracking-yorha-body",
              "origin-(--transform-origin) transition-[opacity,translate] duration-(--motion-panel) ease-yorha-out",
              "data-[starting-style]:-translate-y-1 data-[starting-style]:opacity-0",
              "data-[ending-style]:translate-y-0 data-[ending-style]:opacity-0 data-[ending-style]:duration-(--motion-select) data-[ending-style]:ease-yorha-in",
            ],
            className,
          )}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}

/** Heading, linked to the popup as its accessible name. Uppercase, widely tracked. */
function PopoverTitle({ className, ...props }: ComponentProps<typeof PopoverPrimitive.Title>) {
  return (
    <PopoverPrimitive.Title
      data-slot="popover-title"
      className={cnState("mb-2 font-yorha-bold text-yorha-sm tracking-yorha-heading uppercase", className)}
      {...props}
    />
  );
}

/** Body text, linked to the popup as its accessible description. */
function PopoverDescription({ className, ...props }: ComponentProps<typeof PopoverPrimitive.Description>) {
  return (
    <PopoverPrimitive.Description
      data-slot="popover-description"
      className={cnState("text-yorha-fg-soft", className)}
      {...props}
    />
  );
}

/** Closes the popup and returns focus to the trigger. */
function PopoverClose({ className, ...props }: ComponentProps<typeof PopoverPrimitive.Close>) {
  return (
    <PopoverPrimitive.Close
      data-slot="popover-close"
      className={cnState(
        [
          "mt-3 cursor-pointer rounded-yorha border border-yorha-border px-3 py-1 font-yorha text-yorha-sm text-yorha-fg",
          "hover:bg-yorha-ink hover:text-yorha-on-ink focus-visible:yorha-focus",
        ],
        className,
      )}
      {...props}
    />
  );
}

export { Popover, PopoverTrigger, PopoverContent, PopoverTitle, PopoverDescription, PopoverClose };
