import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

export type StackGap = 0 | 1 | 2 | 3 | 4 | 6 | 8;

export interface StackOwnProps {
  direction?: "column" | "row";
  gap?: StackGap;
  align?: "start" | "center" | "end" | "stretch";
  children?: ReactNode;
}

export type StackProps<T extends ElementType = "div"> = StackOwnProps & { as?: T } & Omit<
  ComponentPropsWithoutRef<T>,
  keyof StackOwnProps | "as"
>;

/** RED stub: compiles, ignores direction, gap, align and `as`. */
export function Stack<T extends ElementType = "div">({ children }: StackProps<T>) {
  return <div data-slot="stack">{children}</div>;
}
