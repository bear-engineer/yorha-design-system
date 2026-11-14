import { createContext, useContext, useId, useState, type ComponentProps } from "react";
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { buttonVariants } from "@/components/ui/button";
import { cnState } from "@/lib/utils";

interface TooltipState {
  id: string;
  open: boolean;
}

const TooltipContext = createContext<TooltipState | null>(null);

function useTooltipState(): TooltipState {
  const ctx = useContext(TooltipContext);
  if (!ctx) throw new Error("TooltipContent must be used inside <Tooltip>");
  return ctx;
}

type RootProps = ComponentProps<typeof TooltipPrimitive.Root>;

/**
 * Root on Base UI Tooltip. Opens on hover and on keyboard focus; Escape dismisses (WCAG 1.4.13).
 * Base UI does not link the trigger to the popup, so this wrapper sets `aria-describedby` on the
 * trigger while the tooltip is open. The popup text is therefore the trigger's accessible description.
 */
function Tooltip({ open, defaultOpen = false, onOpenChange, ...props }: RootProps) {
  const id = useId();
  const [internal, setInternal] = useState(defaultOpen);
  const isOpen = open ?? internal;
  const state: TooltipState = { id, open: isOpen };
  return (
    <TooltipContext.Provider value={state}>
      <TooltipPrimitive.Root
        open={isOpen}
        onOpenChange={(next, ...rest) => {
          if (open === undefined) setInternal(next);
          onOpenChange?.(next, ...rest);
        }}
        {...props}
      />
    </TooltipContext.Provider>
  );
}

type TriggerProps = ComponentProps<typeof TooltipPrimitive.Trigger>;

/**
 * Inside `<Tooltip>` the trigger gets `aria-describedby` while open. A trigger outside `<Tooltip>`
 * (linked with a `handle`) cannot see the root: give it its own `aria-describedby` if it needs one.
 */
function TooltipTrigger({ className, ...props }: TriggerProps) {
  const ctx = useContext(TooltipContext);
  if (!ctx && !props.handle) throw new Error("TooltipTrigger must be used inside <Tooltip> or get a `handle`");
  return (
    <TooltipPrimitive.Trigger
      data-slot="tooltip-trigger"
      aria-describedby={ctx?.open ? ctx.id : undefined}
      className={cnState(buttonVariants(), className)}
      {...props}
    />
  );
}

type PositionerProps = ComponentProps<typeof TooltipPrimitive.Positioner>;
type ContentProps = ComponentProps<typeof TooltipPrimitive.Popup> &
  Pick<PositionerProps, "side" | "align" | "sideOffset" | "alignOffset" | "collisionPadding"> & {
    /** Portal mount node; defaults to document.body. */
    container?: ComponentProps<typeof TooltipPrimitive.Portal>["container"];
  };

/** Popup in a portal, positioned by Base UI. Dark ink chip so it reads above any panel. */
function TooltipContent({
  className,
  side = "top",
  align = "center",
  sideOffset = 8,
  alignOffset,
  collisionPadding = 8,
  container,
  ...props
}: ContentProps) {
  const { id } = useTooltipState();
  return (
    <TooltipPrimitive.Portal container={container}>
      <TooltipPrimitive.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        collisionPadding={collisionPadding}
        className="z-(--yorha-z-tooltip)"
      >
        <TooltipPrimitive.Popup
          id={id}
          role="tooltip"
          data-slot="tooltip-content"
          className={cnState(
            [
              "max-w-72 rounded-yorha bg-yorha-ink px-2 py-1 font-yorha text-yorha-xs tracking-yorha-body text-yorha-on-ink shadow-yorha-sm",
              "yorha-pop",
            ],
            className,
          )}
          {...props}
        />
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}

const ARROW =
  "relative block h-1.5 w-3 overflow-clip " +
  "data-[side=bottom]:top-[-6px] data-[side=top]:bottom-[-6px] data-[side=top]:rotate-180 " +
  "data-[side=left]:right-[-9px] data-[side=left]:rotate-90 data-[side=right]:left-[-9px] data-[side=right]:-rotate-90 " +
  "before:absolute before:bottom-0 before:left-1/2 before:size-[calc(6px*1.4142)] before:bg-yorha-ink " +
  "before:content-[''] before:[transform:translate(-50%,50%)_rotate(45deg)]";

/** Pointer from the tooltip to its trigger. Render it inside TooltipContent. */
function TooltipArrow({ className, ...props }: ComponentProps<typeof TooltipPrimitive.Arrow>) {
  return <TooltipPrimitive.Arrow data-slot="tooltip-arrow" className={cnState(ARROW, className)} {...props} />;
}

/** Wrap the content of a tooltip with several triggers (one handle) so it cross-fades between them. */
function TooltipViewport({ className, ...props }: ComponentProps<typeof TooltipPrimitive.Viewport>) {
  return (
    <TooltipPrimitive.Viewport
      data-slot="tooltip-viewport"
      className={cnState(
        "relative h-full w-full overflow-clip [&_[data-current]]:yorha-fade [&_[data-previous]]:yorha-fade",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Shares open delay and skip-delay between tooltips: wrap a toolbar or page region once.
 * `delay` / `closeDelay` are milliseconds.
 */
const TooltipProvider = TooltipPrimitive.Provider;

/** Handle for a trigger placed outside `<Tooltip>`: pass the same handle to TooltipTrigger and Tooltip. */
const createTooltipHandle = TooltipPrimitive.createHandle;
type TooltipHandle<Payload = unknown> = TooltipPrimitive.Handle<Payload>;

export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipArrow,
  TooltipViewport,
  TooltipProvider,
  createTooltipHandle,
};
export type { TooltipHandle };
