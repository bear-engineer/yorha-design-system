// RED stub: compiles, deliberately wrong (no h1, no slots).
import type { ReactNode } from "react";

export interface PageHeaderProps {
  title: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  ornament?: boolean;
  className?: string;
}

export function PageHeader({ title }: PageHeaderProps) {
  return <div>{title}</div>;
}
