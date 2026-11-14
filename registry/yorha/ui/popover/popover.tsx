import { useRef, type ComponentProps, type Ref } from "react";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { buttonVariants } from "@/components/ui/button";
import { cnState } from "@/lib/utils";

/** Root: re-export of the Base UI Popover root (open, defaultOpen, onOpenChange, modal, ...). */
const Popover = PopoverPrimitive.Root;

type TriggerProps = ComponentProps<typeof PopoverPrimitive.Trigger>;

/**
 * Button that toggles the popup. Same recipe as Button (height, wipe, press); while open it holds the ink fill.
 * Keyboard: Enter/Space. Focus-visible ring is the YoRHa focus token.
 */
function PopoverTrigger({ className, ...props }: TriggerProps) {
  return (
    <PopoverPrimitive.Trigger
      data-slot="popover-trigger"
      className={cnState([buttonVariants(), "data-[popup-open]:bg-[length:100%_100%] data-[popup-open]:text-yorha-on-ink"], className)}
      {...props}
    />
  );
}

type PositionerProps = ComponentProps<typeof PopoverPrimitive.Positioner>;
type ContentProps = ComponentProps<typeof PopoverPrimitive.Popup> &
  Pick<PositionerProps, "side" | "align" | "sideOffset" | "alignOffset" | "collisionPadding" | "anchor"> & {
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
  anchor,
  container,
  backdrop = false,
  ref,
  ...props
}: ContentProps & { ref?: Ref<HTMLDivElement> }) {
  const popupRef = useRef<HTMLDivElement | null>(null);
  return (
    <PopoverPrimitive.Portal container={container}>
      {backdrop ? <PopoverBackdrop /> : null}
      <PopoverPrimitive.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        collisionPadding={collisionPadding}
        anchor={anchor}
        className="z-(--yorha-z-popover)"
      >
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          ref={(node) => {
            popupRef.current = node;
            if (typeof ref === "function") ref(node);
            else if (ref) ref.current = node;
          }}
          // Pointer and touch opens focus the popup itself (a close button must not take the ring); keyboard opens move to the first control.
          initialFocus={(type) => (type === "keyboard" ? true : popupRef.current)}
          className={cnState(
            [
              "yorha-surface yorha-scroll max-h-(--available-height) max-w-[min(20rem,var(--available-width))] min-w-56 p-4 outline-none focus-visible:yorha-focus",
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

// Popup scrims fade with the popover tokens (not the 400ms panel ones); `pointer-events-none` while ending so a click
// right after Esc reaches what is underneath instead of the fading scrim.
const SCRIM =
  "fixed inset-0 z-(--yorha-z-overlay) bg-yorha-scrim " +
  "[transition-property:opacity] [transition-duration:max(var(--motion-popover),var(--motion-reduced-fade))] [transition-timing-function:var(--yorha-ease-decelerate)] data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 data-[ending-style]:pointer-events-none data-[ending-style]:[transition-duration:max(var(--motion-popover-exit),var(--motion-reduced-fade))] data-[ending-style]:[transition-timing-function:var(--yorha-ease-in)]";

/** Scrim behind the popup (use with `modal`). Fades with `yorha-fade`. */
function PopoverBackdrop({ className, ...props }: ComponentProps<typeof PopoverPrimitive.Backdrop>) {
  return (
    <PopoverPrimitive.Backdrop
      data-slot="popover-backdrop"
      className={cnState(SCRIM, className)}
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

/** Closes the popup and returns focus to the trigger. A ghost Button sm. */
function PopoverClose({ className, ...props }: ComponentProps<typeof PopoverPrimitive.Close>) {
  return (
    <PopoverPrimitive.Close
      data-slot="popover-close"
      className={cnState([buttonVariants({ variant: "ghost", size: "sm" }), "mt-3"], className)}
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
