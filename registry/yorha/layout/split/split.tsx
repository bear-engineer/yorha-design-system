import type { ReactNode } from "react";

export interface SplitProps {
  /** List pane (first in DOM and reading order). */
  list: ReactNode;
  /** Detail pane (second in DOM and reading order). */
  detail: ReactNode;
  /** Container width at which the panes go side by side; below it they stack. */
  breakpoint?: "sm" | "md" | "lg";
}

/** RED stub: compiles, never switches to a row layout. */
export function Split({ list, detail }: SplitProps) {
  return (
    <div data-slot="split-frame">
      <div data-slot="split">
        <div data-slot="split-list">{list}</div>
        <div data-slot="split-detail">{detail}</div>
      </div>
    </div>
  );
}
