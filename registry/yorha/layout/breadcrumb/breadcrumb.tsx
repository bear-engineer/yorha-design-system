// RED stub: compiles, deliberately wrong (no nav, no aria-current, no separators).
import type { ReactNode } from "react";

export interface BreadcrumbItem {
  label: ReactNode;
  to?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  label?: string;
  className?: string;
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return <div>{items.map((item, i) => <span key={i}>{item.label} / </span>)}</div>;
}
