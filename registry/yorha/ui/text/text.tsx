// RED stub: renders a plain element so the play tests fail on assertions.
import type { HTMLAttributes } from "react";

export function Text({ children, ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return <span {...rest}>{children}</span>;
}
