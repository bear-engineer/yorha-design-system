import { createContext, useContext, useId, useState, type ComponentProps } from "react";
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { cnState } from "@/lib/utils";

interface TooltipState {
  id: string;
  open: boolean;
}

const TooltipContext = createContext<TooltipState | null>(null);

function useTooltipState(): TooltipState {
  const ctx = useContext(TooltipContext);
  if (!ctx) throw new Error("TooltipTrigger and TooltipContent must be used inside <Tooltip>");
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

function TooltipTrigger({ className, ...props }: TriggerProps) {
  const { id, open } = useTooltipState();
  return (
    <TooltipPrimitive.Trigger
      data-slot="tooltip-trigger"
      aria-describedby={open ? id : undefined}
      className={cnState(
        [
          "cursor-pointer rounded-yorha border border-yorha-border bg-yorha-panel px-3 py-2",
          "font-yorha text-yorha-sm tracking-yorha-body text-yorha-fg",
          "focus-visible:yorha-focus",
        ],
        className,
      )}
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
  sideOffset = 6,
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
        className="z-(--yorha-z-tooltip) outline-none"
      >
        <TooltipPrimitive.Popup
          id={id}
          role="tooltip"
          data-slot="tooltip-content"
          className={cnState(
            [
              "max-w-72 rounded-yorha bg-yorha-ink px-2 py-1 font-yorha text-yorha-xs tracking-yorha-body text-yorha-on-ink shadow-yorha-sm",
              "origin-(--transform-origin) transition-[opacity,translate] duration-(--motion-select) ease-yorha-out",
              "data-[starting-style]:opacity-0",
              "data-[ending-style]:opacity-0 data-[ending-style]:duration-(--motion-select) data-[ending-style]:ease-yorha-in",
            ],
            className,
          )}
          {...props}
        />
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent };
