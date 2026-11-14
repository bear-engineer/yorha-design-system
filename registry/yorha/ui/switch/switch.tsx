import * as React from "react";
import { Switch as BaseSwitch } from "@base-ui/react/switch";
import { cn, cnState } from "@/lib/utils";

export interface SwitchProps extends Omit<React.ComponentProps<typeof BaseSwitch.Root>, "children"> {
  /** Visible label; clicking it toggles the switch. */
  children: React.ReactNode;
  /** Class for the row (label) element. */
  rowClassName?: string;
}

/**
 * Square track with a square thumb. On fills the track with ink and the thumb slides
 * right, so the state reads from position and fill as well as colour.
 */
export function Switch({ children, className, rowClassName, ...props }: SwitchProps) {
  return (
    <label
      className={cn(
        "inline-flex cursor-pointer items-center gap-3 font-yorha text-yorha-base text-yorha-fg",
        "has-[[data-disabled]]:cursor-not-allowed has-[[data-disabled]]:opacity-50",
        rowClassName,
      )}
    >
      <BaseSwitch.Root
        className={cnState(
          cn(
            "relative inline-flex h-5 w-9 min-h-[24px] min-w-[24px] shrink-0 items-center rounded-yorha border border-current bg-transparent p-0.5",
            "text-yorha-fg transition-colors duration-(--motion-select) ease-yorha",
            "data-[checked]:bg-yorha-ink data-[checked]:text-yorha-on-ink",
            "focus-visible:yorha-focus",
          ),
          className,
        )}
        {...props}
      >
        <BaseSwitch.Thumb
          className={cn(
            "block size-3.5 rounded-yorha bg-current",
            "transition-transform duration-(--motion-select) ease-yorha",
            "data-[checked]:translate-x-4",
          )}
        />
      </BaseSwitch.Root>
      <span>{children}</span>
    </label>
  );
}
