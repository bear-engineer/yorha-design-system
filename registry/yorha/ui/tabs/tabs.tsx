import { useEffect, useRef, type ComponentProps } from "react";
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cnState } from "@/lib/utils";

/** Root: Base UI Tabs root (value, defaultValue, onValueChange). */
function Tabs({ className, ...props }: ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" className={className} {...props} />;
}

/**
 * System-menu tab strip: dark indicator slides under (transform only: translate + scaleX) the active tab (--motion-tab-indicator),
 * the active label inverts to on-ink. Indicator is rendered first so tabs paint above it.
 */
function TabsList({ className, children, activateOnFocus = true, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  const ref = useRef<HTMLDivElement | null>(null);
  // V4-180: keep the active tab inside the scrolling strip. Scrolls the list itself (never ancestors); smooth only under full motion.
  useEffect(() => {
    const list = ref.current;
    if (!list) return;
    const reveal = () => {
      const tab = list.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
      if (!tab || list.scrollWidth <= list.clientWidth) return;
      const lr = list.getBoundingClientRect();
      const tr = tab.getBoundingClientRect();
      const delta = tr.left < lr.left ? tr.left - lr.left : tr.right > lr.right ? tr.right - lr.right : 0;
      if (!delta) return;
      const full = document.documentElement.dataset.motion !== "off" && document.documentElement.dataset.motion !== "reduced";
      list.scrollTo({ left: list.scrollLeft + delta, behavior: full ? "smooth" : "instant" });
    };
    reveal();
    const mo = new MutationObserver(reveal);
    mo.observe(list, { attributes: true, attributeFilter: ["aria-selected"], subtree: true });
    return () => mo.disconnect();
  }, []);
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      activateOnFocus={activateOnFocus}
      ref={(node: HTMLDivElement | null) => {
        ref.current = node;
      }}
      className={cnState(
        "yorha-scroll-cue-x relative flex items-stretch overflow-x-auto overflow-y-hidden overscroll-x-contain border-b border-yorha-ink [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      {...props}
    >
      <TabsPrimitive.Indicator
        data-slot="tabs-indicator"
        aria-hidden="true"
        className="absolute top-0 bottom-0 left-0 w-px origin-left bg-yorha-ink [translate:var(--active-tab-left)_0] [scale:calc(var(--active-tab-width)_/_1px)_1] transition-[translate,scale] duration-(--motion-tab-indicator) ease-yorha-emphasized"
      />
      {children}
    </TabsPrimitive.List>
  );
}

/**
 * Uppercase, widely tracked tab label; selected tab inverts (data-active), inactive tabs tint on hover.
 * Migration (V4-180): the strip scrolls (overflow-x:auto, hidden scrollbar, yorha-scroll-cue-x) when tabs outgrow it, so tabs
 * keep their label width (min-w-max; equal shares while there is room) and keyboard focus is the inset kit ring (an outset ring
 * would be clipped by the scroller; supersedes C2-301). Set --yorha-scroll-ground when the strip sits on a non-page surface.
 */
function TabsTab({ className, ...props }: ComponentProps<typeof TabsPrimitive.Tab>) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-tab"
      className={cnState(
        [
          "relative z-10 flex h-control-sm min-w-max flex-1 cursor-pointer items-center justify-center px-pad-sm text-center",
          "font-yorha text-yorha-sm font-yorha-medium tracking-yorha-wide text-yorha-fg uppercase",
          // label colour travels with the indicator (same duration and easing), so the label never flips ahead of the bar
          "yorha-tint transition-[color] duration-(--motion-tab-indicator) ease-yorha-emphasized",
          "data-[active]:text-yorha-on-ink",
          "focus-visible:z-20 focus-visible:yorha-focus-inset",
          "yorha-disabled",
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
          "focus-visible:yorha-focus-inset",
        ],
        className,
      )}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsPanel, TabsTab };
