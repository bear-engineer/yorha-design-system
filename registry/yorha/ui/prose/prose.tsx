// RED stub: renders children unstyled so the play tests fail on assertions.
import type { HTMLAttributes, ReactNode } from "react";

export function Prose({ children, ...rest }: HTMLAttributes<HTMLDivElement> & { children?: ReactNode }) {
  return <div {...rest}>{children}</div>;
}

export function ProseTable({ caption, children, label }: { caption: ReactNode; children: ReactNode; label: string }) {
  return (
    <div>
      <table aria-label={label}>
        <caption>{caption}</caption>
        {children}
      </table>
    </div>
  );
}
