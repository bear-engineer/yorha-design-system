import { useId } from "react";
import { NavLink } from "@/components/nav-link";
import { Stack } from "@/components/stack";
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
  className?: string;
}

/** Navigation landmark: one labelled list per section, rows are NavLink (aria-current=page on the active one). */
export function Sidebar({ label = "주 메뉴", sections, headingLevel = 2, className }: SidebarProps) {
  const baseId = useId();
  return (
    <nav aria-label={label} className={cn("flex flex-col bg-yorha-panel text-yorha-fg border-r border-yorha-border", className)}>
      <Stack gap={6} className="p-4">
        {sections.map((section) => {
          const headingId = `${baseId}-${section.id}`;
          return (
            <Stack key={section.id} gap={2}>
              <Heading id={headingId} level={headingLevel} className="text-yorha-xs">
                {section.title}
              </Heading>
              <Stack as="ul" gap={1} aria-labelledby={headingId} className="m-0 list-none p-0">
                {section.items.map((item) => (
                  <li key={item.to}>
                    <NavLink to={item.to} end={item.end}>
                      {item.label}
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
