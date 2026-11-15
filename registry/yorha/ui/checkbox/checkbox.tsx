import * as React from "react";
import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { cn, cnState } from "@/lib/utils";
import { Glyph } from "@/components/ui/glyph";

export interface CheckboxProps extends Omit<React.ComponentProps<typeof BaseCheckbox.Root>, "children"> {
  /** Visible label; clicking it toggles the checkbox. */
  children: React.ReactNode;
  /** Class for the row (label) element. */
  rowClassName?: string;
}

// Indicator: a 12 px dot glyph, always mounted in the fixed box. Checking reveals it left to right by a smooth clip-path wipe plus an
// opacity fade (ease-yorha-out); unchecking fades out. --motion-spatial is 0 in reduced/off, which keeps the clip open,
// so reduced is a plain 120ms opacity fade and off is instant. No scale, no transform: the glyph never leaves its integer pixels.
const INDICATOR_BASE = [
  "col-start-1 row-start-1 opacity-0 [clip-path:inset(0_calc(100%_*_var(--motion-spatial))_0_0)]",
  "[transition-property:opacity,clip-path] [transition-duration:max(var(--motion-select-exit),var(--motion-reduced-fade)),var(--motion-select-exit)] ease-yorha-out",
].join(" ");
// Literal class strings: Tailwind cannot see a template-built class.
const ON_CHECKED =
  "group-data-[checked]/box:opacity-100 group-data-[checked]/box:[clip-path:inset(0_0_0_0)] group-data-[checked]/box:[transition-duration:max(var(--motion-select),var(--motion-reduced-fade)),var(--motion-select)]";
const ON_INDETERMINATE =
  "group-data-[indeterminate]/box:opacity-100 group-data-[indeterminate]/box:[clip-path:inset(0_0_0_0)] group-data-[indeterminate]/box:[transition-duration:max(var(--motion-select),var(--motion-reduced-fade)),var(--motion-select)]";

/**
 * Square checkbox. Checked shows a `check` dot glyph on ink; indeterminate a `minus` glyph (12 px, integer pixels).
 * Motion: checking reveals the glyph left to right with a smooth clip wipe and fade; unchecking fades out; reduced = opacity fade; off = instant.
 * Migration (v4): the icon scale/opacity pop is gone; the root carries `data-yorha-value` (CheckboxGroup range selection).
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
      <span className="grid h-[round(up,1lh,4px)] shrink-0 place-items-center">
        <BaseCheckbox.Root
          className={cnState(
            "group/box grid size-6 shrink-0 place-items-center rounded-yorha border-0 bg-transparent p-0 text-yorha-fg outline-none data-[disabled]:cursor-not-allowed data-[disabled]:text-yorha-disabled",
            className,
          )}
          data-yorha-value={props.value}
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
              <Glyph name="check" className={cn(INDICATOR_BASE, ON_CHECKED)} />
              <Glyph name="minus" className={cn(INDICATOR_BASE, ON_INDETERMINATE)} />
            </BaseCheckbox.Indicator>
          </span>
        </BaseCheckbox.Root>
      </span>
      <span>{children}</span>
    </label>
  );
}
