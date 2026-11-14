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
    /** Render a PopoverBackdrop (scrim) behind the popup. Use with `modal` on the root. */
    backdrop?: boolean;
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
  backdrop = false,
  ...props
}: ContentProps) {
  return (
    <PopoverPrimitive.Portal container={container}>
      {backdrop ? <PopoverBackdrop /> : null}
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
              "yorha-pop",
            ],
            className,
          )}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}

const ARROW =
  "relative block h-1.5 w-3 overflow-clip " +
  "data-[side=bottom]:top-[-6px] data-[side=top]:bottom-[-6px] data-[side=top]:rotate-180 " +
  "data-[side=left]:right-[-9px] data-[side=left]:rotate-90 data-[side=right]:left-[-9px] data-[side=right]:-rotate-90 " +
  "before:absolute before:bottom-0 before:left-1/2 before:size-[calc(6px*1.4142)] before:border before:border-yorha-border " +
  "before:bg-yorha-panel before:content-[''] before:[transform:translate(-50%,50%)_rotate(45deg)]";

/** Pointer from the popup to its trigger. Render it inside PopoverContent; it follows the popup side. */
function PopoverArrow({ className, ...props }: ComponentProps<typeof PopoverPrimitive.Arrow>) {
  return <PopoverPrimitive.Arrow data-slot="popover-arrow" className={cnState(ARROW, className)} {...props} />;
}

/** Scrim behind the popup (use with `modal`). Fades with `yorha-fade`. */
function PopoverBackdrop({ className, ...props }: ComponentProps<typeof PopoverPrimitive.Backdrop>) {
  return (
    <PopoverPrimitive.Backdrop
      data-slot="popover-backdrop"
      className={cnState("yorha-fade fixed inset-0 z-(--yorha-z-overlay) bg-yorha-scrim", className)}
      {...props}
    />
  );
}

/**
 * Wrap the popup content of a popover with several triggers (one handle) to cross-fade it when the
 * active trigger changes. Base UI marks the outgoing content `data-previous`, the incoming `data-current`.
 */
function PopoverViewport({ className, ...props }: ComponentProps<typeof PopoverPrimitive.Viewport>) {
  return (
    <PopoverPrimitive.Viewport
      data-slot="popover-viewport"
      className={cnState(
        [
          "relative h-full w-full overflow-clip",
          "[&_[data-current]]:yorha-fade [&_[data-current]]:w-[calc(var(--popup-width)-2rem)]",
          "[&_[data-previous]]:yorha-fade [&_[data-previous]]:w-[calc(var(--popup-width)-2rem)]",
        ],
        className,
      )}
      {...props}
    />
  );
}

/** Handle for a trigger placed outside `<Popover>`: pass the same handle to PopoverTrigger and Popover. */
const createPopoverHandle = PopoverPrimitive.createHandle;
type PopoverHandle<Payload = unknown> = PopoverPrimitive.Handle<Payload>;

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

export {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverTitle,
  PopoverDescription,
  PopoverClose,
  PopoverArrow,
  PopoverBackdrop,
  PopoverViewport,
  createPopoverHandle,
};
export type { PopoverHandle };
