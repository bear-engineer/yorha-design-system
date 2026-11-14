import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export type KbdProps = ComponentProps<"kbd">;

export function Kbd({ className, ...props }: KbdProps) {
  return (
    <kbd
      className={cn(
        "inline-flex min-w-6 items-center justify-center border border-yorha-border border-b-2 bg-yorha-control",
        "rounded-yorha px-1.5 font-yorha-mono text-yorha-xs text-yorha-on-control",
        className,
      )}
      {...props}
    />
  );
}
