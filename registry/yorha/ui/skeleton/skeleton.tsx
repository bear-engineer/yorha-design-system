import type { ReactNode } from "react";

// RED stub: compiles, renders the wrong thing (no status role, no shimmer layer).
export function Skeleton({ className, children }: { className?: string; label?: string; children?: ReactNode }) {
  return <div className={className}>{children}</div>;
}
