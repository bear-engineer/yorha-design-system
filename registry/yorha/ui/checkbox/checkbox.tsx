import * as React from "react";
import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { cn, cnState } from "@/lib/utils";
import { CheckIcon, MinusIcon } from "@/components/ui/icons";

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
 * Structure: the Base UI root is a 24px hit area (SC 2.5.8) that holds the drawn 20px box, so the box never
 * changes size (the border stays ink when checked) and sits on the label's first line centre.
 */
export function Checkbox({ children, className, rowClassName, ...props }: CheckboxProps) {
  return (
    <label
      className={cn(
        "group/row inline-flex cursor-pointer items-start gap-2 align-middle font-yorha text-yorha-base text-yorha-fg",
        "has-[[data-disabled]]:cursor-not-allowed has-[[data-disabled]]:text-yorha-disabled",
        rowClassName,
      )}
    >
      <span className="grid h-[1lh] shrink-0 place-items-center">
        <BaseCheckbox.Root
          className={cnState(
            "group/box grid size-6 shrink-0 place-items-center rounded-yorha border-0 bg-transparent p-0 text-yorha-fg outline-none data-[disabled]:cursor-not-allowed data-[disabled]:text-yorha-disabled",
            className,
          )}
          {...props}
        >
          <span
            data-slot="checkbox-box"
            className={cn(
              "grid size-indicator place-items-center rounded-yorha border border-current bg-transparent",
              "transition-[color,background-color,border-color] duration-(--motion-select) ease-yorha",
              "group-data-[checked]/box:border-yorha-ink group-data-[checked]/box:bg-yorha-ink group-data-[checked]/box:text-yorha-on-ink",
              "group-data-[indeterminate]/box:border-yorha-ink group-data-[indeterminate]/box:bg-yorha-ink group-data-[indeterminate]/box:text-yorha-on-ink",
              "group-focus-visible/box:yorha-focus",
              // One hover recipe (background tint on the unchecked box, fine pointers only); pointer-down uses the pressed tint at once.
              "not-group-data-[checked]/box:not-group-data-[indeterminate]/box:not-group-data-[disabled]/box:group-hover/row:bg-yorha-hover",
              "not-group-data-[checked]/box:not-group-data-[indeterminate]/box:not-group-data-[disabled]/box:group-active/row:bg-yorha-pressed group-active/row:duration-0",
              "group-data-[checked]/box:group-active/row:bg-[color-mix(in_srgb,var(--yorha-ink)_80%,var(--yorha-bg))] group-data-[indeterminate]/box:group-active/row:bg-[color-mix(in_srgb,var(--yorha-ink)_80%,var(--yorha-bg))]",
              "group-data-[disabled]/box:border-yorha-disabled group-data-[disabled]/box:group-data-[checked]/box:bg-yorha-disabled group-data-[disabled]/box:group-data-[checked]/box:text-yorha-bg group-data-[disabled]/box:group-data-[indeterminate]/box:bg-yorha-disabled group-data-[disabled]/box:group-data-[indeterminate]/box:text-yorha-bg",
            )}
          >
            <BaseCheckbox.Indicator keepMounted className="grid place-items-center">
              <CheckIcon className={cn(INDICATOR_BASE, "group-data-[checked]/box:scale-100 group-data-[checked]/box:opacity-100")} />
              <MinusIcon className={cn(INDICATOR_BASE, "group-data-[indeterminate]/box:scale-100 group-data-[indeterminate]/box:opacity-100")} />
            </BaseCheckbox.Indicator>
          </span>
        </BaseCheckbox.Root>
      </span>
      <span>{children}</span>
    </label>
  );
}
