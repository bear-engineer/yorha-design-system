import type { ComponentProps } from "react";
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cnState } from "@/lib/utils";

/** Root: Base UI Tabs root (value, defaultValue, onValueChange). */
function Tabs({ className, ...props }: ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" className={className} {...props} />;
}

/**
 * System-menu tab strip: dark indicator slides under (transform only: translate + scaleX) the active tab (--motion-panel),
 * the active label inverts to on-ink. Indicator is rendered first so tabs paint above it.
 */
function TabsList({ className, children, activateOnFocus = true, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      activateOnFocus={activateOnFocus}
      className={cnState("relative flex items-stretch border-b border-yorha-ink", className)}
      {...props}
    >
      <TabsPrimitive.Indicator
        data-slot="tabs-indicator"
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-px origin-left bg-yorha-ink [translate:var(--active-tab-left)_0] [scale:calc(var(--active-tab-width)_/_1px)_1] transition-[translate,scale] duration-(--motion-tab-indicator) ease-yorha-emphasized"
      />
      {children}
    </TabsPrimitive.List>
  );
}

/** Uppercase, widely tracked tab label; selected tab inverts (data-active). */
function TabsTab({ className, ...props }: ComponentProps<typeof TabsPrimitive.Tab>) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-tab"
      className={cnState(
        [
          "relative z-10 flex-1 px-4 py-2 text-center",
          "font-yorha text-yorha-sm font-yorha-medium tracking-yorha-wide text-yorha-fg uppercase",
          "transition-[color,background-color,border-color] duration-(--motion-select) ease-yorha-out",
          "data-[active]:text-yorha-on-ink",
          "focus-visible:yorha-focus",
          "data-[disabled]:cursor-not-allowed data-[disabled]:text-yorha-fg-muted",
        ],
        className,
      )}
      {...props}
    />
  );
}

/** Tab body; labelled by its tab through Base UI's aria-labelledby. */
function TabsPanel({ className, ...props }: ComponentProps<typeof TabsPrimitive.Panel>) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-panel"
      className={cnState(
        [
          "pt-4 font-yorha text-yorha-sm tracking-yorha-body text-yorha-fg",
          // enter = opacity only over --motion-select; exit = 0 (the leaving panel is display:none at once: never stacked above the new one, so no row growth and no overlap)
          "transition-opacity duration-(--motion-select) ease-yorha-out",
          "data-[starting-style]:opacity-0 data-[ending-style]:hidden",
          "focus-visible:yorha-focus",
        ],
        className,
      )}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsPanel, TabsTab };
