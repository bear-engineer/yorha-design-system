import { useId, useState } from "react";
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
  className?: string;
}

/**
 * Navigation landmark: one labelled list per section, rows are NavLink (aria-current=page on the active one).
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
  return (
    <nav
      aria-label={label}
      data-collapsed={collapsible ? String(collapsed) : undefined}
      className={cn(
        "flex flex-col bg-yorha-panel text-yorha-fg border-r border-yorha-border",
        collapsible && (collapsed ? "w-16" : "w-64"),
        className,
      )}
    >
      {collapsible && (
        <button
          type="button"
          aria-expanded={!collapsed}
          aria-controls={`${baseId}-body`}
          aria-label={collapsed ? "메뉴 펼치기" : "메뉴 접기"}
          onClick={toggle}
          className="m-2 inline-flex size-6 min-h-6 min-w-6 shrink-0 items-center justify-center self-end text-yorha-fg yorha-tint focus-visible:yorha-focus"
        >
          <Glyph name="triangle-left" className={cn(collapsed && "rotate-180")} />
        </button>
      )}
      <Stack id={`${baseId}-body`} gap={6} className={cn("p-4", collapsed && "px-2")}>
        {sections.map((section) => {
          const headingId = `${baseId}-${section.id}`;
          return (
            <Stack key={section.id} gap={2}>
              <Heading id={headingId} level={headingLevel} className={cn("text-yorha-xs", collapsed && "sr-only")}>
                {section.title}
              </Heading>
              <Stack as="ul" gap={1} aria-labelledby={headingId} className="m-0 list-none p-0">
                {section.items.map((item) => (
                  <li key={item.to}>
                    <NavLink to={item.to} end={item.end} className={cn(collapsed && "justify-center gap-0 px-0")}>
                      <span className={cn(collapsed && "sr-only")}>{item.label}</span>
                    </NavLink>
                  </li>
                ))}
              </Stack>
            </Stack>
          );
        })}
      </Stack>
    </nav>
  );
}
