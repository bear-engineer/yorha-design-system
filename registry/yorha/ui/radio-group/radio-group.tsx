import * as React from "react";
import { Radio as BaseRadio } from "@base-ui/react/radio";
import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group";
import { cn, cnState } from "@/lib/utils";

export interface RadioGroupProps extends React.ComponentProps<typeof BaseRadioGroup> {
  /** Layout direction; arrow keys work in both directions regardless. */
  orientation?: "vertical" | "horizontal";
}

const DOT =
  "size-2 rounded-yorha bg-current opacity-0 [scale:calc(1_-_(1_-_var(--motion-scale-pop))_*_var(--motion-spatial))] transition-[opacity,scale] [transition-duration:max(var(--motion-select),var(--motion-reduced-fade)),var(--motion-select)] ease-yorha data-[checked]:scale-100 data-[checked]:opacity-100";

/** Group of mutually exclusive options. Arrow keys move the selection. */
export function RadioGroup({ className, orientation = "vertical", ...props }: RadioGroupProps) {
  return (
    <BaseRadioGroup
      aria-orientation={orientation}
      className={cnState(["flex gap-1 font-yorha text-yorha-base", orientation === "horizontal" ? "flex-row" : "flex-col"], className)}
      {...props}
    />
  );
}

export interface RadioProps extends Omit<React.ComponentProps<typeof BaseRadio.Root>, "children"> {
  /** Visible label text; the whole row is the click target. */
  children: React.ReactNode;
  /** Class for the row (label) element. */
  rowClassName?: string;
}

/**
 * One option. The selected row wipes to the ink fill left to right; the square
 * bullet uses currentColor so it inverts with the row.
 */
export function Radio({ children, className, rowClassName, ...props }: RadioProps) {
  return (
    <label
      className={cn(
        "group/row relative flex cursor-pointer items-center gap-3 px-3 py-2 text-yorha-fg",
        "bg-[linear-gradient(var(--yorha-ink),var(--yorha-ink))] bg-no-repeat [background-size:0%_100%]",
        "transition-[background-size,color] duration-(--motion-select) ease-yorha",
        "has-[[data-checked]]:text-yorha-on-ink has-[[data-checked]]:[background-size:100%_100%]",
        "has-[:focus-visible]:yorha-focus has-[[data-disabled]]:cursor-not-allowed has-[[data-disabled]]:opacity-50",
        rowClassName,
      )}
    >
      <BaseRadio.Root
        className={cnState(
          cn(
          "grid size-5 min-h-[24px] min-w-[24px] shrink-0 place-items-center rounded-yorha border border-current bg-transparent",
          // M22: pointer-down tints the box at once (colour only, no size change).
          "transition-[background-color] duration-(--motion-select) ease-yorha group-active/row:bg-[color-mix(in_srgb,var(--yorha-ink)_25%,transparent)] data-[checked]:group-active/row:bg-[color-mix(in_srgb,var(--yorha-bg)_70%,var(--yorha-on-ink))] active:duration-(--motion-press)",
          ),
          className,
        )}
        {...props}
      >
        <BaseRadio.Indicator keepMounted className={DOT} />
      </BaseRadio.Root>
      <span>{children}</span>
    </label>
  );
}
