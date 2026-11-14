import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export interface SplitProps {
  /** List pane. First in DOM and reading order. */
  list: ReactNode;
  /** Detail pane. Second in DOM and reading order. */
  detail: ReactNode;
  /** Container width at which the panes go side by side; below it they stack. Default md (28rem). */
  breakpoint?: "sm" | "md" | "lg";
  /** 1px rule between the panes (left of the detail side by side, above it when stacked). Turn off when the detail is already framed. Default true. */
  divider?: boolean;
  className?: string;
}

// Full class names so Tailwind generates them. Each breakpoint is a container query on the split frame.
const LAYOUT: Record<NonNullable<SplitProps["breakpoint"]>, { flow: string; list: string; detail: string }> = {
  sm: { flow: "flex-col @sm:flex-row", list: "pb-4 @sm:w-[min(14rem,40%)] @sm:shrink-0 @sm:pb-0 @sm:pr-4", detail: "pt-4 @sm:pt-0 @sm:pl-4 @sm:border-t-0 @sm:border-l" },
  md: { flow: "flex-col @md:flex-row", list: "pb-4 @md:w-[min(16rem,40%)] @md:shrink-0 @md:pb-0 @md:pr-4", detail: "pt-4 @md:pt-0 @md:pl-4 @md:border-t-0 @md:border-l" },
  lg: { flow: "flex-col @lg:flex-row", list: "pb-4 @lg:w-[min(20rem,40%)] @lg:shrink-0 @lg:pb-0 @lg:pr-4", detail: "pt-4 @lg:pt-0 @lg:pl-4 @lg:border-t-0 @lg:border-l" },
};

/**
 * Two-pane list/detail layout. The panes are fixed: the split is not resizable (a drag handle is deferred). Side by side in a wide container, stacked (list above detail) in a narrow one.
 * The DOM order is the reading order, so tab order matches the visual stack.
 */
export function Split({ list, detail, breakpoint = "md", divider = true, className }: SplitProps) {
  const layout = LAYOUT[breakpoint];
  return (
    <div data-slot="split-frame" className={cn("@container w-full min-w-0", className)}>
      <div data-slot="split" className={cn("flex min-w-0", layout.flow)}>
        <div data-slot="split-list" className={cn("w-full min-w-0", layout.list)}>
          {list}
        </div>
        <div data-slot="split-detail" className={cn("min-w-0 flex-1", divider && ["border-t border-yorha-separator", layout.detail])}>
          {detail}
        </div>
      </div>
    </div>
  );
}
