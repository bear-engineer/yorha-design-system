import { useId, useState, type ReactNode } from "react";
import { NavLink } from "@/components/nav-link";
import { Stack } from "@/components/stack";
import { Glyph } from "@/components/ui/glyph";
import { Heading, type HeadingLevel } from "@/components/ui/heading";
import { cn } from "@/lib/utils";

export interface SidebarItem {
  to: string;
  label: string;
  /** Match the route exactly (use for "/" so it is not current on every page). */
  end?: boolean;
}

export interface SidebarSection {
  id: string;
  title: string;
  items: SidebarItem[];
}

export interface SidebarProps {
  /** Accessible name of the nav landmark. */
  label?: string;
  sections: SidebarSection[];
  /** Level of the section headings. Default 2 (the page is expected to own h1). */
  headingLevel?: HeadingLevel;
  /** Adds a toggle that swaps the sidebar between a 256 px panel and a 64 px rail (instant swap, labels wiped; names stay available to assistive tech). */
  collapsible?: boolean;
  /** Initial state when `collapsible`. Default false (expanded). */
  defaultCollapsed?: boolean;
  /** Controlled state when `collapsible`. */
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Pinned strip above the scrolling list (product or unit mark). A function receives `collapsed`; a plain node is hidden in the rail. */
  header?: ReactNode | ((collapsed: boolean) => ReactNode);
  /** Pinned strip below the list (status, user). Same rules as `header`. */
  footer?: ReactNode | ((collapsed: boolean) => ReactNode);
  className?: string;
}

/**
 * Navigation landmark: one labelled list per section, rows are NavLink (aria-current=page on the active one).
 * Width contract (v4 craft): always a fixed column, 256 px (64 px rail when collapsed), never grows with its container; it stretches
 * to the container's height, the 1px right rule runs the full height, the list scrolls inside (cue lines) while header/footer stay pinned.
 * `collapsible` (v4): 64 px rail <-> 256 px panel; the toggle carries aria-expanded, the rail keeps each row's name.
 */
export function Sidebar({
  label = "주 메뉴",
  sections,
  headingLevel = 2,
  collapsible = false,
  defaultCollapsed = false,
  collapsed: collapsedProp,
  onCollapsedChange,
  header,
  footer,
  className,
}: SidebarProps) {
  const baseId = useId();
  const [inner, setInner] = useState(defaultCollapsed);
  const collapsed = collapsible && (collapsedProp ?? inner);
  const toggle = () => {
    const next = !collapsed;
    if (collapsedProp === undefined) setInner(next);
    onCollapsedChange?.(next);
  };
  const slot = (v: SidebarProps["header"]) => (typeof v === "function" ? v(collapsed) : collapsed ? null : v);
  const head = slot(header);
  const foot = slot(footer);
  return (
    <nav
      aria-label={label}
      data-collapsed={collapsible ? String(collapsed) : undefined}
      className={cn(
        "box-border flex h-full min-h-0 max-w-full shrink-0 grow-0 flex-col self-stretch bg-yorha-panel text-yorha-fg border-r border-yorha-border",
        collapsed ? "w-16" : "w-64",
        className,
      )}
    >
      {(head || collapsible) && (
        <div data-slot="sidebar-header" className={cn("flex min-h-12 shrink-0 items-center gap-2 border-b border-yorha-border p-2", collapsed && "justify-center")}>
          {head && <div className="min-w-0 flex-1">{head}</div>}
          {collapsible && (
            <button
              type="button"
              aria-expanded={!collapsed}
              aria-controls={`${baseId}-body`}
              aria-label={collapsed ? "메뉴 펼치기" : "메뉴 접기"}
              onClick={toggle}
              className="inline-flex size-6 min-h-6 min-w-6 shrink-0 items-center justify-center text-yorha-fg yorha-tint focus-visible:yorha-focus"
            >
              <Glyph name="triangle-left" className={cn(collapsed && "rotate-180")} />
            </button>
          )}
        </div>
      )}
      <div data-slot="sidebar-body" className="min-h-0 flex-1 yorha-scroll yorha-scroll-cue-y [--yorha-scroll-ground:var(--yorha-panel)]">
        <Stack id={`${baseId}-body`} gap={6} className={cn("p-4", collapsed && "px-2")}>
          {sections.map((section) => {
            const headingId = `${baseId}-${section.id}`;
            return (
              <Stack key={section.id} gap={2}>
                <div className="flex items-center gap-2">
                  <Heading id={headingId} level={headingLevel} className={cn("min-w-0 text-yorha-xs", collapsed && "sr-only")}>
                    {section.title}
                  </Heading>
                  <span data-slot="sidebar-rule" aria-hidden="true" className="h-px min-w-2 flex-1 bg-yorha-separator" />
                </div>
                <Stack as="ul" gap={1} aria-labelledby={headingId} className="m-0 list-none p-0">
                  {section.items.map((item) => (
                    <li key={item.to}>
                      <NavLink to={item.to} end={item.end} title={collapsed ? item.label : undefined} className={cn(collapsed && "justify-center gap-0 px-0")}>
                        <span className={cn("min-w-0 truncate", collapsed && "sr-only")}>{item.label}</span>
                      </NavLink>
                    </li>
                  ))}
                </Stack>
              </Stack>
            );
          })}
        </Stack>
      </div>
      {foot && (
        <div data-slot="sidebar-footer" className="shrink-0 border-t border-yorha-border p-3">
          {foot}
        </div>
      )}
    </nav>
  );
}
