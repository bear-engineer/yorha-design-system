import { useEffect, useRef, type ComponentProps } from "react";
import { PreviewCard as PreviewCardPrimitive } from "@base-ui/react/preview-card";
import { Glyph } from "@/components/ui/glyph";
import { cn, cnState } from "@/lib/utils";

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

/**
 * Class strings shared by the parts and static previews (one definition).
 * Motion: popup = `yorha-pop` (T3 utility, scale+opacity from --transform-origin; opacity-only under reduced, none under off).
 */
export const previewCardStyles = {
  trigger:
    "cursor-pointer text-yorha-fg underline decoration-dotted underline-offset-4 focus-visible:yorha-focus " +
    "-mx-1 px-1 box-decoration-clone data-[popup-open]:bg-yorha-ink data-[popup-open]:text-yorha-on-ink data-[popup-open]:decoration-transparent",
  popup:
    "yorha-pop max-w-[min(20rem,calc(100vw-1rem))] min-w-56 rounded-yorha border border-yorha-border bg-yorha-panel p-4 text-yorha-fg shadow-yorha-md " +
    "font-yorha text-yorha-sm tracking-yorha-body",
  title: "mb-2 font-yorha-bold text-yorha-sm tracking-yorha-heading uppercase",
  description: "text-yorha-fg-soft",
  arrow: ARROW_POS + " text-yorha-border",
};

/**
 * Root: Base UI PreviewCard root (open, defaultOpen, onOpenChange, handle, ...).
 * A touch tap follows the link and opens no card: browsers replay hover after a tap, which would otherwise open the card
 * under the finger and make the user tap twice to navigate (double-tap links are a known annoyance). The card stays reachable
 * by keyboard focus and by mouse hover. Opens in the 1s after a touch pointerdown that come from hover are cancelled.
 */
function PreviewCard<Payload = unknown>({ onOpenChange, ...props }: PreviewCardPrimitive.Root.Props<Payload>) {
  const lastTouch = useRef(Number.NEGATIVE_INFINITY);
  useEffect(() => {
    const down = (e: PointerEvent) => {
      if (e.pointerType === "touch") lastTouch.current = performance.now();
    };
    document.addEventListener("pointerdown", down, true);
    return () => document.removeEventListener("pointerdown", down, true);
  }, []);
  return (
    <PreviewCardPrimitive.Root<Payload>
      {...props}
      onOpenChange={(open, details) => {
        if (open && details.reason === "trigger-hover" && performance.now() - lastTouch.current < 1000) {
          details.cancel();
          return;
        }
        onOpenChange?.(open, details);
      }}
    />
  );
}

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

/** Card in a portal, positioned by Base UI (Positioner + floating-ui).  *
 * Migration (v3): trigger gets `-mx-1 px-1 box-decoration-clone` (layout unchanged, fill no longer hugs the glyphs); `arrowPadding` 8 and alignment shift wins over arrow centring; max width is `min(20rem, 100vw - 1rem)`.
 */
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
        arrowPadding={8}
        collisionAvoidance={{ side: "flip", align: "shift", fallbackAxisSide: "none" }}
        className="z-(--yorha-z-popover)"
      >
        <PreviewCardPrimitive.Popup data-slot="preview-card-content" className={cnState(previewCardStyles.popup, className)} {...props}>
          {arrow && <PreviewCardPrimitive.Arrow data-slot="preview-card-arrow" aria-hidden="true" className={previewCardStyles.arrow}>
              <ArrowGlyphs />
            </PreviewCardPrimitive.Arrow>}
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
