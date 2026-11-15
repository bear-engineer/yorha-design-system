import * as React from "react";
import { Radio as BaseRadio } from "@base-ui/react/radio";
import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group";
import { cn, cnState } from "@/lib/utils";
import { Glyph } from "@/components/ui/glyph";

export interface RadioGroupProps extends React.ComponentProps<typeof BaseRadioGroup> {
  /** Layout direction; arrow keys work in both directions regardless. */
  orientation?: "vertical" | "horizontal";
}

// 8 px disc glyph in a 12 px box (even offset inside the 20 px drawn box). Opacity fade only: no scale, no clip.
const DOT =
  "grid place-items-center opacity-0 transition-opacity [transition-duration:max(var(--motion-select),var(--motion-reduced-fade))] ease-yorha-out data-[checked]:opacity-100";

/** Group of mutually exclusive options. Arrow keys move the selection. */
export function RadioGroup({ className, orientation = "vertical", ...props }: RadioGroupProps) {
  return (
    <BaseRadioGroup
      aria-orientation={orientation}
      className={cnState(["flex gap-2 font-yorha text-yorha-base", orientation === "horizontal" ? "flex-row" : "flex-col"], className)}
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
 * The Base UI root is a 24px hit area holding the drawn 20px box (the focus ring is on that box, like Checkbox).
 * Migration (v4): the bullet is the 8 px `disc` dot glyph (was a CSS square); it fades in, no scale pop.
 * Migration (B25): the focus ring moved from the row to the 20px box; the indicator is 20px in every density (was 24 in
 * comfortable). No API change.
 */
export function Radio({ children, className, rowClassName, ...props }: RadioProps) {
  return (
    <label
      className={cn(
        "group/row relative flex cursor-pointer items-start gap-2 px-3 py-1 text-yorha-fg",
        "bg-[linear-gradient(var(--yorha-ink),var(--yorha-ink))] bg-no-repeat [background-size:0%_100%]",
        "yorha-wipe",
        "has-[[data-checked]]:text-yorha-on-ink has-[[data-checked]]:[background-size:100%_100%]",
        "has-[[data-disabled]]:cursor-not-allowed has-[[data-disabled]]:text-yorha-disabled has-[[data-disabled]]:has-[[data-checked]]:bg-[linear-gradient(var(--yorha-disabled),var(--yorha-disabled))] has-[[data-disabled]]:has-[[data-checked]]:text-yorha-bg",
        rowClassName,
      )}
    >
      <span className="grid h-[round(up,1lh,4px)] shrink-0 place-items-center">
        <BaseRadio.Root
          className={cnState(
            "group/box grid size-6 shrink-0 place-items-center rounded-yorha border-0 bg-transparent p-0 text-current outline-none data-[disabled]:cursor-not-allowed",
            className,
          )}
          {...props}
        >
          <span
            data-slot="radio-box"
            className={cn(
              "grid size-indicator place-items-center rounded-yorha border border-current bg-transparent",
              "transition-[background-color] duration-(--motion-select) ease-yorha",
              "group-focus-visible/box:yorha-focus",
              // Hover tint on an unselected row's box (the selected row is already ink); pointer-down tints at once.
              "not-group-data-[checked]/box:not-group-data-[disabled]/box:group-hover/row:bg-yorha-hover",
              "not-group-data-[checked]/box:not-group-data-[disabled]/box:group-active/row:bg-yorha-pressed group-active/row:duration-0",
              "group-data-[checked]/box:group-active/row:bg-[color-mix(in_srgb,var(--yorha-bg)_70%,var(--yorha-on-ink))]",
              "group-data-[disabled]/box:border-yorha-disabled",
            )}
          >
            <BaseRadio.Indicator keepMounted className={DOT}>
              <Glyph name="disc" />
            </BaseRadio.Indicator>
          </span>
        </BaseRadio.Root>
      </span>
      <span>{children}</span>
    </label>
  );
}
