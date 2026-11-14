import { cn } from "@/lib/utils";
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

export interface ContainerOwnProps {
  size?: "sm" | "md" | "lg" | "full";
  children?: ReactNode;
  className?: string;
}

export type ContainerProps<T extends ElementType = "div"> = ContainerOwnProps & { as?: T } & Omit<
  ComponentPropsWithoutRef<T>,
  keyof ContainerOwnProps | "as"
>;

// Max widths follow the Tailwind breakpoint scale: 40rem / 48rem / 64rem.
const SIZE: Record<NonNullable<ContainerOwnProps["size"]>, string> = {
  sm: "max-w-screen-sm",
  md: "max-w-screen-md",
  lg: "max-w-screen-lg",
  full: "max-w-none",
};

/** Centred max-width wrapper with inline padding. It is a size container, so children can use container queries. */
export function Container<T extends ElementType = "div">({
  as,
  size = "md",
  className,
  children,
  ...rest
}: ContainerProps<T>) {
  const Tag = (as ?? "div") as ElementType;
  return (
    <Tag data-slot="container" className={cn("@container mx-auto w-full min-w-0 px-4", SIZE[size], className)} {...rest}>
      {children}
    </Tag>
  );
}
