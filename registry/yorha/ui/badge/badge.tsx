import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps {
  /** neutral: plain square label. alert: drab red-orange accent with a diamond marker (shape cue, not colour alone). */
  variant?: "neutral" | "alert";
  children: ReactNode;
  className?: string;
}

const VARIANT = {
  neutral: "border-yorha-border text-yorha-fg-soft",
  alert: "border-yorha-alert-ui text-yorha-alert",
} as const;

/** Status label. Static, so it is a span with no interactive role. */
export function Badge({ variant = "neutral", children, className }: BadgeProps) {
  return (
    <span
      data-variant={variant}
      data-shape={variant === "alert" ? "diamond" : undefined}
      className={cn(
        "inline-flex h-6 items-center gap-2 whitespace-nowrap rounded-yorha border bg-yorha-bg px-2 font-yorha font-yorha-medium text-yorha-xs uppercase tracking-yorha-wide",
        VARIANT[variant],
        className,
      )}
    >
      {variant === "alert" ? <span aria-hidden="true" className="inline-block size-1.5 rotate-45 bg-current" /> : null}
      {children}
    </span>
  );
}
