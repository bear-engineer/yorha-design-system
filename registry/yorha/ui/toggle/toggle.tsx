import * as React from "react";
import { Toggle as BaseToggle } from "@base-ui/react/toggle";
import { cn, cnState } from "@/lib/utils";
import { controlSize, type ButtonSize } from "@/components/ui/button";

export interface ToggleProps extends Omit<React.ComponentProps<typeof BaseToggle>, "children"> {
  /** Visible label; the whole button is the click target. */
  children: React.ReactNode;
  /** Control scale step; matches a Button of the same size in a row. Default md. */
  size?: ButtonSize;
}

// Indicator: always mounted in a fixed cell; fades (and scales unless reduced/off) in place. Reduced keeps a short opacity fade.
const INDICATOR_BASE =
  "opacity-0 [scale:calc(1_-_(1_-_var(--motion-scale-pop))_*_var(--motion-spatial))] transition-[opacity,scale] [transition-duration:max(var(--motion-select),var(--motion-reduced-fade)),var(--motion-select)] ease-yorha";

/**
 * Two-state button (aria-pressed). Pressed fills with ink and the square bullet
 * turns solid; unpressed shows a hollow square, so state is not carried by colour alone.
 * Migration (B9): `size` (sm/md/lg) sets a fixed control height; the default height 48 is now `md`, pass `size="sm"`
 * for the old toolbar size. Chip is `h-control-sm`, Badge 24px, Kbd 20px.
 */
export function Toggle({ children, className, size = "md", ...props }: ToggleProps) {
  return (
    <BaseToggle
      className={cnState(
        cn(
          "group inline-flex items-center justify-center gap-2 align-middle whitespace-nowrap rounded-yorha border border-yorha-border bg-transparent",
          controlSize[size],
          "font-yorha text-yorha-fg cursor-pointer",
          // Standalone control: press scales (yorha-press), hover tints the idle fill; pressed is ink.
          "yorha-press enabled:not-data-[pressed]:hover:bg-yorha-hover",
          "data-[pressed]:border-yorha-ink data-[pressed]:bg-yorha-ink data-[pressed]:text-yorha-on-ink",
          "focus-visible:yorha-focus yorha-disabled",
        ),
        className,
      )}
      {...props}
    >
      <span aria-hidden="true" className="grid size-3 shrink-0 place-items-center border border-current">
        <span className={cn(INDICATOR_BASE, "size-1.5 bg-current group-data-[pressed]:scale-100 group-data-[pressed]:opacity-100")} />
      </span>
      {children}
    </BaseToggle>
  );
}
