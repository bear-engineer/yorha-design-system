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
 * The Base UI root is a 24px hit area holding the drawn 20px track (40 x 20, 12px thumb at a 3px inset), so the
 * track keeps its size when checked and sits on the label's first line centre.
 */
export function Switch({ children, className, rowClassName, ...props }: SwitchProps) {
  return (
    <label
      className={cn(
        "group/row inline-flex cursor-pointer items-start gap-2 align-middle font-yorha text-yorha-base text-yorha-fg",
        "has-[[data-disabled]]:cursor-not-allowed has-[[data-disabled]]:text-yorha-disabled",
        rowClassName,
      )}
    >
      <span className="grid h-[1lh] shrink-0 place-items-center">
        <BaseSwitch.Root
          className={cnState(
            "group/box relative grid h-6 w-10 shrink-0 place-items-center rounded-yorha border-0 bg-transparent p-0 text-yorha-fg outline-none data-[disabled]:cursor-not-allowed data-[disabled]:text-yorha-disabled",
            className,
          )}
          {...props}
        >
          <span
            data-slot="switch-track"
            className={cn(
              "flex h-indicator w-10 items-center rounded-yorha border border-current bg-transparent px-[2px]",
              "transition-[color,background-color,border-color] duration-(--motion-select) ease-yorha",
              "group-data-[checked]/box:border-yorha-ink group-data-[checked]/box:bg-yorha-ink group-data-[checked]/box:text-yorha-on-ink",
              "group-focus-visible/box:yorha-focus",
              "not-group-data-[checked]/box:not-group-data-[disabled]/box:group-hover/row:bg-yorha-hover",
              "not-group-data-[checked]/box:not-group-data-[disabled]/box:group-active/row:bg-yorha-pressed group-active/row:duration-0",
              "group-data-[checked]/box:group-active/row:bg-[color-mix(in_srgb,var(--yorha-ink)_80%,var(--yorha-bg))]",
              "group-data-[disabled]/box:border-yorha-disabled group-data-[disabled]/box:group-data-[checked]/box:bg-yorha-disabled group-data-[disabled]/box:group-data-[checked]/box:text-yorha-bg",
            )}
          >
            <BaseSwitch.Thumb
              data-slot="switch-thumb"
              className={cn(
                "block size-3 rounded-yorha bg-current",
                "transition-transform duration-(--motion-select) ease-yorha",
                "data-[checked]:translate-x-[22px]",
              )}
            />
          </span>
        </BaseSwitch.Root>
      </span>
      <span>{children}</span>
    </label>
  );
}
