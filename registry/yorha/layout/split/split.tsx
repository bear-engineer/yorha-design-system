import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export interface SplitProps {
  /** List pane. First in DOM and reading order. */
  list: ReactNode;
  /** Detail pane. Second in DOM and reading order. */
  detail: ReactNode;
  /** Container width at which the panes go side by side; below it they stack. Default md (28rem). */
  breakpoint?: "sm" | "md" | "lg";
  className?: string;
}

// Full class names so Tailwind generates them. Each breakpoint is a container query on the split frame.
const LAYOUT: Record<NonNullable<SplitProps["breakpoint"]>, { flow: string; list: string }> = {
  sm: { flow: "flex-col @sm:flex-row", list: "@sm:w-[min(14rem,40%)] @sm:shrink-0" },
  md: { flow: "flex-col @md:flex-row", list: "@md:w-[min(16rem,40%)] @md:shrink-0" },
  lg: { flow: "flex-col @lg:flex-row", list: "@lg:w-[min(20rem,40%)] @lg:shrink-0" },
};

/**
 * Two-pane list/detail layout. Side by side in a wide container, stacked (list above detail) in a narrow one.
 * The DOM order is the reading order, so tab order matches the visual stack.
 */
export function Split({ list, detail, breakpoint = "md", className }: SplitProps) {
  const layout = LAYOUT[breakpoint];
  return (
    <div data-slot="split-frame" className={cn("@container w-full min-w-0", className)}>
      <div data-slot="split" className={cn("flex min-w-0 gap-4", layout.flow)}>
        <div data-slot="split-list" className={cn("w-full min-w-0", layout.list)}>
          {list}
        </div>
        <div data-slot="split-detail" className="min-w-0 flex-1">
          {detail}
        </div>
      </div>
    </div>
  );
}
