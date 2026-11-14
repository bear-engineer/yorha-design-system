import { cn } from "@/lib/utils";
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

export type GridGap = 0 | 1 | 2 | 3 | 4 | 6 | 8;

export interface GridOwnProps {
  /** Maximum column count; the rendered count follows the width of the grid's own container. */
  columns?: 1 | 2 | 3 | 4;
  gap?: GridGap;
  children?: ReactNode;
  className?: string;
}

export type GridProps<T extends ElementType = "div"> = GridOwnProps & { as?: T } & Omit<
  ComponentPropsWithoutRef<T>,
  keyof GridOwnProps | "as"
>;

// Full class names so Tailwind generates them. Breakpoints are container queries (@md = 28rem, @xl = 36rem, @3xl = 48rem).
const COLUMNS: Record<1 | 2 | 3 | 4, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 @md:grid-cols-2",
  3: "grid-cols-1 @md:grid-cols-2 @xl:grid-cols-3",
  4: "grid-cols-1 @md:grid-cols-2 @xl:grid-cols-3 @3xl:grid-cols-4",
};

const GAP: Record<GridGap, string> = {
  0: "gap-0",
  1: "gap-1",
  2: "gap-2",
  3: "gap-3",
  4: "gap-4",
  6: "gap-6",
  8: "gap-8",
};

/**
 * CSS grid whose column count follows its own container width.
 * The outer frame is the query container; the grid element is its child.
 */
export function Grid<T extends ElementType = "div">({
  as,
  columns = 3,
  gap = 2,
  className,
  children,
  ...rest
}: GridProps<T>) {
  const Tag = (as ?? "div") as ElementType;
  return (
    <div data-slot="grid-frame" className="@container w-full min-w-0">
      <Tag data-slot="grid" className={cn("grid", COLUMNS[columns], GAP[gap], className)} {...rest}>
        {children}
      </Tag>
    </div>
  );
}
