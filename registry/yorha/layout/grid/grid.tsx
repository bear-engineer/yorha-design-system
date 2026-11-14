import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

export type GridGap = 0 | 1 | 2 | 3 | 4 | 6 | 8;

export interface GridOwnProps {
  /** Maximum column count; the real count follows the grid's container width. */
  columns?: 1 | 2 | 3 | 4;
  gap?: GridGap;
  children?: ReactNode;
}

export type GridProps<T extends ElementType = "div"> = GridOwnProps & { as?: T } & Omit<
  ComponentPropsWithoutRef<T>,
  keyof GridOwnProps | "as"
>;

/** RED stub: compiles, ignores columns, gap and `as`. */
export function Grid<T extends ElementType = "div">({ children }: GridProps<T>) {
  return (
    <div data-slot="grid-frame">
      <div data-slot="grid">{children}</div>
    </div>
  );
}
