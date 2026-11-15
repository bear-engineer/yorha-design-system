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
      className={cnState([
          "group/viewport size-full overscroll-contain scroll-p-[6px] outline-none focus-visible:yorha-focus-inset",
          // V4-181 edge cues: a rule appears on an edge only while there is more content past it. One axis uses the kit utility;
          // both axes need the 8-layer form (two utilities would override each other's background-image).
          "data-[has-overflow-y]:yorha-scroll-cue-y data-[has-overflow-x]:yorha-scroll-cue-x",
          "data-[has-overflow-x]:data-[has-overflow-y]:[--cue-g:linear-gradient(var(--yorha-scroll-ground,var(--yorha-bg)),var(--yorha-scroll-ground,var(--yorha-bg)))] data-[has-overflow-x]:data-[has-overflow-y]:[--cue-b:linear-gradient(var(--yorha-border),var(--yorha-border))]",
          "data-[has-overflow-x]:data-[has-overflow-y]:[background-image:var(--cue-g),var(--cue-g),var(--cue-g),var(--cue-g),var(--cue-b),var(--cue-b),var(--cue-b),var(--cue-b)]",
          "data-[has-overflow-x]:data-[has-overflow-y]:[background-position:left_center,right_center,center_top,center_bottom,left_center,right_center,center_top,center_bottom]",
          "data-[has-overflow-x]:data-[has-overflow-y]:[background-size:1px_100%,1px_100%,100%_1px,100%_1px,1px_100%,1px_100%,100%_1px,100%_1px]",
          "data-[has-overflow-x]:data-[has-overflow-y]:[background-attachment:local,local,local,local,scroll,scroll,scroll,scroll]",
        ], className)}
      {...props}
    />
  );
}

/** Content wrapper inside the viewport; Base UI measures it for overflow. */
function ScrollAreaContent({ className, ...props }: ComponentProps<typeof ScrollAreaPrimitive.Content>) {
  return <ScrollAreaPrimitive.Content data-slot="scroll-area-content" className={cnState("min-w-full group-data-[has-overflow-y]/viewport:pe-2.5 group-data-[has-overflow-x]/viewport:pb-2.5", className)} {...props} />;
}

/** Thin track (10px: 1px rule, 1px inset, 8px thumb lane) with a hairline on its inner edge; orientation picks the axis. */
function ScrollAreaScrollbar({ className, ...props }: ComponentProps<typeof ScrollAreaPrimitive.Scrollbar>) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      data-slot="scroll-area-scrollbar"
      className={cnState(
        [
          "group/bar flex touch-none select-none bg-yorha-panel p-px",
          "data-[orientation=vertical]:w-2.5 data-[orientation=vertical]:border-l data-[orientation=vertical]:border-yorha-border",
          "data-[orientation=horizontal]:h-2.5 data-[orientation=horizontal]:border-t data-[orientation=horizontal]:border-yorha-border",
        ],
        className,
      )}
      {...props}
    />
  );
}

/** Square thumb, muted at rest and full foreground while hovering or scrolling; Base UI sizes the scroll axis. */
function ScrollAreaThumb({ className, ...props }: ComponentProps<typeof ScrollAreaPrimitive.Thumb>) {
  return (
    <ScrollAreaPrimitive.Thumb
      data-slot="scroll-area-thumb"
      className={cnState(
        [
          "relative bg-yorha-fg-muted transition-colors duration-(--motion-select) ease-yorha-out group-data-[hovering]/bar:bg-yorha-fg group-data-[scrolling]/bar:bg-yorha-fg",
          "data-[orientation=vertical]:w-full data-[orientation=horizontal]:h-full",
        ],
        className,
      )}
      {...props}
    />
  );
}

/** Square patch where the horizontal and vertical tracks meet. */
function ScrollAreaCorner({ className, ...props }: ComponentProps<typeof ScrollAreaPrimitive.Corner>) {
  return <ScrollAreaPrimitive.Corner data-slot="scroll-area-corner" className={cnState("bg-yorha-panel", className)} {...props} />;
}

export { ScrollArea, ScrollAreaContent, ScrollAreaCorner, ScrollAreaScrollbar, ScrollAreaThumb, ScrollAreaViewport };
