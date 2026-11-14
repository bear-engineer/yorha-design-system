import * as React from "react";
import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { cn, cnState } from "@/lib/utils";

export interface CheckboxProps extends Omit<React.ComponentProps<typeof BaseCheckbox.Root>, "children"> {
  /** Visible label; clicking it toggles the checkbox. */
  children: React.ReactNode;
  /** Class for the row (label) element. */
  rowClassName?: string;
}

// Indicator: always mounted in a fixed cell; fades (and scales unless reduced/off) in place. Reduced keeps a short opacity fade.
const INDICATOR_BASE =
  "col-start-1 row-start-1 opacity-0 [scale:calc(1_-_(1_-_var(--motion-scale-pop))_*_var(--motion-spatial))] transition-[opacity,scale] [transition-duration:max(var(--motion-select),var(--motion-reduced-fade)),var(--motion-select)] ease-yorha";

/**
 * Square checkbox. Checked shows a check mark on ink; indeterminate shows a bar on ink.
 * The three states differ by shape and fill, not colour alone.
 */
export function Checkbox({ children, className, rowClassName, ...props }: CheckboxProps) {
  return (
    <label
      className={cn(
        "inline-flex cursor-pointer items-center gap-3 align-middle font-yorha text-yorha-base text-yorha-fg",
        "has-[[data-disabled]]:cursor-not-allowed has-[[data-disabled]]:opacity-50",
        rowClassName,
      )}
    >
      <BaseCheckbox.Root
        className={cnState(
          cn(
            "group grid size-5 self-center min-h-[24px] min-w-[24px] shrink-0 place-items-center rounded-yorha border border-current bg-transparent text-yorha-fg",
            "transition-[color,background-color,border-color] duration-(--motion-select) ease-yorha",
            "data-[checked]:bg-yorha-ink data-[checked]:text-yorha-on-ink",
            "data-[indeterminate]:bg-yorha-ink data-[indeterminate]:text-yorha-on-ink",
            "focus-visible:yorha-focus",
          ),
          className,
        )}
        {...props}
      >
        <BaseCheckbox.Indicator keepMounted className="grid place-items-center">
          <svg
            aria-hidden="true"
            viewBox="0 0 12 12"
            className={cn(INDICATOR_BASE, "size-3 group-data-[checked]:scale-100 group-data-[checked]:opacity-100")}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M1.5 6.5 4.5 9.5 10.5 2.5" />
          </svg>
          <span aria-hidden="true" className={cn(INDICATOR_BASE, "h-0.5 w-2.5 bg-current group-data-[indeterminate]:scale-100 group-data-[indeterminate]:opacity-100")} />
        </BaseCheckbox.Indicator>
      </BaseCheckbox.Root>
      <span>{children}</span>
    </label>
  );
}
