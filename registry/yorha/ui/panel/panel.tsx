import type { HTMLAttributes, ReactNode } from "react";

export type PanelOrnaments = "none" | "top" | "bottom" | "both";

export interface PanelProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  as?: "section" | "article" | "div";
  title?: ReactNode;
  titleLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  ornaments?: PanelOrnaments;
}

// RED stub: compiles, but ignores title, ornaments and landmark semantics.
export function Panel({ children, className }: PanelProps) {
  return <div className={className}>{children}</div>;
}
