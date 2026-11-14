// RED stub: compiles, renders the wrong thing so the play tests fail on assertions.
import type { HeadingLevel } from "@/components/ui/heading";

export interface SidebarItem {
  to: string;
  label: string;
  end?: boolean;
}

export interface SidebarSection {
  id: string;
  title: string;
  items: SidebarItem[];
}

export interface SidebarProps {
  label?: string;
  sections: SidebarSection[];
  headingLevel?: HeadingLevel;
  className?: string;
}

export function Sidebar({ sections }: SidebarProps) {
  return <div>{sections.map((s) => s.title).join(" ")}</div>;
}
