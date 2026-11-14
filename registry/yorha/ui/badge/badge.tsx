import type { ReactNode } from "react";

export interface BadgeProps {
  variant?: "neutral" | "alert";
  children: ReactNode;
  className?: string;
}

// RED stub: compiles, renders the wrong thing (no variant cue).
export function Badge({ children }: BadgeProps) {
  return <span>{children}</span>;
}
