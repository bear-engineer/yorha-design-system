import type { ComponentProps } from "react";
import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";
import { cnState } from "@/lib/utils";

/** Root: re-export-style wrapper around Base UI ScrollArea; sets the square YoRHa frame. */
function ScrollArea({ className, ...props }: ComponentProps<typeof ScrollAreaPrimitive.Root>) {
  return <ScrollAreaPrimitive.Root data-slot="scroll-area" className={cnState("relative min-h-0 min-w-0", className)} {...props} />;
}

/**
 * Scrollable region. Focusable (tabIndex 0) so keyboard users can scroll with the native arrow, page and
 * space keys; it needs an accessible name (aria-label) when it is a focusable region.
 */
function ScrollAreaViewport({ className, ...props }: ComponentProps<typeof ScrollAreaPrimitive.Viewport>) {
  return (
    <ScrollAreaPrimitive.Viewport
      data-slot="scroll-area-viewport"
      role="region"
      tabIndex={0}
      className={cnState("size-full outline-none focus-visible:yorha-focus", className)}
      {...props}
    />
  );
}

/** Content wrapper inside the viewport; Base UI measures it for overflow. */
function ScrollAreaContent({ className, ...props }: ComponentProps<typeof ScrollAreaPrimitive.Content>) {
  return <ScrollAreaPrimitive.Content data-slot="scroll-area-content" className={cnState("min-w-full", className)} {...props} />;
}

/** Thin track (8px) with a hairline border on its inner edge; orientation picks the axis. */
function ScrollAreaScrollbar({ className, ...props }: ComponentProps<typeof ScrollAreaPrimitive.Scrollbar>) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      data-slot="scroll-area-scrollbar"
      className={cnState(
        [
          "flex touch-none select-none bg-yorha-panel",
          "data-[orientation=vertical]:w-2 data-[orientation=vertical]:border-l data-[orientation=vertical]:border-yorha-border",
          "data-[orientation=horizontal]:h-2 data-[orientation=horizontal]:border-t data-[orientation=horizontal]:border-yorha-border",
        ],
        className,
      )}
      {...props}
    />
  );
}

/** Square thumb in the muted foreground colour; no rounding. */
function ScrollAreaThumb({ className, ...props }: ComponentProps<typeof ScrollAreaPrimitive.Thumb>) {
  return (
    <ScrollAreaPrimitive.Thumb data-slot="scroll-area-thumb" className={cnState("relative flex-1 bg-yorha-fg-muted", className)} {...props} />
  );
}

/** Square patch where the horizontal and vertical tracks meet. */
function ScrollAreaCorner({ className, ...props }: ComponentProps<typeof ScrollAreaPrimitive.Corner>) {
  return <ScrollAreaPrimitive.Corner data-slot="scroll-area-corner" className={cnState("bg-yorha-panel", className)} {...props} />;
}

export { ScrollArea, ScrollAreaContent, ScrollAreaCorner, ScrollAreaScrollbar, ScrollAreaThumb, ScrollAreaViewport };
