import type { ComponentProps } from "react";
import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible";
import { cnState } from "@/lib/utils";

/** Root: re-export of the Base UI Collapsible root (open, defaultOpen, onOpenChange, disabled). */
function Collapsible({ className, ...props }: ComponentProps<typeof CollapsiblePrimitive.Root>) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" className={cnState("font-yorha text-yorha-fg", className)} {...props} />;
}

/**
 * Toggle button. Hollow square bullet when closed, filled when open; open rows invert over a dark fill.
 * Hover tints a closed trigger, focus is an inset ring (the trigger shares its border with the panel).
 */
function CollapsibleTrigger({ className, children, ...props }: ComponentProps<typeof CollapsiblePrimitive.Trigger>) {
  return (
    <CollapsiblePrimitive.Trigger
      data-slot="collapsible-trigger"
      className={cnState(
        [
          "group/trigger yorha-tint flex min-h-row w-full cursor-pointer items-center gap-3 border border-yorha-border px-3 py-2 text-left",
          "font-yorha text-yorha-sm font-yorha-bold tracking-yorha-heading text-yorha-fg uppercase",
          "transition-colors duration-(--motion-select) ease-yorha-out",
          "data-[panel-open]:bg-yorha-ink data-[panel-open]:text-yorha-on-ink",
          "focus-visible:yorha-focus-inset",
          "yorha-disabled",
        ],
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        data-yorha-bullet=""
        className="inline-block size-bullet shrink-0 border border-current group-data-[panel-open]/trigger:bg-current"
      />
      <span className="flex-1">{children}</span>
    </CollapsiblePrimitive.Trigger>
  );
}

/** Panel body; height and opacity animate with yorha-collapse (--motion-collapse, reduced ≤120ms, off = 0). */
function CollapsiblePanel({ className, children, ...props }: ComponentProps<typeof CollapsiblePrimitive.Panel>) {
  return (
    <CollapsiblePrimitive.Panel
      data-slot="collapsible-panel"
      className={cnState("yorha-collapse font-yorha text-yorha-sm tracking-yorha-body text-yorha-fg", className)}
      {...props}
    >
      {/* joined to the trigger: side and bottom rules, text under the label (1 border + 12 + bullet 8 + gap 12 = 33; the panel's own border takes the first px) */}
      <div className="border-x border-b border-yorha-border py-3 pr-3 pl-8">{children}</div>
    </CollapsiblePrimitive.Panel>
  );
}

export { Collapsible, CollapsiblePanel, CollapsibleTrigger };
