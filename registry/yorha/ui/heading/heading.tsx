import type { HTMLAttributes } from "react";

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  level?: HeadingLevel;
}

// RED stub: compiles, renders the wrong element and no heading semantics.
export function Heading({ children, ...rest }: HeadingProps) {
  return <p {...rest}>{children}</p>;
}
