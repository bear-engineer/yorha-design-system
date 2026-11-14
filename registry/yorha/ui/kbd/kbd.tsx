import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export type KbdProps = ComponentProps<"kbd">;

export function Kbd({ className, ...props }: KbdProps) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center whitespace-nowrap border border-yorha-border border-b-2 bg-yorha-control",
        "rounded-yorha px-1.5 font-yorha-mono text-yorha-xs leading-[17px] text-yorha-on-control",
        className,
      )}
      {...props}
    />
  );
}
