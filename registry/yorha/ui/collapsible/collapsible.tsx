import type { ComponentProps } from "react";
import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible";
import { cnState } from "@/lib/utils";

/** Root: re-export of the Base UI Collapsible root (open, defaultOpen, onOpenChange, disabled). */
function Collapsible({ className, ...props }: ComponentProps<typeof CollapsiblePrimitive.Root>) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" className={cnState("font-yorha text-yorha-fg", className)} {...props} />;
}

/**
 * Toggle button. Hollow square bullet when closed, filled when open; open rows invert over a dark fill.
 * Pressing uses yorha-press, focus uses the shared focus ring.
 */
function CollapsibleTrigger({ className, children, ...props }: ComponentProps<typeof CollapsiblePrimitive.Trigger>) {
  return (
    <CollapsiblePrimitive.Trigger
      data-slot="collapsible-trigger"
      className={cnState(
        [
          "group/trigger yorha-press flex w-full items-center gap-3 border border-yorha-border px-3 py-2 text-left",
          "font-yorha text-yorha-sm font-yorha-bold tracking-yorha-heading text-yorha-fg uppercase",
          "data-[panel-open]:bg-yorha-ink data-[panel-open]:text-yorha-on-ink",
          "focus-visible:yorha-focus",
          "data-[disabled]:cursor-not-allowed data-[disabled]:text-yorha-fg-muted",
        ],
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        data-yorha-bullet=""
        className="inline-block size-2 shrink-0 border border-current group-data-[panel-open]/trigger:bg-current"
      />
      <span className="flex-1">{children}</span>
    </CollapsiblePrimitive.Trigger>
  );
}

/** Panel body; height and opacity animate with yorha-collapse (--motion-collapse, reduced ≤120ms, off = 0). */
function CollapsiblePanel({ className, ...props }: ComponentProps<typeof CollapsiblePrimitive.Panel>) {
  return (
    <CollapsiblePrimitive.Panel
      data-slot="collapsible-panel"
      className={cnState("yorha-collapse px-7 font-yorha text-yorha-sm tracking-yorha-body text-yorha-fg", className)}
      {...props}
    />
  );
}

export { Collapsible, CollapsiblePanel, CollapsibleTrigger };
