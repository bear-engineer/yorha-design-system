import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

export interface ContainerOwnProps {
  size?: "sm" | "md" | "lg" | "full";
  children?: ReactNode;
}

export type ContainerProps<T extends ElementType = "div"> = ContainerOwnProps & { as?: T } & Omit<
  ComponentPropsWithoutRef<T>,
  keyof ContainerOwnProps | "as"
>;

/** RED stub: compiles, ignores size, container-type and padding. */
export function Container<T extends ElementType = "div">({ children }: ContainerProps<T>) {
  return <div data-slot="container">{children}</div>;
}
