import type { ReactNode } from "react";

export interface SystemMenuItem {
  id: string;
  label: string;
  description?: ReactNode;
  disabled?: boolean;
  content: ReactNode;
}
export interface SystemMenuSection {
  id: string;
  label: string;
  items: SystemMenuItem[];
}
export interface SystemMenuLayoutProps {
  sections: SystemMenuSection[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (sectionId: string) => void;
  label?: string;
  className?: string;
}

// STUB (red step): compiles, renders the wrong thing.
export function SystemMenuLayout({ sections }: SystemMenuLayoutProps) {
  return <div>{sections.length}</div>;
}
