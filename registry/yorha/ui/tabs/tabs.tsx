import type { ComponentProps } from "react";
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cnState } from "@/lib/utils";

/** Root: re-export of the Base UI Tabs root (value, defaultValue, onValueChange). */
const Tabs = TabsPrimitive.Root;

/**
 * System-menu tab strip: dark indicator slides under the active tab (--motion-panel),
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
        className="absolute inset-y-0 left-(--active-tab-left) w-(--active-tab-width) bg-yorha-ink transition-[left,width] duration-(--motion-panel) ease-yorha-out"
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
          "transition-colors duration-(--motion-select) ease-yorha-out",
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
          "transition-opacity duration-(--motion-panel) ease-yorha-out data-[starting-style]:opacity-0",
          "focus-visible:yorha-focus",
        ],
        className,
      )}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsPanel, TabsTab };
