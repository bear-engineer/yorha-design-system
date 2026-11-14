import { cn } from "@/lib/utils";
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

export type StackGap = 0 | 1 | 2 | 3 | 4 | 6 | 8;

export interface StackOwnProps {
  direction?: "column" | "row";
  /** Multiples of the density-scaled spacing token (--spacing). */
  gap?: StackGap;
  align?: "start" | "center" | "end" | "stretch";
  children?: ReactNode;
  className?: string;
}

export type StackProps<T extends ElementType = "div"> = StackOwnProps & { as?: T } & Omit<
  ComponentPropsWithoutRef<T>,
  keyof StackOwnProps | "as"
>;

// Full class names so Tailwind generates them.
const GAP: Record<StackGap, string> = {
  0: "gap-0",
  1: "gap-1",
  2: "gap-2",
  3: "gap-3",
  4: "gap-4",
  6: "gap-6",
  8: "gap-8",
};

const ALIGN: Record<NonNullable<StackOwnProps["align"]>, string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
};

/** Flex column or row. Gap comes from spacing tokens, so it follows [data-density]. */
export function Stack<T extends ElementType = "div">({
  as,
  direction = "column",
  gap = 2,
  align = "stretch",
  className,
  children,
  ...rest
}: StackProps<T>) {
  const Tag = (as ?? "div") as ElementType;
  return (
    <Tag
      data-slot="stack"
      className={cn("flex min-w-0", direction === "row" ? "flex-row" : "flex-col", GAP[gap], ALIGN[align], className)}
      {...rest}
    >
      {children}
    </Tag>
  );
}
