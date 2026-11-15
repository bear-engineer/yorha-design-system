import { createContext, useContext, useId, useState, type ComponentProps } from "react";
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { buttonVariants } from "@/components/ui/button";
import { Glyph } from "@/components/ui/glyph";
import { cn, cnState } from "@/lib/utils";

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
              "yorha-fade [--motion-panel:var(--motion-popover)] [--motion-panel-exit:var(--motion-popover-exit)]",
            ],
            className,
          )}
          {...props}
        />
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}

// Pixel arrow: one 12px triangle glyph per side (crispEdges, no rotation), stacked in one 12px box and shown by the Base UI arrow's `data-side`.
// The glyph's base row sits 1px over the popup edge so it merges with the border; `text-*` picks the fill.
function ArrowGlyphs() {
  return (
    <>
      <Glyph name="triangle-up" className="absolute inset-0 opacity-0 group-data-[side=bottom]/arrow:opacity-100" />
      <Glyph name="triangle-down" className="absolute inset-0 opacity-0 group-data-[side=top]/arrow:opacity-100" />
      <Glyph name="triangle-right" className="absolute inset-0 opacity-0 group-data-[side=left]/arrow:opacity-100" />
      <Glyph name="triangle-left" className="absolute inset-0 opacity-0 group-data-[side=right]/arrow:opacity-100" />
    </>
  );
}
const ARROW_POS =
  "group/arrow block size-3 data-[side=bottom]:top-[-8px] data-[side=top]:bottom-[-8px] data-[side=left]:right-[-8px] data-[side=right]:left-[-8px]";

const ARROW = ARROW_POS + " text-yorha-ink";

/** Pointer from the tooltip to its trigger. Render it inside TooltipContent. */
function TooltipArrow({ className, ...props }: ComponentProps<typeof TooltipPrimitive.Arrow>) {
  return <TooltipPrimitive.Arrow data-slot="tooltip-arrow" className={cnState(ARROW, className)} {...props}>
      <ArrowGlyphs />
    </TooltipPrimitive.Arrow>;
}

/**
 * Keyboard shortcut slot inside TooltipContent: `<TooltipContent>Save <TooltipKbd>⌘S</TooltipKbd></TooltipContent>`.
 * A tooltip is never the only label of a control, and touch devices show none; do not put information here that exists nowhere else.
 */
function TooltipKbd({ className, ...props }: ComponentProps<"kbd">) {
  return <kbd data-slot="tooltip-kbd" className={cn("ml-2 inline-block border border-yorha-on-ink-soft px-1 font-yorha text-yorha-xs", className)} {...props} />;
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
  TooltipKbd,
  TooltipViewport,
  TooltipProvider,
  createTooltipHandle,
};
export type { TooltipHandle };
