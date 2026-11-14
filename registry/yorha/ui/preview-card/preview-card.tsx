import type { ComponentProps } from "react";
import { PreviewCard as PreviewCardPrimitive } from "@base-ui/react/preview-card";
import { cn, cnState } from "@/lib/utils";

/**
 * Class strings shared by the parts and static previews (one definition).
 * Motion: popup = `yorha-pop` (T3 utility, scale+opacity from --transform-origin; opacity-only under reduced, none under off).
 */
export const previewCardStyles = {
  trigger:
    "cursor-pointer text-yorha-fg underline decoration-dotted underline-offset-4 focus-visible:yorha-focus " +
    "data-[popup-open]:bg-yorha-ink data-[popup-open]:text-yorha-on-ink",
  popup:
    "yorha-pop max-w-80 min-w-56 rounded-yorha border border-yorha-border bg-yorha-panel p-4 text-yorha-fg shadow-yorha-md " +
    "font-yorha text-yorha-sm tracking-yorha-body",
  title: "mb-2 font-yorha-bold text-yorha-sm tracking-yorha-heading uppercase",
  description: "text-yorha-fg-soft",
  arrow:
    "size-2.5 rotate-45 border-yorha-border bg-yorha-panel " +
    "data-[side=bottom]:top-[-6px] data-[side=bottom]:border-t data-[side=bottom]:border-l " +
    "data-[side=top]:bottom-[-6px] data-[side=top]:border-r data-[side=top]:border-b " +
    "data-[side=left]:right-[-6px] data-[side=left]:border-t data-[side=left]:border-r " +
    "data-[side=right]:left-[-6px] data-[side=right]:border-b data-[side=right]:border-l",
};

/** Root: Base UI PreviewCard root (open, defaultOpen, onOpenChange, handle, ...). */
const PreviewCard = PreviewCardPrimitive.Root;

/** Handle for triggers placed outside `<PreviewCard>` (several triggers, one card): pass the same handle to each trigger and the root. */
const createPreviewCardHandle = PreviewCardPrimitive.createHandle;
type PreviewCardHandle<Payload = unknown> = PreviewCardPrimitive.Handle<Payload>;

/**
 * Link that opens the card on hover (after `delay`, default 600ms) and on keyboard focus; closes after `closeDelay`
 * (default 300ms) or Escape. Renders an `<a>`; pass `href`.
 */
function PreviewCardTrigger({ className, ...props }: ComponentProps<typeof PreviewCardPrimitive.Trigger>) {
  return <PreviewCardPrimitive.Trigger data-slot="preview-card-trigger" className={cnState(previewCardStyles.trigger, className)} {...props} />;
}

type PositionerProps = ComponentProps<typeof PreviewCardPrimitive.Positioner>;
type ContentProps = ComponentProps<typeof PreviewCardPrimitive.Popup> &
  Pick<PositionerProps, "side" | "align" | "sideOffset" | "alignOffset" | "collisionPadding"> & {
    /** Render the pointing arrow. Default true. */
    arrow?: boolean;
    /** Render a (non-blocking) Base UI Backdrop behind the card. Default false. */
    backdrop?: boolean;
    /** Wrap children in Base UI's Viewport so content swaps between triggers can be animated. Default false. */
    viewport?: boolean;
    /** Portal mount node; defaults to document.body. */
    container?: ComponentProps<typeof PreviewCardPrimitive.Portal>["container"];
  };

/** Card in a portal, positioned by Base UI (Positioner + floating-ui). */
function PreviewCardContent({
  className,
  children,
  side = "bottom",
  align = "center",
  sideOffset = 8,
  alignOffset,
  collisionPadding = 8,
  arrow = true,
  backdrop = false,
  viewport = false,
  container,
  ...props
}: ContentProps) {
  return (
    <PreviewCardPrimitive.Portal container={container}>
      {backdrop && <PreviewCardPrimitive.Backdrop className="pointer-events-none fixed inset-0 z-(--yorha-z-popover)" />}
      <PreviewCardPrimitive.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        collisionPadding={collisionPadding}
        className="z-(--yorha-z-popover) outline-none"
      >
        <PreviewCardPrimitive.Popup data-slot="preview-card-content" className={cnState(previewCardStyles.popup, className)} {...props}>
          {arrow && <PreviewCardPrimitive.Arrow data-slot="preview-card-arrow" aria-hidden="true" className={previewCardStyles.arrow} />}
          {viewport ? <PreviewCardPrimitive.Viewport data-slot="preview-card-viewport">{children}</PreviewCardPrimitive.Viewport> : children}
        </PreviewCardPrimitive.Popup>
      </PreviewCardPrimitive.Positioner>
    </PreviewCardPrimitive.Portal>
  );
}

/** Heading inside the card (a paragraph: a preview card is not a dialog and has no title part). */
function PreviewCardTitle({ className, ...props }: ComponentProps<"p">) {
  return <p data-slot="preview-card-title" className={cn(previewCardStyles.title, className)} {...props} />;
}

/** Body text inside the card. */
function PreviewCardDescription({ className, ...props }: ComponentProps<"p">) {
  return <p data-slot="preview-card-description" className={cn(previewCardStyles.description, className)} {...props} />;
}

export { PreviewCard, PreviewCardTrigger, PreviewCardContent, PreviewCardTitle, PreviewCardDescription, createPreviewCardHandle };
export type { PreviewCardHandle };
