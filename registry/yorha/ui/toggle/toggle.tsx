import * as React from "react";
import { Toggle as BaseToggle } from "@base-ui/react/toggle";
import { cn, cnState } from "@/lib/utils";

export interface ToggleProps extends Omit<React.ComponentProps<typeof BaseToggle>, "children"> {
  /** Visible label; the whole button is the click target. */
  children: React.ReactNode;
}

/**
 * Two-state button (aria-pressed). Pressed fills with ink and the square bullet
 * turns solid; unpressed shows a hollow square, so state is not carried by colour alone.
 */
export function Toggle({ children, className, ...props }: ToggleProps) {
  return (
    <BaseToggle
      className={cnState(
        cn(
          "group inline-flex items-center gap-3 rounded-yorha border border-yorha-border bg-transparent px-3 py-2",
          "font-yorha text-yorha-base text-yorha-fg cursor-pointer",
          "yorha-press",
          "data-[pressed]:bg-yorha-ink data-[pressed]:text-yorha-on-ink",
          "focus-visible:yorha-focus",
          "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
        ),
        className,
      )}
      {...props}
    >
      <span aria-hidden="true" className="grid size-3 shrink-0 place-items-center border border-current">
        <span className="hidden size-1.5 bg-current group-data-[pressed]:block" />
      </span>
      {children}
    </BaseToggle>
  );
}
